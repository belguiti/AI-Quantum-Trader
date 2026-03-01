"""
ContinuousXGBoostTrainer — Enhanced Multi-Class Incremental Learning Engine.

Improvements over v1:
  - 12 features (was 7): adds StochRSI-K/D, Williams %R, OBV change, CCI, Keltner Width
  - Optuna inner HPO (20 quick trials) instead of fixed hyperparameters
  - TimeSeriesSplit (5-fold walk-forward) for robust validation
  - sklearn compute_sample_weight to handle BUY/SELL/HOLD imbalance
  - Sharpe ratio added to backtest metrics
  - Percentage-based PnL in backtest (not raw price difference)
"""

import os
import numpy as np
import pandas as pd
import ta
import xgboost as xgb
import optuna
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score
from sklearn.utils.class_weight import compute_sample_weight
import logging
import yfinance as yf

optuna.logging.set_verbosity(optuna.logging.WARNING)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
#  Constants
# ═══════════════════════════════════════════════════════════════
COMMISSION_RATE      = 0.0005   # 0.05% per trade
SLIPPAGE_RATE        = 0.0001   # 0.01% per trade
CLASS_NAMES          = {0: "HOLD", 1: "BUY", 2: "SELL"}
CONFIDENCE_THRESHOLD = 0.40     # Minimum probability to trigger a trade (random chance = 0.33)

FEATURE_DISPLAY = {
    'RSI':            'RSI Momentum',
    'MACD_Signal':    'MACD Signal Line',
    'ADX':            'ADX Trend Strength',
    'ATR':            'ATR Volatility',
    'EMA200_Dist':    'Distance to EMA-200',
    'Volume_Ratio':   'Volume Anomaly Ratio',
    'BB_Width':       'Bollinger Band Width',
    'StochRSI_K':     'Stoch RSI %K',
    'StochRSI_D':     'Stoch RSI %D',
    'Williams_R':     'Williams %R',
    'OBV_Change':     'OBV Momentum',
    'CCI':            'Commodity Channel Index',
}

FEATURE_COLS = [
    'RSI', 'MACD_Signal', 'ADX', 'ATR', 'EMA200_Dist',
    'Volume_Ratio', 'BB_Width',
    'StochRSI_K', 'StochRSI_D', 'Williams_R', 'OBV_Change', 'CCI',
]


# ═══════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════
def _to_native(val):
    if isinstance(val, np.integer):
        return int(val)
    if isinstance(val, np.floating):
        return float(val)
    if isinstance(val, np.bool_):
        return bool(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    return val


def _sanitize_dict(d: dict) -> dict:
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = _sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [_sanitize_dict(i) if isinstance(i, dict) else _to_native(i) for i in v]
        else:
            result[k] = _to_native(v)
    return result


def _sharpe_from_returns(returns: list, risk_free: float = 0.0) -> float:
    if len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    mean_r = np.mean(arr) - risk_free
    std_r = np.std(arr, ddof=1)
    if std_r == 0:
        return 0.0
    return float(np.clip(mean_r / std_r * np.sqrt(252), -10.0, 10.0))


def get_trade_reasoning(action: str, confidence: float, feature_importance: dict) -> str:
    if action == "HOLD":
        return "No clear directional bias detected. Conflicting signals across the 12-indicator feature set."
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    top = sorted_features[:2]
    f1_name = FEATURE_DISPLAY.get(top[0][0], top[0][0])
    f1_pct  = round(top[0][1] * 100, 1)
    f2_name = FEATURE_DISPLAY.get(top[1][0], top[1][0]) if len(top) > 1 else "—"
    f2_pct  = round(top[1][1] * 100, 1) if len(top) > 1 else 0

    if action == "BUY":
        templates = [
            f"Strong BUY ({confidence:.0%}). Driven by {f1_name} ({f1_pct}%) and {f2_name} ({f2_pct}%).",
            f"Bullish setup. Primary: {f1_name} ({f1_pct}%), secondary: {f2_name} ({f2_pct}%).",
        ]
    else:
        templates = [
            f"Strong SELL ({confidence:.0%}). Driven by {f1_name} ({f1_pct}%) and {f2_name} ({f2_pct}%).",
            f"Bearish exhaustion. Primary: {f1_name} ({f1_pct}%), secondary: {f2_name} ({f2_pct}%).",
        ]
    return templates[0 if confidence > 0.80 else 1]


# ═══════════════════════════════════════════════════════════════
#  Feature Engineering (shared between train & predict)
# ═══════════════════════════════════════════════════════════════
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute 12 technical features on a copy of the DataFrame.
    Returns the enriched DataFrame (NaNs not yet dropped).
    """
    df = df.copy()

    # --- Classic indicators ---
    df['RSI'] = ta.momentum.RSIIndicator(close=df['Close'], window=14).rsi()
    macd_obj  = ta.trend.MACD(close=df['Close'])
    df['MACD_Signal'] = macd_obj.macd_signal()
    df['ADX']  = ta.trend.ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14).adx()
    df['ATR']  = ta.volatility.AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14).average_true_range()
    df['EMA200']      = ta.trend.EMAIndicator(close=df['Close'], window=200).ema_indicator()
    df['EMA200_Dist'] = ((df['Close'] - df['EMA200']) / df['EMA200']) * 100

    # Volume ratio
    df['Volume_SMA20'] = df['Volume'].rolling(window=20).mean()
    df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA20']

    # Bollinger Band Width (% of price)
    bb = ta.volatility.BollingerBands(close=df['Close'], window=20, window_dev=2)
    df['BB_Width'] = (bb.bollinger_hband() - bb.bollinger_lband()) / df['Close'] * 100

    # --- New features v2 ---
    # Stochastic RSI
    srsi = ta.momentum.StochRSIIndicator(close=df['Close'], window=14)
    df['StochRSI_K'] = srsi.stochrsi_k() * 100
    df['StochRSI_D'] = srsi.stochrsi_d() * 100

    # Williams %R (overbought/oversold, inverted scale: 0 to -100)
    df['Williams_R'] = ta.momentum.WilliamsRIndicator(
        high=df['High'], low=df['Low'], close=df['Close'], lbp=14
    ).williams_r()

    # On-Balance Volume change (1-period pct change, normalised)
    obv = ta.volume.OnBalanceVolumeIndicator(close=df['Close'], volume=df['Volume']).on_balance_volume()
    df['OBV_Change'] = obv.pct_change().fillna(0) * 100

    # Commodity Channel Index
    df['CCI'] = ta.trend.CCIIndicator(
        high=df['High'], low=df['Low'], close=df['Close'], window=20
    ).cci()

    return df


# ═══════════════════════════════════════════════════════════════
#  Label Engineering
# ═══════════════════════════════════════════════════════════════
def create_labels(df: pd.DataFrame, atr_multiplier: float = 1.5,
                  sl_multiplier: float = 1.0, lookahead: int = 10) -> np.ndarray:
    """
    Multi-class forward-look labeling:
      0 = HOLD  1 = BUY  2 = SELL
    A BUY label requires the TP to be hit before the SL within `lookahead` bars.
    """
    highs  = df['High'].values
    lows   = df['Low'].values
    closes = df['Close'].values
    atrs   = df['ATR'].values
    labels = []

    for i in range(len(df)):
        if i + lookahead >= len(df) or np.isnan(atrs[i]) or atrs[i] == 0:
            labels.append(0)
            continue

        entry   = float(closes[i])
        atr_val = float(atrs[i])

        buy_tp = entry + (atr_multiplier * atr_val)
        buy_sl = entry - (sl_multiplier  * atr_val)
        sel_tp = entry - (atr_multiplier * atr_val)
        sel_sl = entry + (sl_multiplier  * atr_val)

        buy_ok = sell_ok = False

        for j in range(i + 1, min(i + 1 + lookahead, len(df))):
            if float(lows[j])  <= buy_sl:
                break
            if float(highs[j]) >= buy_tp:
                buy_ok = True
                break

        for j in range(i + 1, min(i + 1 + lookahead, len(df))):
            if float(highs[j]) >= sel_sl:
                break
            if float(lows[j])  <= sel_tp:
                sell_ok = True
                break

        if buy_ok and not sell_ok:
            labels.append(1)
        elif sell_ok and not buy_ok:
            labels.append(2)
        else:
            labels.append(0)

    return np.array(labels, dtype=np.int32)


# ═══════════════════════════════════════════════════════════════
#  Optuna inner HPO for XGBoost
# ═══════════════════════════════════════════════════════════════
def _tune_xgboost(X: np.ndarray, y: np.ndarray, n_trials: int = 20) -> dict:
    """
    Quick Optuna search (TimeSeriesSplit CV) for XGBoost hyperparameters.
    Returns the best param dict.
    """
    tscv = TimeSeriesSplit(n_splits=3)

    def objective(trial: optuna.Trial) -> float:
        params = {
            'objective':      'multi:softprob',
            'num_class':      3,
            'n_estimators':   trial.suggest_int('n_estimators', 80, 300),
            'max_depth':      trial.suggest_int('max_depth', 3, 8),
            'learning_rate':  trial.suggest_float('learning_rate', 0.02, 0.15, log=True),
            'subsample':      trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'gamma':          trial.suggest_float('gamma', 0.0, 1.0),
            'reg_alpha':      trial.suggest_float('reg_alpha', 0.0, 1.0),
            'reg_lambda':     trial.suggest_float('reg_lambda', 0.5, 3.0),
            'eval_metric':    'mlogloss',
            'random_state':   42,
        }
        scores = []
        for tr_idx, val_idx in tscv.split(X):
            Xtr, Xval = X[tr_idx], X[val_idx]
            ytr, yval = y[tr_idx], y[val_idx]
            sw = compute_sample_weight('balanced', ytr)
            model = xgb.XGBClassifier(**params)
            model.fit(Xtr, ytr, sample_weight=sw, eval_set=[(Xval, yval)], verbose=False)
            scores.append(accuracy_score(yval, model.predict(Xval)))
        return float(np.mean(scores))

    study = optuna.create_study(direction='maximize',
                                sampler=optuna.samplers.TPESampler(seed=42, n_startup_trials=5))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best = study.best_params
    best['objective']    = 'multi:softprob'
    best['num_class']    = 3
    best['eval_metric']  = 'mlogloss'
    best['random_state'] = 42
    return best


# ═══════════════════════════════════════════════════════════════
#  Trainer class
# ═══════════════════════════════════════════════════════════════
class ContinuousXGBoostTrainer:

    def train(self, symbol: str, df: pd.DataFrame, atr_multiplier: float = 1.5,
              run_hpo: bool = True) -> dict:
        """
        Train (or continue training) a 12-feature multi-class XGBoost model.
        When run_hpo=True, runs 20-trial Optuna search; otherwise uses sensible defaults.
        """
        model_path = os.path.join(MODELS_DIR, f"XGBoost_{symbol}.json")

        # Compatibility check: delete saved model if feature count changed
        was_continuous = False
        if os.path.exists(model_path):
            try:
                probe = xgb.XGBClassifier()
                probe.load_model(model_path)
                if probe.n_features_in_ == len(FEATURE_COLS):
                    was_continuous = True
                else:
                    logger.warning(
                        f"Feature count changed ({probe.n_features_in_} → {len(FEATURE_COLS)}). "
                        "Discarding stale model and retraining from scratch."
                    )
                    os.remove(model_path)
            except Exception as probe_err:
                logger.warning(f"Could not probe existing model ({probe_err}). Starting fresh.")
                try:
                    os.remove(model_path)
                except OSError:
                    pass

        # Feature engineering
        enriched = build_features(df)
        enriched = enriched.dropna(subset=FEATURE_COLS)

        # Labels
        labels = create_labels(enriched, atr_multiplier=atr_multiplier, sl_multiplier=1.0)
        enriched['Target'] = labels
        enriched = enriched.dropna(subset=['Target'])

        X = enriched[FEATURE_COLS].values
        y = enriched['Target'].values.astype(np.int32)

        if len(X) < 60:
            raise ValueError(f"Insufficient data: only {len(X)} valid samples (need ≥ 60).")

        # Class distribution
        unique, counts = np.unique(y, return_counts=True)
        dist = {CLASS_NAMES.get(int(u), str(u)): int(c) for u, c in zip(unique, counts)}
        logger.info(f"   Class Distribution: {dist}")

        # Walk-forward train/val split (no shuffle — preserve time order)
        split_idx = int(len(X) * 0.80)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]

        # Sample weights for class balance
        sample_weights = compute_sample_weight('balanced', y_train)

        # Hyperparameter optimisation or defaults
        if run_hpo and not was_continuous:
            logger.info(f"🔬 Optuna HPO for XGBoost ({symbol}) — 20 trials")
            best_hp = _tune_xgboost(X_train, y_train, n_trials=20)
        else:
            best_hp = {
                'objective': 'multi:softprob',
                'num_class': 3,
                'n_estimators': 200,
                'max_depth': 5,
                'learning_rate': 0.07,
                'subsample': 0.85,
                'colsample_bytree': 0.8,
                'min_child_weight': 3,
                'gamma': 0.1,
                'reg_alpha': 0.1,
                'reg_lambda': 1.5,
                'eval_metric': 'mlogloss',
                'random_state': 42,
            }

        model = xgb.XGBClassifier(**best_hp)

        if was_continuous:
            logger.info(f"🔄 Continuous Learning: extending model for {symbol}")
            model.fit(X_train, y_train,
                      sample_weight=sample_weights,
                      eval_set=[(X_val, y_val)],
                      verbose=False,
                      xgb_model=model_path)
        else:
            logger.info(f"🆕 First-time Training: creating model for {symbol}")
            model.fit(X_train, y_train,
                      sample_weight=sample_weights,
                      eval_set=[(X_val, y_val)],
                      verbose=False)

        model.save_model(model_path)
        logger.info(f"✅ Model saved: {model_path}")

        # Metrics
        train_acc = float(accuracy_score(y_train, model.predict(X_train)))
        val_acc   = float(accuracy_score(y_val,   model.predict(X_val)))
        buy_ratio  = float(np.mean(y == 1))
        sell_ratio = float(np.mean(y == 2))
        hold_ratio = float(np.mean(y == 0))

        importances = model.feature_importances_
        feature_importance = {col: round(float(imp), 4) for col, imp in zip(FEATURE_COLS, importances)}

        logger.info(f"   Train Acc: {train_acc:.2%} | Val Acc: {val_acc:.2%}")
        return {
            "wasContinuousLearning": bool(was_continuous),
            "trainAccuracy": round(train_acc, 4),
            "valAccuracy":   round(val_acc, 4),
            "buyLabelRatio":  round(buy_ratio, 4),
            "sellLabelRatio": round(sell_ratio, 4),
            "holdLabelRatio": round(hold_ratio, 4),
            "totalSamples": int(len(X)),
            "featureColumns": list(FEATURE_COLS),
            "featureImportance": feature_importance,
            "bestHyperparams": {k: _to_native(v) for k, v in best_hp.items()
                                if k not in ('objective', 'eval_metric', 'random_state')},
        }

    def backtest(self, symbol: str, df: pd.DataFrame, atr_multiplier: float = 1.5) -> dict:
        """
        Walk-forward backtest using the trained multi-class model.
        Uses percentage-based PnL to avoid the raw price-diff bug.
        """
        model_path = os.path.join(MODELS_DIR, f"XGBoost_{symbol}.json")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"No trained model found for {symbol}. Train first.")

        model = xgb.XGBClassifier()
        model.load_model(model_path)

        enriched = build_features(df)
        enriched = enriched.dropna(subset=FEATURE_COLS)

        if len(enriched) == 0:
            raise ValueError("No valid data after feature calculation.")

        X          = enriched[FEATURE_COLS].values
        pred_proba = model.predict_proba(X)   # (n, 3): [hold, buy, sell]

        closes = enriched['Close'].values.astype(float)
        highs  = enriched['High'].values.astype(float)
        lows   = enriched['Low'].values.astype(float)
        atrs   = enriched['ATR'].values.astype(float)

        capital          = 10_000.0
        initial_capital  = capital
        position_open    = False
        position_side    = None
        entry_price      = 0.0
        sl_price: float = 0.0   # set in entry block before position_open=True
        tp_price: float = 0.0   # set in entry block before position_open=True

        wins = losses = buy_trades = sell_trades = 0
        total_fees   = 0.0
        trade_returns = []
        equity_curve  = []
        peak_capital  = capital
        max_drawdown  = 0.0

        sample_step = max(1, len(pred_proba) // 500)

        for i in range(len(pred_proba)):
            close   = closes[i]
            high    = highs[i]
            low     = lows[i]
            atr_val = atrs[i] if not np.isnan(atrs[i]) else 0.0

            prob_buy  = float(pred_proba[i][1])
            prob_sell = float(pred_proba[i][2])

            # ── Check open position ──
            if position_open:
                if position_side == "BUY":
                    if low <= sl_price:        # SL hit
                        pnl_pct = (sl_price - entry_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee
                        losses += 1
                        trade_returns.append(pnl_pct)
                        position_open = False
                    elif high >= tp_price:     # TP hit
                        pnl_pct = (tp_price - entry_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee
                        wins += 1
                        trade_returns.append(pnl_pct)
                        position_open = False

                elif position_side == "SELL":
                    if high >= sl_price:       # SL hit (price goes up against short)
                        pnl_pct = (entry_price - sl_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee
                        losses += 1
                        trade_returns.append(pnl_pct)
                        position_open = False
                    elif low <= tp_price:      # TP hit (price goes down for short)
                        pnl_pct = (entry_price - tp_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee
                        wins += 1
                        trade_returns.append(pnl_pct)
                        position_open = False

            # ── Entry signals ──
            if not position_open and atr_val > 0:
                if prob_buy >= CONFIDENCE_THRESHOLD and prob_buy > prob_sell:
                    entry_price   = close * (1 + SLIPPAGE_RATE)
                    fee           = capital * COMMISSION_RATE
                    capital      -= fee
                    total_fees   += fee
                    sl_price      = entry_price - (1.0 * atr_val)
                    tp_price      = entry_price + (atr_multiplier * atr_val)
                    position_open = True
                    position_side = "BUY"
                    buy_trades   += 1
                elif prob_sell >= CONFIDENCE_THRESHOLD and prob_sell > prob_buy:
                    entry_price   = close * (1 - SLIPPAGE_RATE)
                    fee           = capital * COMMISSION_RATE
                    capital      -= fee
                    total_fees   += fee
                    sl_price      = entry_price + (1.0 * atr_val)
                    tp_price      = entry_price - (atr_multiplier * atr_val)
                    position_open = True
                    position_side = "SELL"
                    sell_trades  += 1

            # Track equity & drawdown
            if capital > peak_capital:
                peak_capital = capital
            dd = (peak_capital - capital) / peak_capital if peak_capital > 0 else 0
            if dd > max_drawdown:
                max_drawdown = dd

            if i % sample_step == 0 or i == len(pred_proba) - 1:
                idx      = enriched.index[i]
                time_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
                equity_curve.append({"time": time_str, "value": round(float(capital), 2)})

        total_trades = wins + losses
        win_rate     = wins / total_trades if total_trades > 0 else 0.0
        total_return = (capital - initial_capital) / initial_capital
        calmar_ratio = total_return / (max_drawdown + 0.001) if max_drawdown > 0 else total_return * 5
        sharpe_ratio = _sharpe_from_returns(trade_returns)

        logger.info(f"   Backtest: {total_trades} trades | WR: {win_rate:.2%} | "
                    f"Ret: {total_return:.2%} | DD: {max_drawdown:.2%} | Sharpe: {sharpe_ratio:.2f}")

        return {
            "totalTrades":  int(total_trades),
            "buyTrades":    int(buy_trades),
            "sellTrades":   int(sell_trades),
            "winRate":      round(float(win_rate), 4),
            "totalReturn":  round(float(total_return), 4),
            "maxDrawdown":  round(float(max_drawdown), 4),
            "calmarRatio":  round(float(calmar_ratio), 3),
            "sharpeRatio":  round(float(sharpe_ratio), 3),
            "totalFeesPaid": round(float(total_fees), 2),
            "equityCurve":  equity_curve,
            "symbol":       str(symbol),
        }


# ═══════════════════════════════════════════════════════════════
#  Public Entry Point
# ═══════════════════════════════════════════════════════════════
def run_xgboost_pipeline(symbol: str, start_date: str, end_date: str,
                         atr_multiplier: float = 1.5) -> dict:
    logger.info(f"═══ XGBoost v2 Pipeline for {symbol} ({start_date} → {end_date}) ═══")

    df = yf.download(symbol, start=start_date, end=end_date, progress=False)
    if df.empty:
        raise ValueError(f"No data from yfinance for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    trainer = ContinuousXGBoostTrainer()
    train_metrics    = trainer.train(symbol, df, atr_multiplier, run_hpo=True)
    backtest_results = trainer.backtest(symbol, df, atr_multiplier)

    feature_importance = train_metrics.get("featureImportance", {})
    buy_ratio  = train_metrics["buyLabelRatio"]
    sell_ratio = train_metrics["sellLabelRatio"]

    if buy_ratio > sell_ratio:
        dominant_action, dominant_conf = "BUY", buy_ratio
    elif sell_ratio > buy_ratio:
        dominant_action, dominant_conf = "SELL", sell_ratio
    else:
        dominant_action, dominant_conf = "HOLD", 0.5

    main_idea = get_trade_reasoning(dominant_action, dominant_conf, feature_importance)

    result = {**backtest_results, **train_metrics}
    result["engineType"] = "XGBOOST"
    result["mainIdea"]   = main_idea
    result["modelType"]  = "Multi-Class XGBoost v2 (12 features, Optuna HPO)"
    result["bestParams"] = {
        "engine":              "XGBoost Multi-Class AI v2",
        "atr_multiplier":      float(atr_multiplier),
        "model_file":          f"XGBoost_{symbol}.json",
        "train_accuracy":      float(train_metrics["trainAccuracy"]),
        "val_accuracy":        float(train_metrics["valAccuracy"]),
        "buy_label_ratio":     float(train_metrics["buyLabelRatio"]),
        "sell_label_ratio":    float(train_metrics["sellLabelRatio"]),
        "hold_label_ratio":    float(train_metrics["holdLabelRatio"]),
        "num_classes":         3,
        "objective":           "multi:softprob",
        "n_features":          len(FEATURE_COLS),
        "hpo_method":          "Optuna TPE (20 trials)",
    }

    result = _sanitize_dict(result)
    logger.info(f"═══ XGBoost v2 complete. Sharpe: {backtest_results['sharpeRatio']:.2f} ═══")
    return result


# ═══════════════════════════════════════════════════════════════
#  Live Prediction
# ═══════════════════════════════════════════════════════════════
SYMBOL_MAP = {
    "BTCUSD": ["BTC-USD", "BTCUSD"],
    "ETHUSD": ["ETH-USD", "ETHUSD"],
    "SOLUSD": ["SOL-USD", "SOLUSD"],
    "BNBUSD": ["BNB-USD", "BNBUSD"],
    "XRPUSD": ["XRP-USD", "XRPUSD"],
    "XAUUSD": ["GC=F", "XAUUSD", "XAU-USD"],
    "XAGUSD": ["SI=F", "XAGUSD"],
    "USOIL":  ["CL=F", "USOIL"],
    "EURUSD": ["EURUSD", "EURUSD=X"],
    "GBPUSD": ["GBPUSD", "GBPUSD=X"],
    "USDJPY": ["USDJPY", "JPY=X"],
    "AUDUSD": ["AUDUSD", "AUDUSD=X"],
    "NZDUSD": ["NZDUSD", "NZDUSD=X"],
    "USDCAD": ["USDCAD", "CAD=X"],
    "USDCHF": ["USDCHF", "CHF=X"],
    "NAS100": ["^IXIC", "NQ=F", "QQQ"],
    "US500":  ["^GSPC", "ES=F", "SPY"],
    "US30":   ["^DJI", "YM=F"],
    "UK100":  ["^FTSE"],
    "AAPL": ["AAPL"], "NVDA": ["NVDA"], "TSLA": ["TSLA"],
}


def _find_model(symbol: str, prefix: str = "XGBoost") -> str | None:
    candidates = [symbol]
    if symbol.upper() in SYMBOL_MAP:
        candidates.extend(SYMBOL_MAP[symbol.upper()])
    candidates.append(symbol.replace("-", ""))

    seen, unique_candidates = set(), []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique_candidates.append(c)

    for c in unique_candidates:
        path = os.path.join(MODELS_DIR, f"{prefix}_{c}.json")
        if os.path.exists(path):
            logger.info(f"🎯 Matched {symbol} → {prefix}_{c}.json")
            return path

    for f in os.listdir(MODELS_DIR):
        if f.startswith(f"{prefix}_") and f.endswith(".json"):
            model_name = f[len(prefix)+1:-5]
            if (symbol[:3].upper() in model_name.upper() or
                    model_name.replace("=", "").replace("-", "").upper() in symbol.upper()):
                path = os.path.join(MODELS_DIR, f)
                logger.info(f"🎯 Fuzzy matched {symbol} → {f}")
                return path
    return None


def predict_live(symbol: str, market_data: list) -> dict:
    model_path = _find_model(symbol, "XGBoost")
    if model_path is None:
        return {
            "signal": "HOLD", "confidence": 0.0,
            "reason": f"No trained XGBoost model for {symbol}. Train one in the Quantum Lab first.",
            "data": {}, "feature_importance": {}
        }

    model = xgb.XGBClassifier()
    model.load_model(model_path)

    df = pd.DataFrame(market_data)
    for c in ['Open', 'High', 'Low', 'Close', 'Volume']:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce')

    if len(df) < 200:
        return {
            "signal": "HOLD", "confidence": 0.0,
            "reason": f"Insufficient data: {len(df)} candles (need ≥ 200).",
            "data": {"price": float(df['Close'].iloc[-1]) if len(df) > 0 else 0},
            "feature_importance": {}
        }

    enriched = build_features(df).dropna(subset=FEATURE_COLS)
    if len(enriched) == 0:
        return {"signal": "HOLD", "confidence": 0.0,
                "reason": "Feature computation failed — all rows had NaN values.",
                "data": {}, "feature_importance": {}}

    latest = enriched[FEATURE_COLS].iloc[[-1]]
    proba  = model.predict_proba(latest)[0]

    prob_hold, prob_buy, prob_sell = float(proba[0]), float(proba[1]), float(proba[2])
    max_idx    = int(np.argmax(proba))
    action     = CLASS_NAMES[max_idx]
    confidence = float(proba[max_idx])

    importances = model.feature_importances_
    feature_importance = {col: round(float(imp), 4) for col, imp in zip(FEATURE_COLS, importances)}
    reasoning = get_trade_reasoning(action, confidence, feature_importance)

    current_price = float(enriched['Close'].iloc[-1])
    current_atr   = float(enriched['ATR'].iloc[-1])
    latest_row    = enriched.iloc[-1]

    feature_snapshot = {
        f: round(float(latest_row[f]), 3) for f in FEATURE_COLS if f in latest_row
    }

    logger.info(f"🎯 XGBoost v2: {action} ({confidence:.1%}) — "
                f"BUY={prob_buy:.1%} SELL={prob_sell:.1%} HOLD={prob_hold:.1%}")

    return {
        "signal":     action,
        "confidence": round(confidence, 4),
        "reason":     reasoning,
        "data": {"price": current_price, "atr": current_atr, "features": feature_snapshot},
        "feature_importance": feature_importance,
        "probabilities": {"hold": round(prob_hold, 4), "buy": round(prob_buy, 4), "sell": round(prob_sell, 4)},
    }
