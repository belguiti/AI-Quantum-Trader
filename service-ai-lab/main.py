from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import pandas as pd
import threading
from lab_engine import LabEngine
from xgboost_trainer import run_xgboost_pipeline, predict_live

app = FastAPI(title="AI Quantum Lab", version="2.0.0")
lab_engine = LabEngine()

class TrainingRequest(BaseModel):
    symbol: str
    startDate: str
    endDate: str
    indicators: List[str] = []
    targetWinRate: float = 0.70
    trials: int = 100
    param_ranges: Optional[dict] = None
    engineType: Optional[str] = "OPTUNA"   # "OPTUNA" or "XGBOOST"

class BacktestResult(BaseModel):
    totalTrades: int
    winRate: float
    totalReturn: float
    maxDrawdown: float
    equityCurve: List[dict] # {time: str, value: float}
    bestParams: dict

@app.get("/")
def health_check():
    return {"status": "AI Lab Service Running", "version": "2.0.0", "engines": ["OPTUNA", "XGBOOST"]}

@app.post("/lab/train")
async def train_model(request: TrainingRequest):
    """
    Routes to the appropriate engine based on engineType.
    - OPTUNA: Rule-based Golden Confluence optimizer.
    - XGBOOST: Machine Learning with continuous/incremental learning.
    """
    try:
        if request.engineType and request.engineType.upper() == "XGBOOST":
            # ── XGBoost ML Pipeline ──
            result = run_xgboost_pipeline(
                symbol=request.symbol,
                start_date=request.startDate,
                end_date=request.endDate
            )
            return result
        else:
            # ── Optuna Rule-Based Pipeline (existing) ──
            result = lab_engine.run_optimization(
                symbol=request.symbol,
                start_date=request.startDate,
                end_date=request.endDate,
                indicators=request.indicators,
                target_win_rate=request.targetWinRate,
                n_trials=request.trials,
                param_ranges=request.param_ranges
            )
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PredictRequest(BaseModel):
    symbol: str
    marketData: List[dict] # {time, Open, High, Low, Close, Volume}
    indicators: List[str]
    params: dict
    newsSentiment: float = 0.0
    asset_class: str = "FOREX"

@app.post("/lab/predict")
async def predict(request: PredictRequest):
    print(f"DEBUG: Recommendation Request for {request.symbol} (Sentiment: {request.newsSentiment})")
    try:
        result = lab_engine.predict(
            market_data=request.marketData,
            indicators=request.indicators,
            params=request.params,
            news_sentiment=request.newsSentiment,
            asset_class=request.asset_class
        )
        print(f"DEBUG: Prediction Result: {result}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class XGBoostPredictRequest(BaseModel):
    symbol: str
    marketData: List[dict]  # {time, Open, High, Low, Close, Volume}

@app.post("/lab/predict/xgboost")
async def predict_xgboost(request: XGBoostPredictRequest):
    """Live prediction using trained XGBoost multi-class model."""
    print(f"🎯 XGBoost Predict Request: {request.symbol} ({len(request.marketData)} candles)")
    try:
        result = predict_live(
            symbol=request.symbol,
            market_data=request.marketData
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
