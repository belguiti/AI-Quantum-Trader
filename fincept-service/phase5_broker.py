"""Phase 5 — Broker Adapter Router (MT5 | Alpaca | IBKR)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import os, time, socket

router = APIRouter()

SUPPORTED = ["MT5", "ALPACA", "IBKR"]


class BrokerRequest(BaseModel):
    broker: str


class ActivateRequest(BaseModel):
    broker: str


def _ping_mt5() -> dict:
    t0 = time.time()
    try:
        import MetaTrader5 as mt5
        ok = mt5.initialize()
        ms = int((time.time() - t0) * 1000)
        if ok:
            mt5.shutdown()
        return {"connected": ok, "latency_ms": ms, "note": "" if ok else "MT5 terminal not running"}
    except ImportError:
        return {"connected": False, "latency_ms": 0, "note": "MetaTrader5 SDK not installed"}
    except Exception as e:
        return {"connected": False, "latency_ms": 0, "note": str(e)}


def _ping_alpaca() -> dict:
    key    = os.getenv("ALPACA_API_KEY", "")
    secret = os.getenv("ALPACA_SECRET_KEY", "")
    if not key or not secret:
        return {"connected": False, "latency_ms": 0, "note": "Set ALPACA_API_KEY + ALPACA_SECRET_KEY in .env"}
    t0 = time.time()
    try:
        import requests
        r = requests.get(
            "https://paper-api.alpaca.markets/v2/account",
            headers={"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret},
            timeout=5,
        )
        ms = int((time.time() - t0) * 1000)
        return {"connected": r.status_code == 200, "latency_ms": ms, "note": ""}
    except Exception as e:
        return {"connected": False, "latency_ms": 0, "note": str(e)}


def _ping_ibkr() -> dict:
    host = os.getenv("IBKR_HOST", "127.0.0.1")
    port = int(os.getenv("IBKR_PORT", "7497"))
    t0 = time.time()
    try:
        s = socket.create_connection((host, port), timeout=2)
        s.close()
        ms = int((time.time() - t0) * 1000)
        return {"connected": True, "latency_ms": ms, "note": ""}
    except Exception:
        return {"connected": False, "latency_ms": 0, "note": f"TWS/Gateway not reachable at {host}:{port}"}


_CHECKERS = {"MT5": _ping_mt5, "ALPACA": _ping_alpaca, "IBKR": _ping_ibkr}
_TYPES    = {"MT5": "CFD / Forex", "ALPACA": "Stocks / Crypto", "IBKR": "Multi-Asset"}


def _build(name: str) -> dict:
    result = _CHECKERS[name]()
    active = os.getenv("ACTIVE_BROKER", "MT5").upper()
    return {
        "name":         name,
        "type":         _TYPES[name],
        "connected":    result["connected"],
        "latency_ms":   result["latency_ms"],
        "note":         result.get("note", ""),
        "active":       name == active,
        "last_checked": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/status")
def all_statuses():
    return [_build(n) for n in SUPPORTED]


@router.post("/test")
def test_one(req: BrokerRequest):
    broker = req.broker.upper()
    if broker not in SUPPORTED:
        raise HTTPException(status_code=400, detail=f"Unknown broker. Choose: {SUPPORTED}")
    return _build(broker)


@router.post("/activate")
def activate(req: ActivateRequest):
    broker = req.broker.upper()
    if broker not in SUPPORTED:
        raise HTTPException(status_code=400, detail=f"Unknown broker. Choose: {SUPPORTED}")
    return {"success": True, "active_broker": broker, "message": f"{broker} set as active execution broker"}
