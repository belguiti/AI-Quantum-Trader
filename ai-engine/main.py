from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import logging
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Engine Stub")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    features: List[float] = Field(..., min_items=5, max_items=5, description="[RSI, MACD, Volume, Change, Volatility]")
    news_headline: Optional[str] = None

class PredictionResponse(BaseModel):
    direction: str # BUY, SELL, HOLD
    probability_win: float
    confidence: float

@app.get("/health")
def health_check():
    return {"status": "UP", "model": "Quantum-Stub-v1"}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    """
    Mock prediction logic.
    In a real scenario, this would load a .h5 or .pkl model.
    Here we use a deterministic heuristic based on features for testing.
    Feature 0 is RSI.
    """
    try:
        rsi = request.features[0]
        macd = request.features[1]
        
        # Simple heuristic for testing
        probability = 0.5
        confidence = 0.5
        direction = "HOLD"

        # RSI Logic
        if rsi < 30:
            probability = 0.75
            direction = "BUY"
        elif rsi > 70:
            probability = 0.75
            direction = "SELL"
        
        # MACD bump
        if direction == "BUY" and macd > 0:
            confidence = 0.8
        elif direction == "SELL" and macd < 0:
            confidence = 0.8
            
        return {
            "direction": direction,
            "probability_win": probability,
            "confidence": confidence
        }

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from signal_filter  import enrich_signal
from swing_analyzer import analyze_swing


class RiskAwarePredictionRequest(BaseModel):
    features: List[float] = Field(..., min_items=5, max_items=5,
                                  description="[RSI, MACD, Volume, Change, Volatility]")
    symbol: str = Field(..., description="Ticker symbol — used for asset health lookup")
    news_headline: Optional[str] = None


@app.post("/predict/v2")
def predict_v2(request: RiskAwarePredictionRequest):
    """
    Risk-aware prediction: runs the same RSI/MACD heuristic as /predict,
    then enriches the result with live asset health data from fincept-service.

    Adjustments applied:
      - Confidence multiplied by risk-level factor (LOW×1.0 … EXTREME×0.5)
      - Direction overridden to HOLD when recommendation is AVOID
      - dynamic_risk_pct tells callers how much equity to risk on this trade
    """
    try:
        rsi  = request.features[0]
        macd = request.features[1]

        probability = 0.5
        confidence  = 0.5
        direction   = "HOLD"

        if rsi < 30:
            probability = 0.75
            direction   = "BUY"
        elif rsi > 70:
            probability = 0.75
            direction   = "SELL"

        if direction == "BUY"  and macd > 0:  confidence = 0.8
        if direction == "SELL" and macd < 0:  confidence = 0.8

        enriched = enrich_signal(direction, confidence, request.symbol)

        return {
            "direction":          enriched["direction"],
            "probability_win":    probability,
            "confidence":         enriched["confidence"],
            "original_direction": enriched["original_direction"],
            "original_confidence":enriched["original_confidence"],
            "risk_level":         enriched["risk_level"],
            "recommendation":     enriched["recommendation"],
            "dynamic_risk_pct":   enriched["dynamic_risk_pct"],
            "rules":              enriched["rules"],
            "metrics":            enriched["metrics"],
            "risk_adjusted":      enriched["risk_adjusted"],
        }
    except Exception as e:
        logger.error(f"predict/v2 error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SwingRequest(BaseModel):
    symbol: str

@app.post("/analyze/swing")
def analyze_swing_endpoint(request: SwingRequest):
    """
    Swing Trading Analysis Endpoint (D1 + H4).
    """
    try:
        result = analyze_swing(request.symbol)
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        logger.error(f"Swing Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
