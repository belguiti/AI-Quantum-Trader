"""
Asset Health Check — combines risk metrics into actionable trading decisions.
GET /asset-health/{symbol}
"""
from fastapi import APIRouter, HTTPException
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

router = APIRouter()

RF_DAILY = 0.0525 / 252


def _compute_health(symbol: str, lookback_days: int = 365) -> dict:
    end   = datetime.today()
    start = end - timedelta(days=lookback_days)

    df = yf.download(symbol, start=start.strftime("%Y-%m-%d"),
                     end=end.strftime("%Y-%m-%d"), progress=False)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    closes  = df["Close"].dropna().values.flatten().astype(float)
    if len(closes) < 30:
        raise HTTPException(status_code=400, detail="Need ≥30 trading days")

    returns = np.diff(closes) / closes[:-1]

    # Core metrics
    var_95  = float(np.percentile(returns, 5))
    vol     = float(np.std(returns) * np.sqrt(252))
    excess  = returns - RF_DAILY
    sharpe  = float(np.mean(excess) / np.std(excess) * np.sqrt(252)) if np.std(excess) > 0 else 0.0
    down    = returns[returns < RF_DAILY]
    d_std   = float(np.std(down) * np.sqrt(252)) if len(down) > 1 else 0.001
    sortino = float((np.mean(returns) - RF_DAILY) * 252 / d_std)
    cum     = np.cumprod(1 + returns)
    peak    = np.maximum.accumulate(cum)
    max_dd  = float(np.min((cum - peak) / np.where(peak > 0, peak, 1)))

    # Risk Level decision table
    risk_score = 0
    if var_95 < -0.04:   risk_score += 2
    elif var_95 < -0.02: risk_score += 1
    if vol > 0.60:       risk_score += 2
    elif vol > 0.30:     risk_score += 1
    if sharpe < 0.5:     risk_score += 1
    if max_dd < -0.30:   risk_score += 2
    elif max_dd < -0.15: risk_score += 1

    risk_level = ["LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "EXTREME"][min(risk_score, 6)]

    # Dynamic risk % (mirrors RiskManager.compute_dynamic_risk_pct)
    sortino_adj = min(0.005, max(-0.003, (sortino - 1.0) * 0.005))
    vol_adj     = max(-0.005, min(0.003, (0.30 - vol) * 0.02))
    dyn_risk    = round(max(0.002, min(0.02, 0.01 + sortino_adj + vol_adj)), 4)

    # Decision rules
    rules = []
    if var_95 < -0.04:  rules.append({"rule": "VaR > 4%",     "action": "Halve position size",    "severity": "high"})
    if sharpe < 0.5:    rules.append({"rule": "Sharpe < 0.5", "action": "Do not trade",           "severity": "high"})
    if vol > 0.40:      rules.append({"rule": "Vol > 40%",    "action": "Use ATR×2 stop-loss",    "severity": "medium"})
    if max_dd < -0.20:  rules.append({"rule": "MaxDD > 20%",  "action": "Reduce max position 50%","severity": "medium"})
    if sortino > 1.5:   rules.append({"rule": "Sortino > 1.5","action": "Eligible for full size", "severity": "info"})
    if not rules:       rules.append({"rule": "All clear",    "action": "Normal position sizing", "severity": "info"})

    # Trade recommendation
    if risk_level == "EXTREME" or sharpe < 0.3:
        recommendation = "AVOID"
    elif risk_level == "HIGH":
        recommendation = "REDUCE"
    elif risk_level == "MEDIUM":
        recommendation = "CAUTION"
    else:
        recommendation = "TRADE"

    return {
        "symbol":          symbol.upper(),
        "risk_level":      risk_level,
        "recommendation":  recommendation,
        "dynamic_risk_pct": dyn_risk,
        "metrics": {
            "var_95":       round(var_95 * 100, 2),
            "volatility":   round(vol * 100, 2),
            "sharpe":       round(sharpe, 3),
            "sortino":      round(sortino, 3),
            "max_drawdown": round(max_dd * 100, 2),
        },
        "rules":       rules,
        "data_points": int(len(returns)),
        "as_of":       datetime.utcnow().isoformat() + "Z",
    }


@router.get("/{symbol}")
def get_asset_health(symbol: str, lookback_days: int = 365):
    try:
        return _compute_health(symbol, lookback_days)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
