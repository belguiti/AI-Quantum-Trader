"""Phase 1 — Python Analytics Scripts (QuantLib-style metrics via yfinance + numpy)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import pandas as pd

router = APIRouter()


class MetricsRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str


@router.post("/metrics")
def compute_metrics(req: MetricsRequest):
    try:
        df = yf.download(req.symbol, start=req.start_date, end=req.end_date, progress=False)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {req.symbol}")

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        closes = df["Close"].dropna().values.flatten().astype(float)
        if len(closes) < 30:
            raise HTTPException(status_code=400, detail="Minimum 30 trading days required")

        returns = np.diff(closes) / closes[:-1]

        # Historical VaR
        var_95 = float(np.percentile(returns, 5))
        var_99 = float(np.percentile(returns, 1))

        # Sharpe (annualized, RF = 5.25%)
        rf_daily = 0.0525 / 252
        excess = returns - rf_daily
        sharpe = float(np.mean(excess) / np.std(excess) * np.sqrt(252)) if np.std(excess) > 0 else 0.0

        # Sortino
        downside = returns[returns < rf_daily]
        down_std = float(np.std(downside) * np.sqrt(252)) if len(downside) > 1 else 0.001
        sortino = float((np.mean(returns) - rf_daily) * 252 / down_std)

        # Max Drawdown
        cum = np.cumprod(1 + returns)
        peak = np.maximum.accumulate(cum)
        drawdowns = (cum - peak) / np.where(peak > 0, peak, 1)
        max_dd = float(np.min(drawdowns))

        # Calmar
        total_ret = float((closes[-1] - closes[0]) / closes[0])
        calmar = float(total_ret / abs(max_dd)) if max_dd != 0 else 0.0

        # DCF Score (0-100): proxy combining momentum + drawdown penalty
        dcf_score = round(min(100.0, max(0.0, 50.0 + total_ret * 100 + max_dd * 50)), 1)

        # Volatility (annualized)
        vol = float(np.std(returns) * np.sqrt(252) * 100)

        return {
            "symbol":       req.symbol,
            "var_95":       round(var_95 * 100, 3),
            "var_99":       round(var_99 * 100, 3),
            "sharpe":       round(sharpe, 3),
            "sortino":      round(sortino, 3),
            "calmar":       round(calmar, 3),
            "max_drawdown": round(max_dd * 100, 3),
            "volatility":   round(vol, 2),
            "total_return": round(total_ret * 100, 2),
            "dcf_score":    dcf_score,
            "data_points":  int(len(returns)),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
