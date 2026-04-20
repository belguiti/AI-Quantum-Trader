"""Phase 4 — AI Trading Persona Agents (Buffett / Graham / Lynch / Soros via GPT-4o-mini)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

router = APIRouter()

PERSONAS: dict[str, dict] = {
    "buffett": {
        "name": "Warren Buffett",
        "avatar": "WB",
        "color": "#3B82F6",
        "system": (
            "You are Warren Buffett analyzing a trading signal. "
            "Focus on intrinsic value vs market price, competitive moat, "
            "management quality, long-term earnings power, and margin of safety. "
            "Be skeptical of short-term signals. Respond in exactly 3 concise sentences."
        ),
    },
    "graham": {
        "name": "Benjamin Graham",
        "avatar": "BG",
        "color": "#10B981",
        "system": (
            "You are Benjamin Graham analyzing a signal through a value investing lens. "
            "Focus on book value, P/E ratio, debt levels, earnings stability, "
            "and buying below 2/3 of intrinsic value (margin of safety). "
            "Respond in exactly 3 concise sentences."
        ),
    },
    "lynch": {
        "name": "Peter Lynch",
        "avatar": "PL",
        "color": "#F59E0B",
        "system": (
            "You are Peter Lynch analyzing a signal using GARP principles. "
            "Focus on PEG ratio, understandable business model, institutional neglect, "
            "and ten-bagger potential. Respond in exactly 3 concise sentences."
        ),
    },
    "soros": {
        "name": "George Soros",
        "avatar": "GS",
        "color": "#EF4444",
        "system": (
            "You are George Soros analyzing a signal through reflexivity theory. "
            "Focus on market sentiment feedback loops, macro regime, positioning extremes, "
            "and whether the prevailing bias is self-reinforcing or about to reverse. "
            "Respond in exactly 3 concise sentences."
        ),
    },
}


class AgentRequest(BaseModel):
    persona: str
    symbol: str
    signal: str  # BUY | SELL | HOLD


@router.get("/personas")
def list_personas():
    return [
        {"key": k, "name": v["name"], "avatar": v["avatar"], "color": v["color"]}
        for k, v in PERSONAS.items()
    ]


@router.post("/explain")
def explain_signal(req: AgentRequest):
    key = req.persona.lower()
    if key not in PERSONAS:
        raise HTTPException(status_code=400, detail=f"Unknown persona. Valid: {list(PERSONAS.keys())}")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set in environment")

    persona = PERSONAS[key]
    prompt = (
        f"The AI model generated a {req.signal.upper()} signal for {req.symbol}. "
        f"Analyze this signal and state whether you would act on it."
    )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": persona["system"]},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=220,
            temperature=0.72,
        )
        rationale = resp.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    conf_map = {"BUY": 0.74, "SELL": 0.68, "HOLD": 0.52}
    return {
        "persona":     persona["name"],
        "persona_key": key,
        "avatar":      persona["avatar"],
        "color":       persona["color"],
        "symbol":      req.symbol,
        "signal":      req.signal.upper(),
        "rationale":   rationale,
        "confidence":  conf_map.get(req.signal.upper(), 0.60),
    }
