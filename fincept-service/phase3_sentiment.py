"""Phase 3 — Adanos-style Social Sentiment (Reddit public JSON API, no auth)."""
from fastapi import APIRouter
import requests, re

router = APIRouter()

_HEADERS = {"User-Agent": "QuantumForge/1.0 (sentiment-research; contact=support@quantumforge.ai)"}

_BULL = {"buy","bullish","moon","long","calls","rally","breakout","growth","profit","gain","surge","pump"}
_BEAR = {"sell","bearish","short","puts","crash","dump","drop","loss","bear","fall","collapse","rekt"}


def _score_text(text: str) -> float:
    words = set(re.findall(r"\b\w+\b", text.lower()))
    b = len(words & _BULL)
    bear = len(words & _BEAR)
    total = b + bear
    return (b - bear) / total if total > 0 else 0.0


@router.get("/{symbol}")
def get_sentiment(symbol: str):
    sym = re.sub(r"[^A-Za-z0-9]", "", symbol).upper()
    subreddits = ["wallstreetbets", "investing", "stocks", "options", "SecurityAnalysis"]
    posts = []

    for sub in subreddits:
        url = (
            f"https://www.reddit.com/r/{sub}/search.json"
            f"?q={sym}&sort=new&limit=8&restrict_sr=1&t=week"
        )
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=6)
            if resp.status_code != 200:
                continue
            for child in resp.json().get("data", {}).get("children", []):
                d = child.get("data", {})
                title = d.get("title", "")
                body  = d.get("selftext", "")[:200]
                score = _score_text(title + " " + body)
                posts.append({
                    "source":  f"r/{sub}",
                    "text":    title[:120],
                    "score":   round(score, 2),
                    "upvotes": d.get("ups", 0),
                })
        except Exception:
            continue

    if not posts:
        return {"symbol": sym, "score": 0.0, "label": "NEUTRAL", "posts": [], "post_count": 0}

    avg = sum(p["score"] for p in posts) / len(posts)
    label = "BULLISH" if avg > 0.08 else ("BEARISH" if avg < -0.08 else "NEUTRAL")
    posts.sort(key=lambda x: x["upvotes"], reverse=True)

    return {
        "symbol":     sym,
        "score":      round(avg, 3),
        "label":      label,
        "posts":      posts[:12],
        "post_count": len(posts),
    }
