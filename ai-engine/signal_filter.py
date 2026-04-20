"""
Signal Filter — enriches AI Engine predictions with asset risk + macro regime data.
Called by /predict/v2 endpoint. Falls back gracefully if fincept-service or Redis is offline.
"""
import json
import logging

import requests

logger = logging.getLogger(__name__)

FINCEPT_BASE = "http://localhost:8004"
TIMEOUT      = 3  # seconds — never block the prediction pipeline

# Asset-level confidence multipliers per risk level
_CONF_MULTIPLIER = {"LOW": 1.00, "MEDIUM": 0.90, "HIGH": 0.75, "EXTREME": 0.50}

# Signal override: AVOID recommendation forces HOLD regardless of model output
_AVOID_OVERRIDE = True

# Macro regime multipliers: applied on top of asset-level adjustment when filter is ON
_MACRO_CONF_MULT   = {"RISK-ON": 1.10, "NEUTRAL": 1.00, "RISK-OFF": 0.80}
_MACRO_SIZE_MULT   = {"RISK-ON": 1.00, "NEUTRAL": 1.00, "RISK-OFF": 0.50}

# Redis keys (must match fincept-service/macro_redis.py)
_REGIME_KEY = "macro:regime"
_FILTER_KEY = "macro:filter:enabled"

try:
    import redis as _redis_lib
    _redis_client = _redis_lib.Redis(host="localhost", port=6379, decode_responses=True)
    _REDIS_OK = True
except Exception:
    _redis_client = None
    _REDIS_OK = False


def _get_macro_regime() -> dict | None:
    """Read cached regime from Redis; returns None if unavailable or filter is OFF."""
    if not _REDIS_OK:
        return None
    try:
        if _redis_client.get(_FILTER_KEY) != "true":
            return None
        raw = _redis_client.get(_REGIME_KEY)
        return json.loads(raw) if raw else None
    except Exception as e:
        logger.warning(f"signal_filter: Redis unreachable — {e}")
        return None


def enrich_signal(direction: str, confidence: float, symbol: str) -> dict:
    """
    Fetch asset health from fincept-service and optionally apply macro regime filter.

    Returns
    -------
    {
        direction          : str   — original or overridden (HOLD if AVOID)
        confidence         : float — adjusted by risk + macro multipliers
        original_direction : str
        original_confidence: float
        risk_level         : str   — LOW / MEDIUM / HIGH / EXTREME / UNKNOWN
        recommendation     : str   — TRADE / CAUTION / REDUCE / AVOID / UNKNOWN
        dynamic_risk_pct   : float — position sizing % (may be halved by macro)
        rules              : list  — triggered risk rules
        metrics            : dict  — var_95, vol, sharpe, sortino, max_drawdown
        risk_adjusted      : bool
        macro_regime       : str | None
        macro_filter_active: bool
    }
    """
    result = {
        "direction":           direction,
        "confidence":          confidence,
        "original_direction":  direction,
        "original_confidence": confidence,
        "risk_level":          "UNKNOWN",
        "recommendation":      "UNKNOWN",
        "dynamic_risk_pct":    0.01,
        "rules":               [],
        "metrics":             {},
        "risk_adjusted":       False,
        "macro_regime":        None,
        "macro_filter_active": False,
    }

    # ── Asset-level risk adjustment ──────────────────────────────────────────
    try:
        resp = requests.get(f"{FINCEPT_BASE}/asset-health/{symbol}", timeout=TIMEOUT)
        if resp.status_code == 200:
            health         = resp.json()
            risk_level     = health.get("risk_level", "UNKNOWN")
            recommendation = health.get("recommendation", "UNKNOWN")
            multiplier     = _CONF_MULTIPLIER.get(risk_level, 1.0)
            adj_confidence = round(confidence * multiplier, 4)
            adj_direction  = direction

            if _AVOID_OVERRIDE and recommendation == "AVOID":
                adj_direction  = "HOLD"
                adj_confidence = 0.0

            result.update({
                "direction":       adj_direction,
                "confidence":      adj_confidence,
                "risk_level":      risk_level,
                "recommendation":  recommendation,
                "dynamic_risk_pct": health.get("dynamic_risk_pct", 0.01),
                "rules":           health.get("rules", []),
                "metrics":         health.get("metrics", {}),
                "risk_adjusted":   True,
            })
    except Exception as e:
        logger.warning(f"signal_filter: fincept-service unreachable for {symbol} — {e}")

    # ── Macro regime adjustment (only when filter is ON in Redis) ────────────
    macro = _get_macro_regime()
    if macro:
        regime = macro.get("regime", "NEUTRAL")
        conf_mult = _MACRO_CONF_MULT.get(regime, 1.0)
        size_mult = _MACRO_SIZE_MULT.get(regime, 1.0)

        new_conf = round(min(0.99, result["confidence"] * conf_mult), 4)
        new_size = round(result["dynamic_risk_pct"] * size_mult, 4)

        result.update({
            "confidence":          new_conf,
            "dynamic_risk_pct":    new_size,
            "macro_regime":        regime,
            "macro_filter_active": True,
        })

    return result
