"""Shared Redis helpers for macro regime state."""
import json, os
from datetime import datetime

import redis as _redis

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

REGIME_KEY = "macro:regime"
FILTER_KEY = "macro:filter:enabled"


def _client() -> _redis.Redis:
    return _redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


def publish_regime(regime: str, score: int, confidence: int) -> None:
    payload = json.dumps({
        "regime":       regime,
        "score":        score,
        "confidence":   confidence,
        "published_at": datetime.utcnow().isoformat(),
    })
    _client().set(REGIME_KEY, payload, ex=3600)  # 1-hour TTL


def get_regime() -> dict | None:
    raw = _client().get(REGIME_KEY)
    return json.loads(raw) if raw else None


def set_filter_enabled(enabled: bool) -> None:
    _client().set(FILTER_KEY, "true" if enabled else "false", ex=86400)


def get_filter_enabled() -> bool:
    try:
        val = _client().get(FILTER_KEY)
        return val == "true"
    except Exception:
        return False
