"""Live market features — real-time price via fast_info, indicators from daily history."""
from fastapi import APIRouter, HTTPException
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

router = APIRouter()


def _ema(series: np.ndarray, period: int) -> np.ndarray:
    k = 2 / (period + 1)
    ema = np.empty_like(series, dtype=float)
    ema[0] = series[0]
    for i in range(1, len(series)):
        ema[i] = series[i] * k + ema[i - 1] * (1 - k)
    return ema


def _rsi(closes: np.ndarray, period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    deltas   = np.diff(closes)
    gains    = np.where(deltas > 0, deltas, 0.0)
    losses   = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    if avg_loss == 0:
        return 100.0
    return round(100 - 100 / (1 + avg_gain / avg_loss), 2)


def _macd_line(closes: np.ndarray, fast: int = 12, slow: int = 26) -> float:
    if len(closes) < slow:
        return 0.0
    return round(float(_ema(closes, fast)[-1] - _ema(closes, slow)[-1]), 4)


@router.get("/{symbol}")
def get_live_features(symbol: str):
    end   = datetime.today()
    start = end - timedelta(days=90)
    try:
        # ── 1. Fetch daily history for indicator computation ─────────────────
        raw = yf.download(symbol, start=start.strftime("%Y-%m-%d"),
                          end=end.strftime("%Y-%m-%d"), progress=False)
        if raw.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.get_level_values(0)

        closes  = raw["Close"].dropna().values.flatten().astype(float)
        volumes = raw["Volume"].dropna().values.flatten().astype(float)

        if len(closes) < 30:
            raise HTTPException(status_code=422, detail="Not enough history")

        prev_close = float(closes[-1])   # yesterday's EOD close

        # ── 2. Fetch real-time price via fast_info ───────────────────────────
        ticker     = yf.Ticker(symbol)
        fi         = ticker.fast_info
        live_price = float(getattr(fi, "last_price", None) or prev_close)
        live_vol   = float(getattr(fi, "last_volume",  None) or volumes[-1])
        is_live    = abs(live_price - prev_close) > 0.001

        # ── 3. Inject live price as today's bar for indicators ───────────────
        closes_live = np.append(closes, live_price)   # now N+1 points

        rsi      = _rsi(closes_live)
        macd_raw = _macd_line(closes_live)
        # Normalize MACD as % of current price (makes it asset-agnostic)
        macd     = round(macd_raw / live_price * 100, 4) if live_price != 0 else 0.0

        change_pct = round((live_price - prev_close) / prev_close * 100, 3) if prev_close else 0.0

        # Volume ratio vs 20-day average (use live volume if market open)
        vol_20    = float(np.mean(volumes[-20:])) if len(volumes) >= 20 else float(np.mean(volumes))
        vol_today = live_vol if is_live else float(volumes[-1])
        vol_ratio = round(vol_today / vol_20 * 100, 1) if vol_20 > 0 else 100.0

        returns    = np.diff(closes_live) / closes_live[:-1]
        volatility = round(float(np.std(returns[-60:])) * np.sqrt(252) * 100, 2)

        return {
            "symbol":     symbol.upper(),
            "rsi":        float(round(rsi, 2)),
            "macd":       float(macd),
            "volume":     float(vol_ratio),
            "change":     float(change_pct),
            "volatility": float(volatility),
            "price":      round(live_price, 4),
            "prev_close": round(prev_close, 4),
            "is_live":    is_live,
            "as_of":      "live" if is_live else str(raw.index[-1].date()),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
