from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import logging
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

from lab_engine import LabEngine
from xgboost_trainer import run_xgboost_pipeline, predict_live, SYMBOL_MAP
from lightgbm_trainer import run_lightgbm_pipeline, predict_live_lgbm
from ensemble_trainer import run_ensemble_pipeline, predict_live_ensemble

logger = logging.getLogger(__name__)

# ── yfinance ticker map (primary ticker for each MT5 symbol) ──
_YF_TICKER: dict[str, str] = {
    "BTCUSD": "BTC-USD",  "BTCUSDT": "BTC-USD",
    "ETHUSD": "ETH-USD",  "ETHUSDT": "ETH-USD",
    "SOLUSD": "SOL-USD",  "BNBUSD":  "BNB-USD",  "XRPUSD": "XRP-USD",
    "XAUUSD": "GC=F",     "XAGUSD":  "SI=F",     "USOIL":  "CL=F",
    "EURUSD": "EURUSD=X", "GBPUSD":  "GBPUSD=X", "USDJPY": "JPY=X",
    "AUDUSD": "AUDUSD=X", "NZDUSD":  "NZDUSD=X", "USDCAD": "CAD=X",  "USDCHF": "CHF=X",
    "NAS100": "NQ=F",     "US500":   "ES=F",      "US30":   "YM=F",
    "UK100":  "^FTSE",   "GER40":   "^GDAXI",
    "AAPL": "AAPL", "NVDA": "NVDA", "TSLA": "TSLA", "MSFT": "MSFT", "AMZN": "AMZN",
}

app = FastAPI(title="AI Quantum Lab", version="3.0.0")
lab_engine = LabEngine()


class TrainingRequest(BaseModel):
    symbol: str
    startDate: str
    endDate: str
    indicators: List[str] = []
    targetWinRate: float = 0.70
    trials: int = 100
    param_ranges: Optional[dict] = None
    engineType: Optional[str] = "OPTUNA"   # OPTUNA | XGBOOST | LIGHTGBM | ENSEMBLE


class BacktestResult(BaseModel):
    totalTrades: int
    winRate: float
    totalReturn: float
    maxDrawdown: float
    equityCurve: List[dict]
    bestParams: dict


@app.get("/")
def health_check():
    return {
        "status": "AI Lab Service Running",
        "version": "3.0.0",
        "engines": ["OPTUNA", "XGBOOST", "LIGHTGBM", "ENSEMBLE"]
    }


@app.post("/lab/train")
async def train_model(request: TrainingRequest):
    """
    Routes to the appropriate engine based on engineType:
      - OPTUNA    : Rule-based Golden Confluence with real Bayesian optimisation (TPE).
      - XGBOOST   : 12-feature XGBoost v2 with Optuna HPO + TimeSeriesSplit.
      - LIGHTGBM  : 12-feature LightGBM (GOSS + EFB) with Optuna HPO.
      - ENSEMBLE  : XGBoost v2 + LightGBM soft-vote fusion.
    """
    try:
        engine = (request.engineType or "OPTUNA").upper()

        if engine == "XGBOOST":
            result = run_xgboost_pipeline(
                symbol=request.symbol,
                start_date=request.startDate,
                end_date=request.endDate,
            )

        elif engine == "LIGHTGBM":
            result = run_lightgbm_pipeline(
                symbol=request.symbol,
                start_date=request.startDate,
                end_date=request.endDate,
            )

        elif engine == "ENSEMBLE":
            result = run_ensemble_pipeline(
                symbol=request.symbol,
                start_date=request.startDate,
                end_date=request.endDate,
            )

        else:  # OPTUNA (default)
            result = lab_engine.run_optimization(
                symbol=request.symbol,
                start_date=request.startDate,
                end_date=request.endDate,
                _indicators=request.indicators,
                target_win_rate=request.targetWinRate,
                n_trials=request.trials,
                param_ranges=request.param_ranges,
            )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Prediction endpoints ──────────────────────────────────────
class PredictRequest(BaseModel):
    symbol: str
    marketData: List[dict]
    indicators: List[str]
    params: dict
    newsSentiment: float = 0.0
    asset_class: str = "FOREX"


@app.post("/lab/predict")
async def predict(request: PredictRequest):
    """Real-time signal from the Golden Confluence Fusion Engine."""
    try:
        result = lab_engine.predict(
            market_data=request.marketData,
            _indicators=request.indicators,
            _params=request.params,
            _news_sentiment=request.newsSentiment,
            asset_class=request.asset_class,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class MLPredictRequest(BaseModel):
    symbol: str
    marketData: List[dict]
    engineType: Optional[str] = "XGBOOST"   # XGBOOST | LIGHTGBM | ENSEMBLE


@app.post("/lab/predict/ml")
async def predict_ml(request: MLPredictRequest):
    """
    Unified ML prediction endpoint.
    engineType: XGBOOST | LIGHTGBM | ENSEMBLE
    """
    engine = (request.engineType or "XGBOOST").upper()
    try:
        if engine == "LIGHTGBM":
            result = predict_live_lgbm(request.symbol, request.marketData)
        elif engine == "ENSEMBLE":
            result = predict_live_ensemble(request.symbol, request.marketData)
        else:  # XGBOOST (default)
            result = predict_live(request.symbol, request.marketData)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Keep legacy endpoint for backwards compatibility with Spring Boot
@app.post("/lab/predict/xgboost")
async def predict_xgboost_legacy(request: MLPredictRequest):
    """Legacy XGBoost prediction endpoint."""
    try:
        return predict_live(request.symbol, request.marketData)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Swing Scan ────────────────────────────────────────────────
class SwingScanRequest(BaseModel):
    symbols: List[str] = [
        "BTCUSD", "ETHUSD", "SOLUSD",
        "XAUUSD", "XAGUSD", "USOIL",
        "EURUSD", "GBPUSD", "USDJPY", "AUDUSD",
        "NAS100", "US500", "US30", "UK100", "GER40",
        "AAPL", "NVDA", "TSLA", "MSFT", "AMZN",
    ]
    minConfidence: float = 0.45


@app.post("/lab/swing/scan")
async def swing_scan(request: SwingScanRequest):
    """
    Bulk D1 swing scan — fetches yfinance data internally, no MT5 needed.
    Returns only BUY/SELL signals above minConfidence.
    """
    results = []
    end_dt   = datetime.now()
    start_dt = end_dt - timedelta(days=730)   # 2 years for EMA-200 warmup

    for symbol in request.symbols:
        try:
            yf_symbol = _YF_TICKER.get(symbol.upper(), symbol)
            df = yf.download(
                yf_symbol,
                start=start_dt.strftime("%Y-%m-%d"),
                end=end_dt.strftime("%Y-%m-%d"),
                progress=False,
            )
            if df.empty or len(df) < 200:
                logger.warning(f"⚠️ Not enough yfinance data for {symbol} ({yf_symbol}): {len(df)} rows")
                continue

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            df = df.reset_index()
            market_data = (
                df.rename(columns={"Date": "time"})[["time", "Open", "High", "Low", "Close", "Volume"]]
                .to_dict(orient="records")
            )

            result     = predict_live(symbol, market_data)
            signal     = result.get("signal", "HOLD")
            confidence = result.get("confidence", 0.0)

            if signal in ("BUY", "SELL") and confidence >= request.minConfidence:
                data = result.get("data", {})
                results.append({
                    "symbol":     symbol,
                    "signal":     signal,
                    "confidence": confidence,
                    "reason":     result.get("reason", ""),
                    "price":      data.get("price", 0.0),
                    "atr":        data.get("atr", 0.0),
                })
                logger.info(f"🌊 Swing signal: {signal} {symbol} ({confidence:.1%})")
            else:
                logger.info(f"   No swing signal for {symbol}: {signal} ({confidence:.1%})")

        except Exception as e:
            logger.warning(f"Swing scan failed for {symbol}: {e}")

    logger.info(f"✅ Swing scan complete: {len(results)} signals from {len(request.symbols)} symbols")
    return {"results": results, "scanned": len(request.symbols), "signals": len(results)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
