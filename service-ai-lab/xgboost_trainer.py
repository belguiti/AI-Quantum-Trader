"""
ContinuousXGBoostTrainer — Multi-Class Incremental Learning Engine for AI Quantum Lab.
Predicts BUY (1), SELL (2), and HOLD (0) with feature importance reasoning.
Each symbol gets its own persistent XGBoost model file.
"""

import os
import numpy as np
import pandas as pd
import ta
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import logging
import yfinance as yf

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
#  Constants
# ═══════════════════════════════════════════════════════════════
COMMISSION_RATE = 0.0005   # 0.05% per trade
SLIPPAGE_RATE   = 0.0001   # 0.01% per trade
CLASS_NAMES     = {0: "HOLD", 1: "BUY", 2: "SELL"}
CONFIDENCE_THRESHOLD = 0.55  # Minimum probability to trigger a trade (for backtesting)

# Feature display names for human-readable reasoning
FEATURE_DISPLAY = {
    'RSI': 'RSI Momentum',
    'MACD_Signal': 'MACD Signal Line',
    'ADX': 'ADX Trend Strength',
    'ATR': 'ATR Volatility',
    'EMA200_Dist': 'Distance to EMA-200',
    'Volume_Ratio': 'Volume Anomaly Ratio',
    'BB_Width': 'Bollinger Band Width'
}


def _to_native(val):
    """Convert numpy types to native Python types for JSON serialization."""
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, np.bool_):
        return bool(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    return val


def _sanitize_dict(d: dict) -> dict:
    """Recursively convert all numpy types in a dict to native Python types."""
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = _sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [_sanitize_dict(item) if isinstance(item, dict) else _to_native(item) for item in v]
        else:
            result[k] = _to_native(v)
    return result


# ═══════════════════════════════════════════════════════════════
#  Feature Importance Reasoning Engine
# ═══════════════════════════════════════════════════════════════
def get_trade_reasoning(action: str, confidence: float, feature_importance: dict) -> str:
    """
    Generate a human-readable explanation of why the model made this decision.
    Uses the top 2 features with highest importance weights.
    """
    if action == "HOLD":
        return "No clear directional bias detected. The model sees conflicting signals across indicators."

    # Sort features by importance (descending)
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    top_features = sorted_features[:2]

    # Build reasoning
    feature1_name = FEATURE_DISPLAY.get(top_features[0][0], top_features[0][0])
    feature1_pct = round(top_features[0][1] * 100, 1)
    feature2_name = FEATURE_DISPLAY.get(top_features[1][0], top_features[1][0])
    feature2_pct = round(top_features[1][1] * 100, 1)

    if action == "BUY":
        templates = [
            f"Strong BUY signal ({confidence:.0%} confidence). Primary drivers: {feature1_name} ({feature1_pct}% impact) and {feature2_name} ({feature2_pct}% impact).",
            f"Bullish setup detected. The trade is primarily driven by {feature1_name} ({feature1_pct}%) and {feature2_name} ({feature2_pct}%).",
        ]
    else:  # SELL
        templates = [
            f"Strong SELL signal ({confidence:.0%} confidence). Primary drivers: {feature1_name} ({feature1_pct}% impact) and {feature2_name} ({feature2_pct}% impact).",
            f"Bearish setup detected. Trend exhaustion driven by {feature1_name} ({feature1_pct}%) and {feature2_name} ({feature2_pct}%).",
        ]

    # Deterministic selection based on confidence to keep it consistent
    idx = 0 if confidence > 0.80 else 1
    return templates[min(idx, len(templates) - 1)]


class ContinuousXGBoostTrainer:
    """
    Manages per-symbol XGBoost models with multi-class incremental (continuous) learning.
    Classes: 0 = HOLD, 1 = BUY, 2 = SELL
    """

    # ───────────────────────────────────────────────────────
    #  1. Feature Engineering & Multi-Class Labeling
    # ───────────────────────────────────────────────────────
    @staticmethod
    def create_features_and_labels(df: pd.DataFrame, atr_multiplier: float = 1.5, sl_multiplier: float = 1.0, lookahead: int = 10):
        """
        Features (X):
            RSI(14), MACD Signal, ADX(14), ATR(14), Distance-to-EMA200 (%),
            Volume Ratio (vol / SMA20 vol), Bollinger Band Width.

        Multi-Class Labels (y):
            0 = HOLD/NOISE: Neither TP hit, or SL hit first on both sides.
            1 = BUY/LONG: High hits Close + (atr_multiplier * ATR) before Low hits Close - (sl_multiplier * ATR).
            2 = SELL/SHORT: Low hits Close - (atr_multiplier * ATR) before High hits Close + (sl_multiplier * ATR).
        """
        df = df.copy()

        # --- Feature Calculations ---
        df['RSI'] = ta.momentum.RSIIndicator(close=df['Close'], window=14).rsi()
        macd_obj = ta.trend.MACD(close=df['Close'])
        df['MACD_Signal'] = macd_obj.macd_signal()
        df['ADX'] = ta.trend.ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14).adx()
        df['ATR'] = ta.volatility.AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14).average_true_range()
        df['EMA200'] = ta.trend.EMAIndicator(close=df['Close'], window=200).ema_indicator()
        df['EMA200_Dist'] = ((df['Close'] - df['EMA200']) / df['EMA200']) * 100

        # Volume ratio
        df['Volume_SMA20'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA20']

        # Bollinger Band Width
        bb = ta.volatility.BollingerBands(close=df['Close'], window=20, window_dev=2)
        df['BB_Width'] = (bb.bollinger_hband() - bb.bollinger_lband()) / df['Close'] * 100

        # --- Multi-Class Forward-Look Labeling ---
        labels = []
        highs = df['High'].values
        lows = df['Low'].values
        closes = df['Close'].values
        atrs = df['ATR'].values

        for i in range(len(df)):
            if i + lookahead >= len(df) or np.isnan(atrs[i]) or atrs[i] == 0:
                labels.append(0)  # HOLD
                continue

            entry = float(closes[i])
            atr_val = float(atrs[i])

            # BUY scenario levels
            buy_tp = entry + (atr_multiplier * atr_val)
            buy_sl = entry - (sl_multiplier * atr_val)

            # SELL scenario levels
            sell_tp = entry - (atr_multiplier * atr_val)
            sell_sl = entry + (sl_multiplier * atr_val)

            buy_signal = False
            sell_signal = False

            # Check BUY: Does TP get hit before SL?
            for j in range(i + 1, min(i + 1 + lookahead, len(df))):
                if float(lows[j]) <= buy_sl:
                    break  # SL hit first → no BUY
                if float(highs[j]) >= buy_tp:
                    buy_signal = True
                    break

            # Check SELL: Does TP get hit before SL?
            for j in range(i + 1, min(i + 1 + lookahead, len(df))):
                if float(highs[j]) >= sell_sl:
                    break  # SL hit first → no SELL
                if float(lows[j]) <= sell_tp:
                    sell_signal = True
                    break

            if buy_signal and not sell_signal:
                labels.append(1)  # BUY
            elif sell_signal and not buy_signal:
                labels.append(2)  # SELL
            else:
                labels.append(0)  # HOLD (both or neither)

        df['Target'] = labels

        # Feature columns
        feature_cols = ['RSI', 'MACD_Signal', 'ADX', 'ATR', 'EMA200_Dist', 'Volume_Ratio', 'BB_Width']
        df = df.dropna(subset=feature_cols + ['Target'])

        X = df[feature_cols].values
        y = df['Target'].values

        return X, y, df, feature_cols

    # ───────────────────────────────────────────────────────
    #  2. Continuous Training (Multi-Class)
    # ───────────────────────────────────────────────────────
    def train(self, symbol: str, df: pd.DataFrame, atr_multiplier: float = 1.5):
        """
        Train (or continue training) a multi-class XGBoost model for the given symbol.
        Classes: 0=HOLD, 1=BUY, 2=SELL
        """
        model_path = os.path.join(MODELS_DIR, f"XGBoost_{symbol}.json")
        was_continuous = os.path.exists(model_path)

        X, y, processed_df, feature_cols = self.create_features_and_labels(df, atr_multiplier)

        if len(X) < 50:
            raise ValueError(f"Insufficient data for training: only {len(X)} valid samples (need ≥ 50).")

        # Class distribution
        unique, counts = np.unique(y, return_counts=True)
        dist = dict(zip([CLASS_NAMES.get(int(u), str(u)) for u in unique], [int(c) for c in counts]))
        logger.info(f"   Class Distribution: {dist}")

        # Split for validation
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, shuffle=False)

        # ── Core XGBoost Multi-Class Logic ──
        model = xgb.XGBClassifier(
            objective='multi:softprob',
            num_class=3,
            n_estimators=150,
            max_depth=6,
            learning_rate=0.08,
            eval_metric='mlogloss',
            random_state=42,
            colsample_bytree=0.8,
            subsample=0.8
        )

        if was_continuous:
            logger.info(f"🔄 Continuous Learning: Loading existing model for {symbol}")
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
                xgb_model=model_path
            )
        else:
            logger.info(f"🆕 First-time Training: Creating new multi-class model for {symbol}")
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False
            )

        # Save updated model
        model.save_model(model_path)
        logger.info(f"✅ Model saved: {model_path}")

        # ── Feature Importance ──
        importances = model.feature_importances_
        feature_importance = {}
        for col, imp in zip(feature_cols, importances):
            feature_importance[col] = round(float(imp), 4)
        logger.info(f"   Feature Importance: {feature_importance}")

        # ── Metrics ──
        y_pred_val = model.predict(X_val)
        val_acc = float(accuracy_score(y_val, y_pred_val))

        y_pred_train = model.predict(X_train)
        train_acc = float(accuracy_score(y_train, y_pred_train))

        buy_ratio = float(np.mean(y == 1))
        sell_ratio = float(np.mean(y == 2))
        hold_ratio = float(np.mean(y == 0))

        logger.info(f"   Train Acc: {train_acc:.2%} | Val Acc: {val_acc:.2%}")
        logger.info(f"   BUY: {buy_ratio:.1%} | SELL: {sell_ratio:.1%} | HOLD: {hold_ratio:.1%}")

        return {
            "wasContinuousLearning": bool(was_continuous),
            "trainAccuracy": round(train_acc, 4),
            "valAccuracy": round(val_acc, 4),
            "buyLabelRatio": round(buy_ratio, 4),
            "sellLabelRatio": round(sell_ratio, 4),
            "holdLabelRatio": round(hold_ratio, 4),
            "totalSamples": int(len(X)),
            "featureColumns": list(feature_cols),
            "featureImportance": feature_importance
        }

    # ───────────────────────────────────────────────────────
    #  3. Walk-Forward Backtest (Multi-Class)
    # ───────────────────────────────────────────────────────
    def backtest(self, symbol: str, df: pd.DataFrame, atr_multiplier: float = 1.5):
        """
        Loads the trained multi-class model and simulates BUY and SELL trades.
        """
        model_path = os.path.join(MODELS_DIR, f"XGBoost_{symbol}.json")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"No trained model found for {symbol}. Train first.")

        model = xgb.XGBClassifier()
        model.load_model(model_path)

        X, y_true, processed_df, feature_cols = self.create_features_and_labels(df, atr_multiplier)

        if len(X) == 0:
            raise ValueError("No valid data to backtest after feature calculation.")

        # Generate multi-class predictions
        pred_proba = model.predict_proba(X)  # Shape: (n_samples, 3) = [hold, buy, sell]

        # ── Simulate Trading ──
        capital = 10000.0
        initial_capital = capital
        position_open = False
        position_side = None  # "BUY" or "SELL"
        entry_price = 0.0
        sl_price = 0.0
        tp_price = 0.0

        wins = 0
        losses = 0
        buy_trades = 0
        sell_trades = 0
        total_fees = 0.0
        equity_curve = []
        peak_capital = capital
        max_drawdown = 0.0

        closes = processed_df['Close'].values
        highs = processed_df['High'].values
        lows = processed_df['Low'].values
        atrs = processed_df['ATR'].values

        # Sample equity curve to cap at ~500 points
        total_points = len(pred_proba)
        sample_step = max(1, total_points // 500)

        for i in range(len(pred_proba)):
            close = float(closes[i])
            high = float(highs[i])
            low = float(lows[i])
            atr_val = float(atrs[i]) if not np.isnan(atrs[i]) else 0.0

            prob_hold = float(pred_proba[i][0])
            prob_buy = float(pred_proba[i][1])
            prob_sell = float(pred_proba[i][2])

            # ── Check open position ──
            if position_open:
                if position_side == "BUY":
                    if low <= sl_price:  # SL hit
                        pnl = sl_price - entry_price
                        fee = abs(sl_price) * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital += pnl - fee
                        total_fees += fee
                        losses += 1
                        position_open = False
                    elif high >= tp_price:  # TP hit
                        pnl = tp_price - entry_price
                        fee = tp_price * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital += pnl - fee
                        total_fees += fee
                        wins += 1
                        position_open = False
                elif position_side == "SELL":
                    if high >= sl_price:  # SL hit (price goes UP against short)
                        pnl = entry_price - sl_price
                        fee = sl_price * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital += pnl - fee
                        total_fees += fee
                        losses += 1
                        position_open = False
                    elif low <= tp_price:  # TP hit (price goes DOWN for short profit)
                        pnl = entry_price - tp_price
                        fee = abs(tp_price) * (COMMISSION_RATE + SLIPPAGE_RATE)
                        capital += pnl - fee
                        total_fees += fee
                        wins += 1
                        position_open = False

            # ── Entry Signals ──
            if not position_open and atr_val > 0:
                if prob_buy >= CONFIDENCE_THRESHOLD:
                    # BUY entry
                    entry_price = close
                    fee = close * (COMMISSION_RATE + SLIPPAGE_RATE)
                    capital -= fee
                    total_fees += fee
                    sl_price = close - (1.0 * atr_val)
                    tp_price = close + (atr_multiplier * atr_val)
                    position_open = True
                    position_side = "BUY"
                    buy_trades += 1
                elif prob_sell >= CONFIDENCE_THRESHOLD:
                    # SELL (Short) entry
                    entry_price = close
                    fee = close * (COMMISSION_RATE + SLIPPAGE_RATE)
                    capital -= fee
                    total_fees += fee
                    sl_price = close + (1.0 * atr_val)
                    tp_price = close - (atr_multiplier * atr_val)
                    position_open = True
                    position_side = "SELL"
                    sell_trades += 1

            # Track equity
            if capital > peak_capital:
                peak_capital = capital
            dd = (peak_capital - capital) / peak_capital if peak_capital > 0 else 0
            if dd > max_drawdown:
                max_drawdown = dd

            # Record equity curve (sampled)
            if i % sample_step == 0 or i == len(pred_proba) - 1:
                idx = processed_df.index[i]
                time_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
                equity_curve.append({"time": time_str, "value": round(float(capital), 2)})

        # ── Final Metrics ──
        total_trades = wins + losses
        win_rate = wins / total_trades if total_trades > 0 else 0.0
        total_return = (capital - initial_capital) / initial_capital
        calmar_ratio = total_return / (max_drawdown + 0.001) if max_drawdown > 0 else total_return * 10

        logger.info(f"   Backtest: {total_trades} trades ({buy_trades} BUY, {sell_trades} SELL) | WR: {win_rate:.2%} | Return: {total_return:.2%} | DD: {max_drawdown:.2%}")

        return {
            "totalTrades": int(total_trades),
            "buyTrades": int(buy_trades),
            "sellTrades": int(sell_trades),
            "winRate": round(float(win_rate), 4),
            "totalReturn": round(float(total_return), 4),
            "maxDrawdown": round(float(max_drawdown), 4),
            "calmarRatio": round(float(calmar_ratio), 3),
            "totalFeesPaid": round(float(total_fees), 2),
            "equityCurve": equity_curve,
            "symbol": str(symbol)
        }


# ═══════════════════════════════════════════════════════════════
#  Public Entry Point — Called from main.py
# ═══════════════════════════════════════════════════════════════
def run_xgboost_pipeline(symbol: str, start_date: str, end_date: str, atr_multiplier: float = 1.5):
    """
    Full pipeline: Fetch data → Train (or continue training) → Backtest → Return results.
    """
    logger.info(f"═══ XGBoost Multi-Class Pipeline for {symbol} ({start_date} → {end_date}) ═══")

    # Fetch data
    df = yf.download(symbol, start=start_date, end=end_date, progress=False)
    if df.empty:
        raise ValueError(f"No data returned from yfinance for {symbol}")

    # Handle MultiIndex columns from yfinance
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    trainer = ContinuousXGBoostTrainer()

    # 1. Train (incremental if model exists)
    train_metrics = trainer.train(symbol, df, atr_multiplier)

    # 2. Backtest on the same data
    backtest_results = trainer.backtest(symbol, df, atr_multiplier)

    # 3. Generate reasoning from feature importance
    feature_importance = train_metrics.get("featureImportance", {})

    # Determine dominant prediction for reasoning
    buy_ratio = train_metrics["buyLabelRatio"]
    sell_ratio = train_metrics["sellLabelRatio"]
    if buy_ratio > sell_ratio:
        dominant_action = "BUY"
        dominant_confidence = buy_ratio
    elif sell_ratio > buy_ratio:
        dominant_action = "SELL"
        dominant_confidence = sell_ratio
    else:
        dominant_action = "HOLD"
        dominant_confidence = 0.5

    main_idea = get_trade_reasoning(dominant_action, dominant_confidence, feature_importance)

    # 4. Merge results
    result = {**backtest_results, **train_metrics}
    result["engineType"] = "XGBOOST"
    result["mainIdea"] = main_idea
    result["modelType"] = "Multi-Class (BUY/SELL/HOLD)"
    result["bestParams"] = {
        "engine": "XGBoost Multi-Class AI",
        "atr_multiplier": float(atr_multiplier),
        "model_file": f"XGBoost_{symbol}.json",
        "train_accuracy": float(train_metrics["trainAccuracy"]),
        "val_accuracy": float(train_metrics["valAccuracy"]),
        "buy_label_ratio": float(train_metrics["buyLabelRatio"]),
        "sell_label_ratio": float(train_metrics["sellLabelRatio"]),
        "hold_label_ratio": float(train_metrics["holdLabelRatio"]),
        "num_classes": 3,
        "objective": "multi:softprob"
    }

    # Final sanitization — guarantee no numpy types survive
    result = _sanitize_dict(result)

    logger.info(f"═══ Pipeline Complete. {len(result['equityCurve'])} equity points. Main Idea: {main_idea} ═══")
    return result


# ═══════════════════════════════════════════════════════════════
#  Live Prediction — Uses Trained XGBoost Model on Raw Candles
# ═══════════════════════════════════════════════════════════════
def predict_live(symbol: str, market_data: list) -> dict:
    """
    Real-time prediction using the trained XGBoost multi-class model.
    
    1. Loads the model from disk (XGBoost_{symbol}.json)
    2. Computes features from raw OHLCV candles
    3. Predicts BUY/SELL/HOLD with probabilities
    4. Generates feature importance reasoning
    
    Returns dict compatible with Spring Boot expectations:
        {signal, confidence, reason, data, feature_importance}
    """
    # 1. Find model file
    # Symbol mapping: MT5 tickers → Yahoo Finance tickers used during training
    SYMBOL_MAP = {
        # Crypto
        "BTCUSD": ["BTC-USD", "BTCUSD"],
        "ETHUSD": ["ETH-USD", "ETHUSD"],
        "SOLUSD": ["SOL-USD", "SOLUSD"],
        "BNBUSD": ["BNB-USD", "BNBUSD"],
        "XRPUSD": ["XRP-USD", "XRPUSD"],
        # Commodities
        "XAUUSD": ["GC=F", "XAUUSD", "XAU-USD"],
        "XAGUSD": ["SI=F", "XAGUSD", "XAG-USD"],
        "USOIL":  ["CL=F", "USOIL"],
        # Forex
        "EURUSD": ["EURUSD", "EUR-USD", "EURUSD=X"],
        "GBPUSD": ["GBPUSD", "GBP-USD", "GBPUSD=X"],
        "USDJPY": ["USDJPY", "USD-JPY", "JPY=X"],
        "AUDUSD": ["AUDUSD", "AUD-USD", "AUDUSD=X"],
        "NZDUSD": ["NZDUSD", "NZD-USD", "NZDUSD=X"],
        "USDCAD": ["USDCAD", "USD-CAD", "CAD=X"],
        "USDCHF": ["USDCHF", "USD-CHF", "CHF=X"],
        # Indices
        "NAS100": ["^IXIC", "NQ=F", "QQQ"],
        "US500":  ["^GSPC", "ES=F", "SPY"],
        "US30":   ["^DJI", "YM=F"],
        "UK100":  ["^FTSE", "UK100"],
        # Stocks
        "AAPL": ["AAPL"], "NVDA": ["NVDA"], "TSLA": ["TSLA"],
        "MSFT": ["MSFT"], "AMZN": ["AMZN"],
    }

    # Build candidate list: exact symbol, mapped names, common variations
    candidates = [symbol]
    if symbol.upper() in SYMBOL_MAP:
        candidates.extend(SYMBOL_MAP[symbol.upper()])
    # Also try generic variations
    candidates.append(symbol.replace("-", ""))
    if len(symbol) > 3:
        candidates.append(symbol[:3] + "-" + symbol[3:])
    # Deduplicate while preserving order
    seen = set()
    unique_candidates = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique_candidates.append(c)

    model_path = None
    for candidate in unique_candidates:
        path = os.path.join(MODELS_DIR, f"XGBoost_{candidate}.json")
        if os.path.exists(path):
            model_path = path
            logger.info(f"🎯 Matched symbol {symbol} → model file XGBoost_{candidate}.json")
            break

    # Last resort: scan all model files for a partial match
    if model_path is None:
        for f in os.listdir(MODELS_DIR):
            if f.startswith("XGBoost_") and f.endswith(".json"):
                model_name = f.replace("XGBoost_", "").replace(".json", "")
                # Check if the model name contains a recognizable part of the symbol
                if (symbol[:3].upper() in model_name.upper() or 
                    model_name.replace("=", "").replace("-", "").upper() in symbol.upper()):
                    model_path = os.path.join(MODELS_DIR, f)
                    logger.info(f"🎯 Fuzzy matched symbol {symbol} → model file {f}")
                    break

    if model_path is None:
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reason": f"No trained XGBoost model found for {symbol}. Train one in the Quantum Lab first.",
            "data": {},
            "feature_importance": {}
        }

    logger.info(f"🎯 Loading XGBoost model: {model_path}")

    # 2. Load model
    model = xgb.XGBClassifier()
    model.load_model(model_path)

    # 3. Build DataFrame from candle data
    df = pd.DataFrame(market_data)
    cols = ['Open', 'High', 'Low', 'Close', 'Volume']
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce')

    if len(df) < 200:
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reason": f"Insufficient data: {len(df)} candles (need 200+ for EMA-200).",
            "data": {"price": float(df['Close'].iloc[-1]) if len(df) > 0 else 0},
            "feature_importance": {}
        }

    # 4. Compute features (same as training)
    df['RSI'] = ta.momentum.RSIIndicator(close=df['Close'], window=14).rsi()
    macd_obj = ta.trend.MACD(close=df['Close'])
    df['MACD_Signal'] = macd_obj.macd_signal()
    df['ADX'] = ta.trend.ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14).adx()
    df['ATR'] = ta.volatility.AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14).average_true_range()
    df['EMA200'] = ta.trend.EMAIndicator(close=df['Close'], window=200).ema_indicator()
    df['EMA200_Dist'] = ((df['Close'] - df['EMA200']) / df['EMA200']) * 100

    # Volume ratio
    df['Volume_SMA20'] = df['Volume'].rolling(window=20).mean()
    df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA20']

    # Bollinger Band Width
    bb = ta.volatility.BollingerBands(close=df['Close'], window=20, window_dev=2)
    df['BB_Width'] = (bb.bollinger_hband() - bb.bollinger_lband()) / df['Close'] * 100

    feature_cols = ['RSI', 'MACD_Signal', 'ADX', 'ATR', 'EMA200_Dist', 'Volume_Ratio', 'BB_Width']
    df = df.dropna(subset=feature_cols)

    if len(df) == 0:
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reason": "Feature computation failed — all rows had NaN values.",
            "data": {},
            "feature_importance": {}
        }

    # 5. Predict on latest candle
    latest = df[feature_cols].iloc[[-1]]
    proba = model.predict_proba(latest)[0]  # [hold_prob, buy_prob, sell_prob]

    prob_hold = float(proba[0])
    prob_buy  = float(proba[1])
    prob_sell = float(proba[2])

    # Determine signal
    max_idx = int(np.argmax(proba))
    action = CLASS_NAMES[max_idx]
    confidence = float(proba[max_idx])

    # 6. Feature importance
    importances = model.feature_importances_
    feature_importance = {}
    for col, imp in zip(feature_cols, importances):
        feature_importance[col] = round(float(imp), 4)

    # 7. Generate reasoning
    reasoning = get_trade_reasoning(action, confidence, feature_importance)

    # Current price
    current_price = float(df['Close'].iloc[-1])
    current_atr = float(df['ATR'].iloc[-1])

    # Current feature values for context
    latest_row = df.iloc[-1]
    feature_snapshot = {
        "RSI": round(float(latest_row['RSI']), 2),
        "ADX": round(float(latest_row['ADX']), 2),
        "MACD_Signal": round(float(latest_row['MACD_Signal']), 4),
        "EMA200_Dist": round(float(latest_row['EMA200_Dist']), 3),
        "Volume_Ratio": round(float(latest_row['Volume_Ratio']), 3),
        "BB_Width": round(float(latest_row['BB_Width']), 3),
    }

    logger.info(f"🎯 XGBoost Prediction: {action} ({confidence:.1%}) | "
                f"HOLD={prob_hold:.1%} BUY={prob_buy:.1%} SELL={prob_sell:.1%} | "
                f"RSI={feature_snapshot['RSI']} ADX={feature_snapshot['ADX']}")

    return {
        "signal": action,
        "confidence": round(confidence, 4),
        "reason": reasoning,
        "data": {
            "price": current_price,
            "atr": current_atr,
            "features": feature_snapshot,
        },
        "feature_importance": feature_importance,
        "probabilities": {
            "hold": round(prob_hold, 4),
            "buy": round(prob_buy, 4),
            "sell": round(prob_sell, 4),
        }
    }

