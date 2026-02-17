from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import pandas as pd
import threading
from lab_engine import LabEngine

app = FastAPI(title="AI Quantum Lab", version="1.0.0")
lab_engine = LabEngine()

class TrainingRequest(BaseModel):
    symbol: str
    startDate: str
    endDate: str
    indicators: List[str]
    targetWinRate: float = 0.70
    trials: int = 100
    param_ranges: Optional[dict] = None

class BacktestResult(BaseModel):
    totalTrades: int
    winRate: float
    totalReturn: float
    maxDrawdown: float
    equityCurve: List[dict] # {time: str, value: float}
    bestParams: dict

@app.get("/")
def health_check():
    return {"status": "AI Lab Service Running"}

@app.post("/lab/train")
async def train_model(request: TrainingRequest):
    """
    Starts the optimization process. This is a blocking call for simplicity in this MVP,
    but in production (and for the Java integration), we might want to make it async 
    or just rely on the Java side to handle the long-running request timeout or use callbacks.
    For this "v1", we will return the result directly.
    """
    try:
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

@app.post("/lab/predict")
async def predict(request: PredictRequest):
    print(f"DEBUG: Recommendation Request for {request.symbol} (Sentiment: {request.newsSentiment})")
    try:
        result = lab_engine.predict(
            market_data=request.marketData,
            indicators=request.indicators,
            params=request.params,
            news_sentiment=request.newsSentiment
        )
        print(f"DEBUG: Prediction Result: {result}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
