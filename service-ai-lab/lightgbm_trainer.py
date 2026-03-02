"""
LightGBM Trainer — New ML Engine for AI Quantum Lab.

LightGBM advantages over XGBoost on financial time series:
  - Gradient-Based One-Side Sampling (GOSS): faster training with equal accuracy
  - Exclusive Feature Bundling (EFB): handles sparse features well
  - Leaf-wise tree growth vs level-wise: captures complex patterns with fewer trees
  - Better out-of-the-box performance on imbalanced datasets

Same 12-feature set as XGBoost v2 + Optuna HPO + TimeSeriesSplit + Sharpe ratio.
"""

import os
import numpy as np
import pandas as pd
import lightgbm as lgb
import optuna
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score
from sklearn.utils.class_weight import compute_sample_weight
import logging
import yfinance as yf

from xgboost_trainer import (
    build_features, create_labels, _to_native, _sanitize_dict,
    _sharpe_from_returns, get_trade_reasoning,
    FEATURE_COLS, CLASS_NAMES, SYMBOL_MAP,
    COMMISSION_RATE, SLIPPAGE_RATE, CONFIDENCE_THRESHOLD,
)

optuna.logging.set_verbosity(optuna.logging.WARNING)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════════════
#  Optuna inner HPO for LightGBM
# ═══════════════════════════════════════════════════════════════
def _tune_lightgbm(X: np.ndarray, y: np.ndarray, n_trials: int = 20) -> dict:
    """20-trial Optuna search with TimeSeriesSplit CV for LightGBM."""
    tscv = TimeSeriesSplit(n_splits=3)

    def objective(trial: optuna.Trial) -> float:
        params = {
            'objective':        'multiclass',
            'num_class':        3,
            'num_leaves':       trial.suggest_int('num_leaves', 15, 127),
            'max_depth':        trial.suggest_int('max_depth', 3, 10),
            'n_estimators':     trial.suggest_int('n_estimators', 80, 400),
            'learning_rate':    trial.suggest_float('learning_rate', 0.01, 0.15, log=True),
            'feature_fraction': trial.suggest_float('feature_fraction', 0.5, 1.0),
            'bagging_fraction': trial.suggest_float('bagging_fraction', 0.5, 1.0),
            'bagging_freq':     trial.suggest_int('bagging_freq', 1, 7),
            'min_child_samples': trial.suggest_int('min_child_samples', 5, 50),
            'reg_alpha':        trial.suggest_float('reg_alpha', 0.0, 1.0),
            'reg_lambda':       trial.suggest_float('reg_lambda', 0.0, 3.0),
            'verbosity':        -1,
            'random_state':     42,
            'metric':           'multi_logloss',
        }
        scores = []
        for tr_idx, val_idx in tscv.split(X):
            Xtr, Xval = X[tr_idx], X[val_idx]
            ytr, yval = y[tr_idx], y[val_idx]
            sw = compute_sample_weight('balanced', ytr)
            model = lgb.LGBMClassifier(**params)
            model.fit(Xtr, ytr, sample_weight=sw,
                      eval_set=[(Xval, yval)],
                      callbacks=[lgb.early_stopping(30, verbose=False), lgb.log_evaluation(-1)])
            scores.append(accuracy_score(yval, model.predict(Xval)))
        return float(np.mean(scores))

    study = optuna.create_study(direction='maximize',
                                sampler=optuna.samplers.TPESampler(seed=42, n_startup_trials=5))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    best = study.best_params
    best.update({
        'objective': 'multiclass',
        'num_class': 3,
        'verbosity': -1,
        'random_state': 42,
        'metric': 'multi_logloss',
    })
    return best


# ═══════════════════════════════════════════════════════════════
#  LightGBM Trainer
# ═══════════════════════════════════════════════════════════════
class LightGBMTrainer:

    def train(self, symbol: str, df: pd.DataFrame, atr_multiplier: float = 1.5,
              run_hpo: bool = True, start_date_filter: str = None) -> dict:
        """Train (or extend) a 12-feature LightGBM multi-class model."""
        model_path = os.path.join(MODELS_DIR, f"LightGBM_{symbol}.txt")
        was_continuous = os.path.exists(model_path)

        enriched = build_features(df)
        if start_date_filter:
            enriched = enriched[enriched.index >= start_date_filter]
        enriched = enriched.dropna(subset=FEATURE_COLS)
        labels   = create_labels(enriched, atr_multiplier=atr_multiplier)
        enriched['Target'] = labels
        enriched = enriched.dropna(subset=['Target'])

        X = enriched[FEATURE_COLS].values
        y = enriched['Target'].values.astype(np.int32)

        if len(X) < 60:
            raise ValueError(f"Insufficient data: {len(X)} samples (need ≥ 60).")

        unique, counts = np.unique(y, return_counts=True)
        dist = {CLASS_NAMES.get(int(u), str(u)): int(c) for u, c in zip(unique, counts)}
        logger.info(f"   Class Distribution: {dist}")

        split_idx = int(len(X) * 0.80)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        sample_weights = compute_sample_weight('balanced', y_train)

        if run_hpo and not was_continuous:
            logger.info(f"🔬 Optuna HPO for LightGBM ({symbol}) — 20 trials")
            best_hp = _tune_lightgbm(X_train, y_train, n_trials=20)
        else:
            best_hp = {
                'objective': 'multiclass', 'num_class': 3,
                'num_leaves': 63, 'max_depth': 6, 'n_estimators': 300,
                'learning_rate': 0.05, 'feature_fraction': 0.8,
                'bagging_fraction': 0.8, 'bagging_freq': 5,
                'min_child_samples': 20, 'reg_alpha': 0.1, 'reg_lambda': 1.0,
                'verbosity': -1, 'random_state': 42, 'metric': 'multi_logloss',
            }

        model = lgb.LGBMClassifier(**best_hp)

        if was_continuous:
            logger.info(f"🔄 Continuous Learning: extending LightGBM for {symbol}")
            # LightGBM supports warm-start via init_model
            init_model = lgb.Booster(model_file=model_path)
            model.fit(X_train, y_train, sample_weight=sample_weights,
                      eval_set=[(X_val, y_val)],
                      init_model=init_model,
                      callbacks=[lgb.early_stopping(30, verbose=False), lgb.log_evaluation(-1)])
        else:
            logger.info(f"🆕 First-time Training: creating LightGBM for {symbol}")
            model.fit(X_train, y_train, sample_weight=sample_weights,
                      eval_set=[(X_val, y_val)],
                      callbacks=[lgb.early_stopping(30, verbose=False), lgb.log_evaluation(-1)])

        # Save booster (not the sklearn wrapper) for warm-start compatibility
        model.booster_.save_model(model_path)
        logger.info(f"✅ LightGBM model saved: {model_path}")

        train_acc = float(accuracy_score(y_train, model.predict(X_train)))
        val_acc   = float(accuracy_score(y_val,   model.predict(X_val)))
        buy_ratio  = float(np.mean(y == 1))
        sell_ratio = float(np.mean(y == 2))
        hold_ratio = float(np.mean(y == 0))

        importances = model.feature_importances_ / (model.feature_importances_.sum() + 1e-9)
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
        }

    def backtest(self, symbol: str, df: pd.DataFrame, atr_multiplier: float = 1.5, start_date_filter: str = None) -> dict:
        """Load saved LightGBM booster and simulate percentage-based trading."""
        model_path = os.path.join(MODELS_DIR, f"LightGBM_{symbol}.txt")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"No LightGBM model for {symbol}. Train first.")

        booster    = lgb.Booster(model_file=model_path)
        enriched   = build_features(df)
        if start_date_filter:
            enriched = enriched[enriched.index >= start_date_filter]
        enriched = enriched.dropna(subset=FEATURE_COLS)
        if len(enriched) == 0:
            raise ValueError("No valid data after feature engineering.")

        X          = enriched[FEATURE_COLS].values
        # Booster.predict returns (n, num_class) probabilities
        pred_proba = booster.predict(X)

        closes = enriched['Close'].values.astype(float)
        highs  = enriched['High'].values.astype(float)
        lows   = enriched['Low'].values.astype(float)
        atrs   = enriched['ATR'].values.astype(float)

        capital         = 10_000.0
        initial_capital = capital
        position_open   = False
        position_side   = None
        entry_price     = 0.0
        sl_price: float = 0.0
        tp_price: float = 0.0

        wins = losses = buy_trades = sell_trades = 0
        total_fees    = 0.0
        trade_returns = []
        equity_curve  = []
        peak_capital  = capital
        max_drawdown  = 0.0
        sample_step   = max(1, len(pred_proba) // 500)

        for i in range(len(pred_proba)):
            close   = closes[i]
            high    = highs[i]
            low     = lows[i]
            atr_val = atrs[i] if not np.isnan(atrs[i]) else 0.0

            prob_buy  = float(pred_proba[i][1])
            prob_sell = float(pred_proba[i][2])

            if position_open:
                if position_side == "BUY":
                    if low <= sl_price:
                        pnl_pct = (sl_price - entry_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee; losses += 1
                        trade_returns.append(pnl_pct); position_open = False
                    elif high >= tp_price:
                        pnl_pct = (tp_price - entry_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee; wins += 1
                        trade_returns.append(pnl_pct); position_open = False
                elif position_side == "SELL":
                    if high >= sl_price:
                        pnl_pct = (entry_price - sl_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee; losses += 1
                        trade_returns.append(pnl_pct); position_open = False
                    elif low <= tp_price:
                        pnl_pct = (entry_price - tp_price) / entry_price
                        fee     = capital * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital = capital * (1 + pnl_pct) - fee
                        total_fees += fee; wins += 1
                        trade_returns.append(pnl_pct); position_open = False

            if not position_open and atr_val > 0:
                if prob_buy >= CONFIDENCE_THRESHOLD and prob_buy > prob_sell:
                    entry_price   = close * (1 + SLIPPAGE_RATE)
                    fee           = capital * COMMISSION_RATE
                    capital      -= fee; total_fees += fee
                    sl_price      = entry_price - (1.0 * atr_val)
                    tp_price      = entry_price + (atr_multiplier * atr_val)
                    position_open = True; position_side = "BUY"; buy_trades += 1
                elif prob_sell >= CONFIDENCE_THRESHOLD and prob_sell > prob_buy:
                    entry_price   = close * (1 - SLIPPAGE_RATE)
                    fee           = capital * COMMISSION_RATE
                    capital      -= fee; total_fees += fee
                    sl_price      = entry_price + (1.0 * atr_val)
                    tp_price      = entry_price - (atr_multiplier * atr_val)
                    position_open = True; position_side = "SELL"; sell_trades += 1

            if capital > peak_capital:
                peak_capital = capital
            dd = (peak_capital - capital) / peak_capital if peak_capital > 0 else 0
            if dd > max_drawdown:
                max_drawdown = dd

            if i % sample_step == 0 or i == len(pred_proba) - 1:
                idx = enriched.index[i]
                ts  = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
                equity_curve.append({"time": ts, "value": round(float(capital), 2)})

        total_trades = wins + losses
        win_rate     = wins / total_trades if total_trades > 0 else 0.0
        total_return = (capital - initial_capital) / initial_capital
        calmar_ratio = total_return / (max_drawdown + 0.001) if max_drawdown > 0 else total_return * 5
        sharpe_ratio = _sharpe_from_returns(trade_returns)

        logger.info(f"   LGBM Backtest: {total_trades} trades | WR: {win_rate:.2%} | "
                    f"Ret: {total_return:.2%} | Sharpe: {sharpe_ratio:.2f}")

        return {
            "totalTrades":   int(total_trades),
            "buyTrades":     int(buy_trades),
            "sellTrades":    int(sell_trades),
            "winRate":       round(float(win_rate), 4),
            "totalReturn":   round(float(total_return), 4),
            "maxDrawdown":   round(float(max_drawdown), 4),
            "calmarRatio":   round(float(calmar_ratio), 3),
            "sharpeRatio":   round(float(sharpe_ratio), 3),
            "totalFeesPaid": round(float(total_fees), 2),
            "equityCurve":   equity_curve,
            "symbol":        str(symbol),
        }


# ═══════════════════════════════════════════════════════════════
#  Public entry point
# ═══════════════════════════════════════════════════════════════
def run_lightgbm_pipeline(symbol: str, start_date: str, end_date: str,
                          atr_multiplier: float = 1.5) -> dict:
    logger.info(f"═══ LightGBM Pipeline for {symbol} ({start_date} → {end_date}) ═══")

    try:
        start_dt = pd.to_datetime(start_date)
        fetch_start = (start_dt - pd.Timedelta(days=365)).strftime('%Y-%m-%d')
    except Exception:
        fetch_start = start_date

    df = yf.download(symbol, start=fetch_start, end=end_date, progress=False)
    if df.empty:
        raise ValueError(f"No data from yfinance for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    trainer      = LightGBMTrainer()
    train_metrics    = trainer.train(symbol, df, atr_multiplier, run_hpo=True, start_date_filter=start_date)
    backtest_results = trainer.backtest(symbol, df, atr_multiplier, start_date_filter=start_date)

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
    result["engineType"] = "LIGHTGBM"
    result["mainIdea"]   = main_idea
    result["modelType"]  = "LightGBM (GOSS + EFB, 12 features, Optuna HPO)"
    result["bestParams"] = {
        "engine":           "LightGBM Multi-Class",
        "atr_multiplier":   float(atr_multiplier),
        "model_file":       f"LightGBM_{symbol}.txt",
        "train_accuracy":   float(train_metrics["trainAccuracy"]),
        "val_accuracy":     float(train_metrics["valAccuracy"]),
        "buy_label_ratio":  float(train_metrics["buyLabelRatio"]),
        "sell_label_ratio": float(train_metrics["sellLabelRatio"]),
        "hold_label_ratio": float(train_metrics["holdLabelRatio"]),
        "num_classes":      3,
        "objective":        "multiclass (GOSS)",
        "n_features":       len(FEATURE_COLS),
        "hpo_method":       "Optuna TPE (20 trials)",
    }

    result = _sanitize_dict(result)
    logger.info(f"═══ LightGBM complete. Sharpe: {backtest_results['sharpeRatio']:.2f} ═══")
    return result


# ═══════════════════════════════════════════════════════════════
#  Live prediction
# ═══════════════════════════════════════════════════════════════
def predict_live_lgbm(symbol: str, market_data: list) -> dict:
    """Real-time LightGBM prediction using the saved booster."""
    # Try exact match then mapped names
    candidates = [symbol]
    if symbol.upper() in SYMBOL_MAP:
        candidates.extend(SYMBOL_MAP[symbol.upper()])
    candidates.append(symbol.replace("-", ""))

    model_path = None
    for c in dict.fromkeys(candidates):   # preserve order, deduplicate
        path = os.path.join(MODELS_DIR, f"LightGBM_{c}.txt")
        if os.path.exists(path):
            model_path = path
            break

    if model_path is None:
        return {
            "signal": "HOLD", "confidence": 0.0,
            "reason": f"No trained LightGBM model for {symbol}. Train one in the Quantum Lab first.",
            "data": {}, "feature_importance": {}
        }

    booster = lgb.Booster(model_file=model_path)

    if booster.num_feature() != len(FEATURE_COLS):
        return {
            "signal": "HOLD", "confidence": 0.0,
            "reason": f"Model trained with {booster.num_feature()} features, but {len(FEATURE_COLS)} provided. Please retrain.",
            "data": {}, "feature_importance": {}
        }

    df = pd.DataFrame(market_data)
    for c in ['Open', 'High', 'Low', 'Close', 'Volume']:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce')

    if len(df) < 200:
        return {
            "signal": "HOLD", "confidence": 0.0,
            "reason": f"Insufficient data: {len(df)} candles (need ≥ 200).",
            "data": {}, "feature_importance": {}
        }

    enriched = build_features(df).dropna(subset=FEATURE_COLS)
    if len(enriched) == 0:
        return {"signal": "HOLD", "confidence": 0.0,
                "reason": "Feature computation failed.", "data": {}, "feature_importance": {}}

    latest = enriched[FEATURE_COLS].iloc[[-1]].values
    proba  = booster.predict(latest)[0]   # shape (3,)

    prob_hold, prob_buy, prob_sell = float(proba[0]), float(proba[1]), float(proba[2])
    max_idx    = int(np.argmax(proba))
    action     = CLASS_NAMES[max_idx]
    confidence = float(proba[max_idx])

    # Feature importance from booster
    raw_imp   = np.array(booster.feature_importance(importance_type='gain'), dtype=float)
    norm_imp  = raw_imp / (raw_imp.sum() + 1e-9)
    feature_importance = {col: round(float(imp), 4) for col, imp in zip(FEATURE_COLS, norm_imp)}

    reasoning = get_trade_reasoning(action, confidence, feature_importance)
    current_price = float(enriched['Close'].iloc[-1])
    current_atr   = float(enriched['ATR'].iloc[-1])
    latest_row    = enriched.iloc[-1]
    feature_snapshot = {f: round(float(latest_row[f]), 3) for f in FEATURE_COLS if f in latest_row}

    logger.info(f"🌿 LightGBM: {action} ({confidence:.1%}) — "
                f"BUY={prob_buy:.1%} SELL={prob_sell:.1%} HOLD={prob_hold:.1%}")

    return {
        "signal":     action,
        "confidence": round(confidence, 4),
        "reason":     reasoning,
        "data": {"price": current_price, "atr": current_atr, "features": feature_snapshot},
        "feature_importance": feature_importance,
        "probabilities": {"hold": round(prob_hold, 4), "buy": round(prob_buy, 4), "sell": round(prob_sell, 4)},
    }
