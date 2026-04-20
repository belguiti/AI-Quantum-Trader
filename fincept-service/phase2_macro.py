"""Phase 2 — Macro Data Connectors (FRED proxies via yfinance tickers)."""
from fastapi import APIRouter
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

try:
    import macro_redis as _redis_helper
    _REDIS_OK = True
except Exception:
    _REDIS_OK = False

router = APIRouter()


class ToggleRequest(BaseModel):
    enabled: bool

TICKERS = {
    "^VIX":      ("VIX Fear Index",         "%",   "risk"),
    "^TNX":      ("10Y Treasury Yield",     "%",   "yield"),
    "^IRX":      ("3M T-Bill Rate",         "%",   "yield"),
    "^FVX":      ("5Y Treasury Yield",      "%",   "yield"),
    "DX-Y.NYB":  ("US Dollar Index",        "pts", "currency"),
    "GC=F":      ("Gold Spot",              "$/oz","commodity"),
    "CL=F":      ("Crude Oil WTI",          "$/bl","commodity"),
    "^GSPC":     ("S&P 500",                "pts", "equity"),
}


def _fetch_ticker(sym: str, start: str, end: str) -> float | None:
    try:
        data = yf.download(sym, start=start, end=end, progress=False)
        if data.empty:
            return None, None
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        closes = data["Close"].dropna().values.flatten().astype(float)
        if len(closes) < 2:
            return None, None
        return float(closes[-1]), float(closes[-2])
    except Exception:
        return None, None


@router.get("/indicators")
def get_macro_indicators():
    end = datetime.today()
    start = end - timedelta(days=14)
    start_str = start.strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")

    results = []
    tnx_val = irx_val = None

    for sym, (label, unit, category) in TICKERS.items():
        current, prev = _fetch_ticker(sym, start_str, end_str)
        if current is None:
            continue
        change = round((current - prev) / prev * 100, 3) if prev and prev != 0 else 0.0
        trend = "up" if change > 0 else ("down" if change < 0 else "flat")
        entry = {
            "key":      sym,
            "label":    label,
            "value":    round(current, 2),
            "change":   change,
            "unit":     unit,
            "category": category,
            "trend":    trend,
        }
        results.append(entry)
        if sym == "^TNX":
            tnx_val = current
        if sym == "^IRX":
            irx_val = current

    # Derived: Yield Curve spread (10Y - 3M)
    if tnx_val is not None and irx_val is not None:
        spread = round(tnx_val - irx_val, 3)
        results.append({
            "key":      "YIELD_CURVE",
            "label":    "Yield Curve (10Y−3M)",
            "value":    spread,
            "change":   0,
            "unit":     "%",
            "category": "yield",
            "trend":    "up" if spread > 0 else "down",
        })

    return results


def _compute_regime_from_indicators(indicators: list) -> dict:
    """Pure function — computes regime dict from indicator list (mirrors frontend logic)."""
    def get(key):
        return next((i for i in indicators if i["key"] == key), None)

    vix   = get("^VIX");   curve = get("YIELD_CURVE")
    dxy   = get("DX-Y.NYB"); spx  = get("^GSPC");  oil = get("CL=F")

    vix_val   = vix["value"]   if vix   else 20.0
    curve_val = curve["value"] if curve else 0.0
    dxy_trend = dxy["trend"]   if dxy   else "flat"
    spx_trend = spx["trend"]   if spx   else "flat"
    oil_trend = oil["trend"]   if oil   else "flat"

    score = 0
    if vix_val < 15:   score += 2
    elif vix_val < 20: score += 1
    elif vix_val > 30: score -= 2
    elif vix_val > 25: score -= 1

    if curve_val > 0.5:   score += 2
    elif curve_val > 0:   score += 1
    elif curve_val < -0.5: score -= 2
    elif curve_val < 0:   score -= 1

    if spx_trend == "up":   score += 1
    if spx_trend == "down": score -= 1
    if dxy_trend == "down": score += 1
    if dxy_trend == "up":   score -= 1
    if oil_trend == "down": score -= 1

    regime     = "RISK-ON" if score >= 3 else ("RISK-OFF" if score <= -2 else "NEUTRAL")
    confidence = min(95, abs(score) * 18 + 40)
    return {"regime": regime, "score": score, "confidence": confidence}


@router.get("/regime")
def get_macro_regime():
    """Compute the current macro regime and publish it to Redis if filter is enabled."""
    indicators = get_macro_indicators()
    r = _compute_regime_from_indicators(indicators)

    if _REDIS_OK and _redis_helper.get_filter_enabled():
        try:
            _redis_helper.publish_regime(r["regime"], r["score"], r["confidence"])
        except Exception:
            pass

    return {**r, "filter_enabled": _redis_helper.get_filter_enabled() if _REDIS_OK else False}


@router.get("/filter/status")
def get_filter_status():
    if not _REDIS_OK:
        return {"enabled": False, "regime": None, "redis_available": False}
    enabled = _redis_helper.get_filter_enabled()
    cached  = _redis_helper.get_regime()
    return {"enabled": enabled, "regime": cached, "redis_available": True}


@router.post("/filter/toggle")
def toggle_macro_filter(body: ToggleRequest):
    if not _REDIS_OK:
        return {"enabled": False, "error": "Redis unavailable"}
    _redis_helper.set_filter_enabled(body.enabled)
    if body.enabled:
        # Publish current regime immediately so downstream services pick it up
        try:
            indicators = get_macro_indicators()
            r = _compute_regime_from_indicators(indicators)
            _redis_helper.publish_regime(r["regime"], r["score"], r["confidence"])
        except Exception:
            pass
    return {"enabled": body.enabled}
