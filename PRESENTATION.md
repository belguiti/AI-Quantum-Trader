# AI Quantum Trader — Full Project Presentation

> **How to use this file with Claude Code:**
> Open a new session and paste the prompt from the **"Prompts"** section at the bottom.
> Attach the files listed in the **"Context Files"** section for accurate, code-grounded answers.

---

## SLIDE 1 — Title

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║            AI QUANTUM TRADER                                 ║
║      Institutional-Grade Quantitative Trading Platform       ║
║                                                              ║
║  Full-Stack · Microservices · ML-Powered · Real-Time         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

  Tech: Java 21 · Python · Angular 21 · Kafka · Redis · Vault
```

---

## SLIDE 2 — The Problem

**Retail traders lose because they lack:**

| Problem | Industry Reality |
|---|---|
| Real-time news intelligence | Paid terminals cost $2,000+/mo |
| Multi-strategy backtesting | Requires quant expertise |
| Automated execution | Broker APIs are complex |
| ML signal generation | Data science background needed |
| Risk management | Emotionally driven decisions |

> **Goal:** Build a platform that gives individual traders institutional-grade tools — for free.

---

## SLIDE 3 — What We Built

```
┌─────────────────────────────────────────────────────────────┐
│                   AI Quantum Trader                         │
│                                                             │
│  📰 News Intelligence     🧠 ML Signal Engine               │
│  Live RSS → GPT-4o        XGBoost v2 / LightGBM / Ensemble │
│  sentiment analysis       12-feature multi-class models     │
│                                                             │
│  ⚡ Quantum Lab            📊 Live Dashboard                 │
│  Backtest 4 ML engines    Real-time charts, P&L, signals   │
│                                                             │
│  🤖 MT5 Auto-Executor     🔐 Enterprise Security            │
│  Direct MetaTrader 5 SDK  Vault + JWT + Redis sessions     │
└─────────────────────────────────────────────────────────────┘
```

---

## SLIDE 4 — Architecture Overview

```
                    ANGULAR 21 FRONTEND  :4200
                    ┌────────────────────────┐
                    │ Dashboard  Lab  Signals│
                    │ News Feed  Admin Panel │
                    └────────────┬───────────┘
                                 │ HTTP / WebSocket (STOMP)
                    ╔════════════▼═══════════╗
                    ║    API GATEWAY  :8080  ║  JWT Validation
                    ║    Spring Cloud        ║  Rate Limiting
                    ╚═══╤═══════╤════════╤══╝  CORS
                        │       │        │
             ┌──────────▼──┐ ┌──▼────┐ ┌▼──────────┐
             │ AUTH  :8085 │ │TRADE  │ │ NEWS :8086 │
             │ JWT + Roles │ │:8081  │ │ RSS→GPT-4o │
             │ SQL Server  │ │Kafka  │ │ Kafka pub  │
             └─────────────┘ │Redis  │ └────────────┘
                             │MT5    │
                             └───┬───┘
                                 │ REST
                    ┌────────────▼───────────┐
                    │  AI ENGINE (Python)    │
                    │  FastAPI  :8000/:8002  │
                    │  XGBoost · LightGBM   │
                    │  Ensemble · Optuna    │
                    └────────────────────────┘

  Infrastructure: Kafka (KRaft) · Redis · SQL Server · Vault
  Discovery: Eureka :8761
```

---

## SLIDE 5 — News Intelligence Pipeline

**Data Flow:**

```
1. Scheduler (every 5 min)
   → Yahoo Finance RSS + CoinDesk + Simulated Reddit

2. OpenAI GPT-4o Enrichment per article:
   ┌──────────────────────────────────────────┐
   │  Sentiment:  BULLISH / BEARISH / NEUTRAL │
   │  Priority:   HIGH / MEDIUM / LOW         │
   │  Category:   MARKET / CRYPTO / FINANCE   │
   └──────────────────────────────────────────┘

3. Redis Smart Feed:
   → 80% HIGH priority articles surfaced first

4. Kafka → WebSocket (STOMP)
   → Live push to all connected users
   → HIGH priority = global toast notification

5. Frontend: Real-time news card feed, no polling
```

**Result:** Users see market-moving news within seconds, with AI sentiment labels — same data institutional desks pay for.

---

## SLIDE 6 — Quantum Lab: 4 AI Training Engines

### ⚡ Engine 1: Optuna (Rule-Based Bayesian Optimizer)
- **Algorithm:** TPE (Tree-structured Parzen Estimator) — not random search
- **Strategy:** Golden Confluence (EMA + ADX + RSI pullback + ATR risk)
- **Walk-forward:** Optimizes on 70% data, tests on 30% (out-of-sample)
- **Metrics:** Sharpe Ratio × Calmar Ratio objective

### 🧠 Engine 2: XGBoost v2 (ML Multi-Class)
- **12 features:** RSI, MACD, ADX, ATR, EMA200, Stoch RSI K/D, Williams %R, OBV, CCI, Bollinger Width, Volume Ratio
- **Labels:** BUY / SELL / HOLD (forward-look ATR-based labeling)
- **HPO:** 20-trial Optuna search per training run
- **Validation:** TimeSeriesSplit (5-fold walk-forward)
- **Imbalance fix:** compute_sample_weight('balanced')

### 🌿 Engine 3: LightGBM (GOSS + EFB)
- **Same 12 features** as XGBoost v2
- **GOSS:** Faster training by focusing on high-gradient samples
- **EFB:** Exclusive feature bundling for sparse features
- **Warm-start:** Continuous learning without forgetting

### 🎭 Engine 4: Ensemble (XGBoost + LightGBM Soft-Vote)
- Trains **both** models in a single pipeline
- **50/50 soft-vote** on class probabilities — reduces variance
- Best expected performance; ~2× training time

---

## SLIDE 7 — Backtest Engine (Live Demo)

**What happens when you click "Train Model":**

```
User clicks TRAIN MODEL
  → Angular sends POST /lab/train to API Gateway
  → Trade Service creates async Job (UUID)
  → WebSocket begins sending progress logs to console
  → Java calls Python FastAPI :8002/lab/train
  → Python runs selected engine (e.g., 100 Optuna trials)
  → Returns: equityCurve, winRate, Sharpe, Calmar, bestParams
  → Frontend renders interactive ApexCharts equity curve
  → Best parameters shown: ADX threshold, EMA period, etc.
```

**Key Metrics Displayed:**
- Net Profit ($) and % return
- Calmar Ratio (return / max drawdown)
- Win Rate %
- Max Drawdown %
- Total Trades + Fees Paid
- Feature Importance Bar Chart

---

## SLIDE 8 — Live Trade Execution (MT5)

```
AI Signal Generated
  ↓
Trade Service (Spring Boot)
  → Validates signal confidence > threshold
  → Calculates position size (Fixed-Ratio method)
  → Checks risk limits (max drawdown, max trades)
  ↓
MT5 Connector (Python)
  → Direct MetaTrader5 SDK call
  → Places market/limit order
  → Records in SQL Server (TradeDB)
  ↓
WebSocket push to Dashboard
  → Live P&L update
  → Position card appears
  → Risk gauge updates
```

**Position Sizing:** Fixed-Ratio (not Fixed-Fractional) — scales position size as account grows, more conservatively than Kelly Criterion.

---

## SLIDE 9 — Security Architecture

```
┌───────────────────────────────────────────────────────┐
│                HashiCorp Vault (Dev Mode)              │
│  Path: secret/ai-quantum                              │
│  Stores: DB passwords, JWT secret, API keys           │
│  Spring Cloud Vault auto-injects at startup           │
└───────────────────────────────────────────────────────┘

JWT Flow:
  Login → Auth Service → JWT (HS512, 64-char secret)
  Every request → API Gateway validates JWT
  Admin routes → @PreAuthorize("hasAuthority('ADMIN')")

Session Security:
  Token refresh via Redis (TTL-based)
  CORS locked to :4200 only
  Rate limiting at Gateway level
```

---

## SLIDE 10 — Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Frontend | Angular 21 + Signals | Reactive, standalone components, type-safe |
| Styling | Tailwind CSS 3.4 | Utility-first, dark theme |
| Charts | ApexCharts 5.6 | Interactive financial charts |
| API Gateway | Spring Cloud Gateway | JWT filter, CORS, routing |
| Auth | Spring Boot + JWT | HS512, role-based access |
| Trading | Spring Boot + Kafka | Event-driven execution |
| News | Spring Boot + Spring AI | GPT-4o integration |
| ML Engine | Python FastAPI | XGBoost, LightGBM, Optuna |
| MT5 | Python SDK | Native MetaTrader5 bridge |
| Messaging | Apache Kafka (KRaft) | No ZooKeeper, high throughput |
| Cache | Redis Alpine | News feed, sessions |
| Database | SQL Server 2022 | Trades, users, strategies |
| Secrets | HashiCorp Vault | Zero-config secret injection |
| Discovery | Eureka | Service registration + health |

---

## SLIDE 11 — Admin Panel (Real Data)

**Live admin dashboard features:**
- All users with real trade stats (P&L, Win Rate, Trade Count) fetched from Trade Service
- Role management: Upgrade FREE → PRO, make/remove ADMIN
- System health: API usage bar, crowd signal feed, system metrics
- Client-side pagination with search (no backend changes needed)
- All actions hit real REST endpoints with `@PreAuthorize("hasAuthority('ADMIN')")`

---

## SLIDE 12 — Key Engineering Decisions

| Decision | Rationale |
|---|---|
| Eureka starts first | All Spring services need registration before starting |
| Vault dependency at startup | Secret injection fails fast — no silent config errors |
| Kafka KRaft mode | Eliminated ZooKeeper, simpler topology |
| `@if` instead of `[hidden]` for charts | ApexCharts renders at width=0 inside `display:none` containers |
| Fixed-Ratio lot sizing | More conservative scaling than Kelly; survives drawdown periods |
| Optuna TPE vs random search | 30-40% fewer trials needed to reach equivalent quality |
| `compute_sample_weight('balanced')` | BUY/SELL/HOLD imbalance causes models to predict HOLD always without this |
| Walk-forward validation | Simple train/test split leaks future data; walk-forward doesn't |

---

## SLIDE 13 — Demo Flow (Live)

```
1. Landing page → login as admin
2. Dashboard → live news feed (WebSocket), AI signals panel
3. News section → click HIGH priority article → sentiment card
4. Quantum Lab → select BTC-USD, 2020-2024, 100 trials
   → Run Optuna: watch console, equity curve renders
   → Run XGBoost: feature importance bar chart
   → Run Ensemble: combined reasoning card
5. AI Signals → paginated signal table, Swing Trade style
6. Admin Panel → user table with real P&L, role assignment
7. MT5 Bot Settings → toggle auto-trade, configure risk
```

---

## SLIDE 14 — What's Next (Roadmap)

- [ ] **LSTM/Transformer engine** — sequence-aware predictions
- [ ] **Portfolio mode** — multi-asset simultaneous trading
- [ ] **Live paper trading** — sandbox execution without real money
- [ ] **Strategy marketplace** — share/import community strategies
- [ ] **Mobile app** — React Native push notifications
- [ ] **Backtesting on tick data** — sub-daily resolution

---

## SLIDE 15 — Summary

```
╔══════════════════════════════════════════════════════════════╗
║  AI QUANTUM TRADER — What We Delivered                       ║
║                                                              ║
║  ✅ 7 production microservices (Java + Python)               ║
║  ✅ Real-time news with GPT-4o sentiment                     ║
║  ✅ 4 ML training engines (Optuna, XGB, LGBM, Ensemble)     ║
║  ✅ Live MetaTrader 5 auto-execution                         ║
║  ✅ Full admin panel with real trade data                    ║
║  ✅ Enterprise security (Vault + JWT + Redis)                ║
║  ✅ Kafka event bus (KRaft, no ZooKeeper)                   ║
║  ✅ Angular 21 responsive SPA with real-time WebSocket       ║
║                                                              ║
║         "Institutional tools. Zero cost."                    ║
╚══════════════════════════════════════════════════════════════╝
```

---
---

# HOW TO USE CLAUDE CODE FOR THIS PRESENTATION

## Context Files to Attach

Paste these file paths into your Claude Code session before asking any question:

```
Priority 1 — Architecture & Config (always include):
  CLAUDE.md
  docker-compose.yml
  service-ai-lab/main.py

Priority 2 — AI/ML Engines:
  service-ai-lab/lab_engine.py
  service-ai-lab/xgboost_trainer.py
  service-ai-lab/lightgbm_trainer.py
  service-ai-lab/ensemble_trainer.py

Priority 3 — Backend Services:
  trade-service/src/main/java/com/aiquantum/trade/controller/TradeController.java
  news-service/src/main/java/com/aiquantum/news/service/NewsService.java
  auth-service/src/main/java/com/aiquantum/auth/controller/AdminController.java

Priority 4 — Frontend:
  frontend/src/app/components/lab/lab.component.ts
  frontend/src/app/components/dashboard/dashboard.component.ts
  frontend/src/app/services/websocket.service.ts
```

---

## Prompts to Use

### Prompt 1 — Full Slide Deck (PowerPoint / Google Slides)
```
I'm presenting the AI Quantum Trader project. Using the attached files as context,
create a full slide deck outline (15 slides) covering:
- Project overview and problem statement
- Microservice architecture diagram (ASCII or Mermaid)
- News intelligence pipeline
- Quantum Lab AI engines (Optuna, XGBoost v2, LightGBM, Ensemble)
- MT5 trade execution flow
- Security architecture (Vault + JWT)
- Admin panel capabilities
- Engineering decisions and trade-offs
- Live demo script
- Roadmap

Format each slide with: Title, 3-5 bullet points, and a speaker note.
Keep language non-technical enough for a mixed audience (developers + non-developers).
```

---

### Prompt 2 — Technical Deep-Dive (Developer Audience)
```
I need a technical deep-dive presentation for developers on the AI Quantum Trader project.
Focus on:
1. How the 4 ML engines work (read lab_engine.py and xgboost_trainer.py)
2. The Kafka event bus flow from news ingestion to trade execution
3. Walk-forward validation vs simple train/test split — why it matters
4. How Optuna TPE differs from random search (with concrete numbers)
5. Why we use compute_sample_weight('balanced') for the ML classifiers
6. The XGBoost 7→12 feature migration problem and how we solved it
7. Spring Cloud Vault secret injection at startup

For each topic: explain the problem, our solution, and the engineering trade-off.
```

---

### Prompt 3 — Executive / Non-Technical Summary
```
I need a 5-minute non-technical pitch for AI Quantum Trader.

Using CLAUDE.md as context, explain:
- What the platform does in plain English (no code terms)
- Who benefits from it and how
- What makes it different from existing trading tools
- The business value of each major feature
- Why AI/ML improves trading outcomes (simple analogy, no math)

Write this as a spoken script I can deliver in exactly 5 minutes.
```

---

### Prompt 4 — Live Demo Script
```
Write a step-by-step live demo script for AI Quantum Trader running on localhost.
The demo should take exactly 8 minutes and cover:
1. Landing page and login (admin user)
2. Dashboard real-time news + WebSocket signals
3. Quantum Lab: run one Optuna training session on BTC-USD (2020-2024, 100 trials)
4. Quantum Lab: run XGBoost v2 and show feature importance chart
5. AI Signals page (pagination, filters)
6. Admin panel: show user trade stats, change a role
7. MT5 Bot Settings: show auto-trade toggle

For each step: what to click, what to say, and what outcome to highlight.
Flag any steps that could fail and give a fallback talking point.
```

---

### Prompt 5 — Q&A Preparation
```
Prepare a Q&A cheat sheet for the AI Quantum Trader presentation.
Include the 15 most likely questions from:
- A technical panel (architecture, ML, security)
- A business panel (ROI, scalability, competition)
- A general audience (what it does, is it safe, does it make money)

For each question provide: a 2-sentence answer and a 1-sentence follow-up if pressed.
Base answers on the actual codebase (CLAUDE.md and service files attached).
```

---

### Prompt 6 — README / Project Brief (written document)
```
Using the attached codebase files, write a 2-page project brief for AI Quantum Trader.
Structure:
  - Executive Summary (150 words)
  - Technical Architecture (250 words, with ASCII diagram)
  - Key Features (bulleted, one line each)
  - AI/ML Capabilities (100 words)
  - Security & Infrastructure (100 words)
  - Setup Instructions (brief, based on CLAUDE.md commands)
  - Team / Contributors section (leave blank for me to fill)

Professional tone, suitable for a GitHub README or portfolio.
```

---

### Prompt 7 — Mermaid Architecture Diagram
```
Based on CLAUDE.md and the attached service files, generate a Mermaid.js diagram that shows:
- All 7 microservices and their ports
- How the Angular frontend communicates with the API Gateway
- The Kafka event flow between News Service, Trade Service, and frontend
- The MT5 Connector relationship to Trade Service
- Infrastructure: Redis, SQL Server, Vault
- Which services register with Eureka

Use `graph TD` or `sequenceDiagram` format as appropriate.
Label all arrows with the protocol (HTTP, WebSocket, Kafka, JDBC, REST).
```

---

## Quick One-Liners (for follow-up questions during live presentation)

```
"How does the Optuna engine differ from random hyperparameter search?"
→ Explain the Optuna TPE sampler in lab_engine.py and compare to the old np.random.uniform loop.

"Why use 4 ML engines instead of just one?"
→ Explain bias-variance tradeoff, how ensemble reduces variance, and different tree growth strategies.

"How does the news sentiment feed work in real-time?"
→ Walk through news-service pipeline: RSS → GPT-4o → Redis → Kafka → WebSocket → Angular.

"How do you prevent the model from overfitting to historical data?"
→ Explain walk-forward validation (70/30 split in lab_engine.py) vs naive train/test split.

"Is this safe to trade with real money?"
→ Explain the paper trading flow, risk limits, fixed-ratio position sizing, and the fact that MT5 connector has configurable max drawdown stops.

"What happens if Vault goes down?"
→ Spring Boot services fail to start — fail-fast is intentional (no silent config errors).

"Why Kafka instead of REST between services?"
→ Decoupling, replay capability, no polling, back-pressure handling.
```
