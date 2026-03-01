# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Quantum Trader is a full-stack quantitative trading platform with real-time news intelligence, ML-powered trading signals, and live MetaTrader 5 integration. It uses a Spring Cloud microservice architecture (Java) with Python AI/ML services and an Angular 21 frontend.

## Service Ports

| Service | Port | Technology |
|---------|------|-----------|
| Discovery Service (Eureka) | 8761 | Spring Cloud |
| API Gateway | 8080 | Spring Cloud Gateway |
| Auth Service | 8085 | Spring Boot + JWT |
| Trade Service | 8081 | Spring Boot |
| News Service | 8086 | Spring Boot + Spring AI |
| AI Engine | 8000 | Python FastAPI |
| Frontend | 4200 | Angular 21 |
| Kafka | 9092 | KRaft mode (no ZooKeeper) |
| Redis | 6379 | Alpine |
| SQL Server | 1433 | SQL Server 2022 |
| Vault | 8200 | HashiCorp Vault (dev mode) |

## Commands

### Infrastructure (required first)
```powershell
docker compose up -d          # Start SQL Server, Redis, Kafka, Vault
. ./load-env.ps1              # Load environment variables
./start-all.ps1               # Start everything in separate PowerShell windows
```

### Backend (Java — run discovery-service first)
```powershell
cd discovery-service && mvn spring-boot:run   # Must start before other services
cd api-gateway && mvn spring-boot:run
cd auth-service && mvn spring-boot:run
cd trade-service && mvn spring-boot:run
cd news-service && mvn spring-boot:run
mvn clean install             # Build all modules from root
```

### Frontend (Angular)
```bash
cd frontend
npm install
npm start                     # ng serve → http://localhost:4200
npm run build                 # Production build
npm test                      # Vitest unit tests
```

### Python Services
```bash
cd ai-engine
source venv/Scripts/activate  # Windows: ./venv/Scripts/Activate.ps1
uvicorn main:app --reload --port 8000

cd mt5-connector
python main.py

cd service-ai-lab
uvicorn main:app --reload
```

## Required Environment Variables

Copy `.env.example` to `.env` and fill in:
- `OPENAI_API_KEY` — OpenAI API key for GPT-4o (news analysis, sentiment)
- `ALPHAVANTAGE_API_KEY` — Market data
- `JWT_SECRET_KEY` — Base64-encoded secret, minimum 64 characters
- `DB_PASSWORD` / `SA_PASSWORD` — SQL Server password (both must match)
- `VAULT_TOKEN` — Default: `ai-quantum-root-token` (Vault dev mode)

## Architecture

### Request Flow
```
Angular Frontend (4200)
  → API Gateway (8080)          [Spring Cloud Gateway, CORS to :4200]
    → Auth Service (8085)       [JWT validation, SQL Server]
    → Trade Service (8081)      [trading logic, Kafka consumer, Redis, MT5]
    → News Service (8086)       [RSS feeds → OpenAI enrichment → Kafka producer]
    → AI Engine (8000)          [FastAPI, ML predictions, swing trade signals]
```

### Real-Time Updates
- Services publish events to Kafka topic `market.news`
- News Service pushes enriched articles via WebSocket (STOMP protocol)
- Frontend subscribes via `@stomp/stompjs` for live data without polling

### Data Flow: News Intelligence
1. News Service fetches RSS from Yahoo Finance, CoinDesk, simulated Reddit
2. OpenAI GPT-4o enriches each article with sentiment (BULLISH/BEARISH/NEUTRAL), priority (HIGH/MEDIUM/LOW), and category (MARKET/CRYPTO/FINANCE/REAL_ESTATE)
3. Enriched articles stored in Redis Lists (Smart Feed: 80% HIGH priority)
4. Published to Kafka `market.news` topic
5. WebSocket pushes to all connected frontend clients; HIGH priority triggers global toast

### Data Flow: Trade Execution
1. Trade Service consumes Kafka events and AI Engine signals
2. Calculates position sizes using fixed-ratio lot sizing
3. Executes via MT5 Connector (Python, direct MetaTrader5 SDK)
4. Records all trades/strategies in SQL Server (TradeDB)

### Secrets Management
- HashiCorp Vault (dev mode) at `localhost:8200`
- Spring Cloud Vault auto-injects secrets at startup
- Backend: `secret`, path prefix: `ai-quantum`
- Services will fail to start if Vault is unavailable

## Frontend Structure

Angular 21 with standalone components, signals, and lazy-loaded routes:

```
frontend/src/app/
├── components/
│   ├── ai-signals/       # ML trading signals display with pagination
│   ├── news/             # Real-time news dashboard
│   ├── dashboard/        # Main trading dashboard
│   ├── admin/            # Admin panel
│   └── shared/           # Toast, sidebar, shared UI
├── services/
│   ├── websocket.service.ts    # STOMP WebSocket management
│   ├── auth.service.ts         # JWT auth, token refresh
│   └── news.service.ts         # News API calls
└── models/               # TypeScript interfaces
```

The frontend uses Tailwind CSS 3.4.1 and ApexCharts 5.6.0 for financial chart visualization.

## Key Architectural Decisions

- **Service discovery first**: Eureka (discovery-service) must be running before any other Spring service starts, or they will fail registration.
- **Vault dependency**: All Spring services pull secrets from Vault on startup. Docker Compose must be running (`vault` container) before starting Java services.
- **Kafka KRaft mode**: No ZooKeeper dependency — Kafka runs in combined broker+controller mode.
- **JWT secret length**: The `JWT_SECRET_KEY` must be base64-encoded and at least 64 characters — this was a known bug fix (commit `3baaffe`).
- **Fixed-ratio lot sizing**: Trade Service uses fixed-ratio position sizing, not fixed fractional (commit `bb48870`).
- **AI Engine is stateless REST**: The Python AI Engine at port 8000 exposes REST endpoints for predictions; it does not subscribe to Kafka directly.
