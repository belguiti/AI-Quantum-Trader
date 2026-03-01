"""
Ensemble Trainer — XGBoost + LightGBM Soft-Vote Fusion Engine.

Trains BOTH XGBoost v2 and LightGBM in one pipeline, then combines their class
probability distributions via weighted soft-voting:

    P_ensemble = 0.5 * P_xgb + 0.5 * P_lgbm

This typically outperforms either individual model by:
  - Reducing variance (each model makes different errors)
  - Leveraging XGBoost's depth-wise growth AND LightGBM's leaf-wise growth
  - Inheriting Optuna HPO from both sub-trainers

If a sub-model already exists on disk it will be extended (continuous learning).
"""

import os
import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb
import logging
import yfinance as yf

from xgboost_trainer import (
    build_features, create_labels, _sanitize_dict, _sharpe_from_returns,
    get_trade_reasoning, FEATURE_COLS, CLASS_NAMES, SYMBOL_MAP,
    COMMISSION_RATE, SLIPPAGE_RATE, CONFIDENCE_THRESHOLD, FEATURE_DISPLAY,
)
from xgboost_trainer import ContinuousXGBoostTrainer
from lightgbm_trainer import LightGBMTrainer

logger = logging.getLogger(__name__)
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


# ═══════════════════════════════════════════════════════════════
#  Soft-vote fusion helper
# ═══════════════════════════════════════════════════════════════
def _fuse_probabilities(xgb_proba: np.ndarray, lgbm_proba: np.ndarray,
                        xgb_weight: float = 0.5) -> np.ndarray:
    """
    Weighted soft vote. xgb_weight in [0,1]; lgbm gets (1-xgb_weight).
    Returns array of shape (n_samples, 3).
    """
    lgb_weight = 1.0 - xgb_weight
    fused = xgb_weight * xgb_proba + lgb_weight * lgbm_proba
    # Re-normalise to guard against floating-point drift
    row_sums = fused.sum(axis=1, keepdims=True)
    return fused / np.where(row_sums == 0, 1, row_sums)


def _merge_feature_importances(*fi_dicts: dict) -> dict:
    """Average feature importances across all sub-model dicts."""
    keys = set()
    for d in fi_dicts:
        keys.update(d.keys())
    merged = {}
    for k in keys:
        vals = [d.get(k, 0.0) for d in fi_dicts]
        merged[k] = round(float(np.mean(vals)), 4)
    total = sum(merged.values()) or 1.0
    return {k: round(v / total, 4) for k, v in merged.items()}


# ═══════════════════════════════════════════════════════════════
#  Backtest using ensemble probabilities
# ═══════════════════════════════════════════════════════════════
def _run_ensemble_backtest(enriched: pd.DataFrame, fused_proba: np.ndarray,
                           atr_multiplier: float, symbol: str) -> dict:
    """Simulate trading using the fused probability array."""
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
    sample_step   = max(1, len(fused_proba) // 500)

    for i in range(len(fused_proba)):
        close   = closes[i]
        high    = highs[i]
        low     = lows[i]
        atr_val = atrs[i] if not np.isnan(atrs[i]) else 0.0

        prob_buy  = float(fused_proba[i][1])
        prob_sell = float(fused_proba[i][2])

        # ── Check open position ──
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

        # ── Entry signals (ensemble agrees with higher bar) ──
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

        if i % sample_step == 0 or i == len(fused_proba) - 1:
            idx = enriched.index[i]
            ts  = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
            equity_curve.append({"time": ts, "value": round(float(capital), 2)})

    total_trades = wins + losses
    win_rate     = wins / total_trades if total_trades > 0 else 0.0
    total_return = (capital - initial_capital) / initial_capital
    calmar_ratio = total_return / (max_drawdown + 0.001) if max_drawdown > 0 else total_return * 5
    sharpe_ratio = _sharpe_from_returns(trade_returns)

    logger.info(f"   Ensemble Backtest: {total_trades} trades | WR: {win_rate:.2%} | "
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
def run_ensemble_pipeline(symbol: str, start_date: str, end_date: str,
                          atr_multiplier: float = 1.5) -> dict:
    """
    Full ensemble pipeline:
      1. Train XGBoost v2 (with Optuna HPO if fresh)
      2. Train LightGBM   (with Optuna HPO if fresh)
      3. Soft-vote their probabilities (50/50)
      4. Backtest the ensemble on the full date range
    """
    logger.info(f"═══ Ensemble (XGB + LGBM) Pipeline for {symbol} ═══")

    df = yf.download(symbol, start=start_date, end=end_date, progress=False)
    if df.empty:
        raise ValueError(f"No data from yfinance for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # ── Step 1 & 2: Train sub-models ──
    xgb_trainer  = ContinuousXGBoostTrainer()
    lgbm_trainer = LightGBMTrainer()

    logger.info("  → Training XGBoost sub-model…")
    xgb_train  = xgb_trainer.train(symbol, df, atr_multiplier, run_hpo=True)
    logger.info("  → Training LightGBM sub-model…")
    lgbm_train = lgbm_trainer.train(symbol, df, atr_multiplier, run_hpo=True)

    # ── Step 3: Load saved models and build fused probabilities ──
    xgb_path  = os.path.join(MODELS_DIR, f"XGBoost_{symbol}.json")
    lgbm_path = os.path.join(MODELS_DIR, f"LightGBM_{symbol}.txt")

    xgb_model  = xgb.XGBClassifier()
    xgb_model.load_model(xgb_path)

    lgbm_booster = lgb.Booster(model_file=lgbm_path)

    enriched = build_features(df).dropna(subset=FEATURE_COLS)
    X        = enriched[FEATURE_COLS].values

    xgb_proba  = xgb_model.predict_proba(X)          # (n, 3)
    lgbm_proba = lgbm_booster.predict(X)              # (n, 3)
    fused      = _fuse_probabilities(xgb_proba, lgbm_proba, xgb_weight=0.5)

    # ── Step 4: Backtest the ensemble ──
    backtest_results = _run_ensemble_backtest(enriched, fused, atr_multiplier, symbol)

    # ── Merge feature importances from both models ──
    merged_fi = _merge_feature_importances(
        xgb_train.get("featureImportance", {}),
        lgbm_train.get("featureImportance", {}),
    )

    buy_ratio  = (xgb_train["buyLabelRatio"]  + lgbm_train["buyLabelRatio"])  / 2
    sell_ratio = (xgb_train["sellLabelRatio"] + lgbm_train["sellLabelRatio"]) / 2
    hold_ratio = (xgb_train["holdLabelRatio"] + lgbm_train["holdLabelRatio"]) / 2
    avg_train_acc = (xgb_train["trainAccuracy"] + lgbm_train["trainAccuracy"]) / 2
    avg_val_acc   = (xgb_train["valAccuracy"]   + lgbm_train["valAccuracy"])   / 2

    if buy_ratio > sell_ratio:
        dominant_action, dominant_conf = "BUY", buy_ratio
    elif sell_ratio > buy_ratio:
        dominant_action, dominant_conf = "SELL", sell_ratio
    else:
        dominant_action, dominant_conf = "HOLD", 0.5

    main_idea = get_trade_reasoning(dominant_action, dominant_conf, merged_fi)

    was_continuous = xgb_train["wasContinuousLearning"] or lgbm_train["wasContinuousLearning"]

    result = {
        **backtest_results,
        "wasContinuousLearning": bool(was_continuous),
        "trainAccuracy": round(float(avg_train_acc), 4),
        "valAccuracy":   round(float(avg_val_acc), 4),
        "buyLabelRatio":  round(float(buy_ratio), 4),
        "sellLabelRatio": round(float(sell_ratio), 4),
        "holdLabelRatio": round(float(hold_ratio), 4),
        "totalSamples":  int(len(X)),
        "featureColumns": list(FEATURE_COLS),
        "featureImportance": merged_fi,
        "engineType": "ENSEMBLE",
        "mainIdea":   main_idea,
        "modelType":  "Ensemble: XGBoost v2 + LightGBM (50/50 soft-vote)",
        "bestParams": {
            "engine":           "XGBoost v2 + LightGBM Soft-Vote",
            "xgb_weight":       0.5,
            "lgbm_weight":      0.5,
            "atr_multiplier":   float(atr_multiplier),
            "xgb_model_file":   f"XGBoost_{symbol}.json",
            "lgbm_model_file":  f"LightGBM_{symbol}.txt",
            "train_accuracy":   float(avg_train_acc),
            "val_accuracy":     float(avg_val_acc),
            "buy_label_ratio":  float(buy_ratio),
            "sell_label_ratio": float(sell_ratio),
            "hold_label_ratio": float(hold_ratio),
            "num_classes":      3,
            "objective":        "Soft-vote fusion (multi:softprob + multiclass)",
            "n_features":       len(FEATURE_COLS),
            "hpo_method":       "Optuna TPE per sub-model",
        },
    }

    result = _sanitize_dict(result)
    logger.info(f"═══ Ensemble complete. Sharpe: {backtest_results['sharpeRatio']:.2f} ═══")
    return result


# ═══════════════════════════════════════════════════════════════
#  Live prediction
# ═══════════════════════════════════════════════════════════════
def predict_live_ensemble(symbol: str, market_data: list) -> dict:
    """Fuse XGBoost + LightGBM predictions for a real-time signal."""
    xgb_path  = os.path.join(MODELS_DIR, f"XGBoost_{symbol}.json")
    lgbm_path = os.path.join(MODELS_DIR, f"LightGBM_{symbol}.txt")

    # Try mapped symbol variants
    for candidate in [symbol] + (SYMBOL_MAP.get(symbol.upper(), [])):
        if not os.path.exists(xgb_path):
            xgb_path = os.path.join(MODELS_DIR, f"XGBoost_{candidate}.json")
        if not os.path.exists(lgbm_path):
            lgbm_path = os.path.join(MODELS_DIR, f"LightGBM_{candidate}.txt")

    if not os.path.exists(xgb_path) or not os.path.exists(lgbm_path):
        return {
            "signal": "HOLD", "confidence": 0.0,
            "reason": f"Ensemble requires BOTH XGBoost and LightGBM models for {symbol}. "
                      "Train the Ensemble engine first.",
            "data": {}, "feature_importance": {}
        }

    xgb_model    = xgb.XGBClassifier()
    xgb_model.load_model(xgb_path)
    lgbm_booster = lgb.Booster(model_file=lgbm_path)

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

    latest_X    = enriched[FEATURE_COLS].iloc[[-1]].values
    xgb_proba   = xgb_model.predict_proba(latest_X)[0]
    lgbm_proba  = lgbm_booster.predict(latest_X)[0]
    fused_proba = _fuse_probabilities(
        xgb_proba.reshape(1, -1), lgbm_proba.reshape(1, -1)
    )[0]

    prob_hold, prob_buy, prob_sell = float(fused_proba[0]), float(fused_proba[1]), float(fused_proba[2])
    max_idx    = int(np.argmax(fused_proba))
    action     = CLASS_NAMES[max_idx]
    confidence = float(fused_proba[max_idx])

    # Average feature importances for reasoning
    xgb_imp  = xgb_model.feature_importances_
    lgbm_raw = np.array(lgbm_booster.feature_importance(importance_type='gain'), dtype=float)
    lgbm_imp = lgbm_raw / (lgbm_raw.sum() + 1e-9)
    avg_imp  = (xgb_imp + lgbm_imp) / 2
    avg_imp  = avg_imp / (avg_imp.sum() + 1e-9)
    feature_importance = {col: round(float(v), 4) for col, v in zip(FEATURE_COLS, avg_imp)}

    reasoning = get_trade_reasoning(action, confidence, feature_importance)
    current_price = float(enriched['Close'].iloc[-1])
    current_atr   = float(enriched['ATR'].iloc[-1])
    latest_row    = enriched.iloc[-1]
    feature_snapshot = {f: round(float(latest_row[f]), 3) for f in FEATURE_COLS if f in latest_row}

    logger.info(f"🎭 Ensemble: {action} ({confidence:.1%}) — "
                f"BUY={prob_buy:.1%} SELL={prob_sell:.1%} HOLD={prob_hold:.1%}")

    return {
        "signal":     action,
        "confidence": round(confidence, 4),
        "reason":     reasoning,
        "data": {"price": current_price, "atr": current_atr, "features": feature_snapshot},
        "feature_importance": feature_importance,
        "probabilities": {"hold": round(prob_hold, 4), "buy": round(prob_buy, 4), "sell": round(prob_sell, 4)},
        "sub_models": {"xgb": f"XGBoost_{symbol}.json", "lgbm": f"LightGBM_{symbol}.txt"},
    }
