"""
FinceptTerminal Integration Service — Port 8003
Separate FastAPI service; does not touch any existing service.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from asset_health     import router as health_router
from phase1_analytics import router as analytics_router
from phase2_macro      import router as macro_router
from phase3_sentiment  import router as sentiment_router
from phase4_agents     import router as agents_router
from phase5_broker     import router as broker_router
from live_features     import router as features_router

app = FastAPI(title="FinceptTerminal Integration Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router,    prefix="/asset-health", tags=["Asset Health"])
app.include_router(analytics_router, prefix="/analytics",    tags=["Phase 1 — Analytics"])
app.include_router(macro_router,     prefix="/macro",     tags=["Phase 2 — Macro"])
app.include_router(sentiment_router, prefix="/sentiment", tags=["Phase 3 — Sentiment"])
app.include_router(agents_router,    prefix="/agents",    tags=["Phase 4 — AI Agents"])
app.include_router(broker_router,    prefix="/brokers",   tags=["Phase 5 — Brokers"])
app.include_router(features_router,  prefix="/features",  tags=["Live Features"])


@app.get("/health")
def health():
    return {"status": "online", "service": "fincept-integration", "phases": 5}
