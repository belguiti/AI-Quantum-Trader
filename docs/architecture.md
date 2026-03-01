# AI-Quantum Trader — Architecture & Diagrams

> **How to view:** Install the VS Code extension **"Markdown Preview Mermaid Support"** (ID: `bierner.markdown-mermaid`), then open this file and press `Ctrl+Shift+V` to preview.
>
> Or paste any diagram block at [https://mermaid.live](https://mermaid.live)

---

## 1. System Architecture

```mermaid
graph TB
    subgraph CLIENT["Client Layer — Angular 21 :4200"]
        FE["🌐 Angular 21\nStandalone Components · Signals\nTailwind CSS · ApexCharts"]
    end

    subgraph GATEWAY["Gateway Layer"]
        GW["⚡ API Gateway :8080\nSpring Cloud Gateway\nCORS → :4200 · JWT route filter"]
        EUR["🔍 Eureka :8761\nService Registry\nHealth checks · Load balancing"]
    end

    subgraph SERVICES["Java Microservices"]
        AUTH["🔐 Auth Service :8085\nJWT · BCrypt · Roles\nVault secrets · user_id claim"]
        TRADE["📈 Trade Service :8081\nPositions · Risk Engine\nOpportunities · Lab Orchestrator\nWebSocket STOMP broker"]
        NEWS["📰 News Service :8086\nRSS Fetcher · GPT-4o enrichment\nSentiment · Priority · Category\nKafka producer · Redis writer"]
    end

    subgraph PYTHON["Python Services"]
        AI["🤖 AI Engine :8000\nFastAPI · XGBoost\nLive market predictions\nWin probability scoring"]
        LAB["🧪 AI Lab :8002\nFastAPI · Optuna + XGBoost\nBacktest · Golden Confluence\nSMC + Classical Fusion\nyfinance data"]
        MT5["🔌 MT5 Connector :5005\nPython · MetaTrader5 SDK\nAccount summary · Orders\nHistory · Open positions"]
    end

    subgraph INFRA["Infrastructure — Docker Compose"]
        KAFKA["📨 Kafka :9092\nKRaft mode (no ZooKeeper)\ntopic: market.news"]
        SQL["🗄️ SQL Server 2022 :1434\nTradeDB\nUsers · Trades · Opportunities\nBotConfig · Models · RiskState"]
        REDIS["⚡ Redis :6379\nSmart Feed Cache\n80% HIGH priority articles\nList-based ring buffer"]
        VAULT["🔒 Vault :8200\nHashiCorp dev mode\nauto-injected at startup\npath: secret/ai-quantum"]
    end

    %% Frontend ↔ Gateway
    FE -- "REST / HTTP (JWT Bearer)" --> GW
    FE -- "WebSocket STOMP\n/topic/lab/progress\n/topic/news" --> GW

    %% Gateway routing
    GW -- "POST /api/auth/**" --> AUTH
    GW -- "GET|POST /api/opportunities\n/api/trades · /api/lab\n/api/wallet · /api/swing" --> TRADE
    GW -- "GET /api/news" --> NEWS
    GW -. "Eureka registration" .-> EUR

    %% Auth wiring
    AUTH -- "SQL (users table)" --> SQL
    AUTH -- "JWT secret · DB password" --> VAULT

    %% Trade Service wiring
    TRADE -- "SQL (trades · opportunities\nbot_config · models · risk_state)" --> SQL
    TRADE -- "Cache (market overview\nopen position cache)" --> REDIS
    TRADE -- "MT5 credentials" --> VAULT
    TRADE -- "Consume market.news\n(Kafka Consumer)" --> KAFKA
    TRADE -- "POST /predict\n(live signal scoring)" --> AI
    TRADE -- "POST /lab/train\n(async backtest job)" --> LAB
    TRADE -- "POST /trade/open|close\nGET /positions · /history\nGET /account" --> MT5

    %% News Service wiring
    NEWS -- "OpenAI key" --> VAULT
    NEWS -- "Publish market.news\n(Kafka Producer)" --> KAFKA
    NEWS -- "Store enriched articles\n(Redis Lists)" --> REDIS

    %% Eureka registrations
    AUTH -.->|"register"| EUR
    TRADE -.->|"register"| EUR
    NEWS -.->|"register"| EUR
```

---

## 2. Database Schema (TradeDB — SQL Server 2022)

```mermaid
erDiagram
    users {
        bigint id PK "IDENTITY AUTO"
        varchar email UK "NOT NULL"
        varchar password "BCrypt hashed"
        varchar username
        decimal wallet_balance "DEFAULT 0.00"
        datetime created_at
        varchar role "USER | ADMIN"
        bit mt5_connected "DEFAULT 0"
        varchar mt5_base_url
        varchar wallet_address
        bit is_active "DEFAULT 1"
        varchar subscription_plan "FREE | PRO | ENTERPRISE"
        int data_usage
        varchar payment_status "PENDING | PAID | FAILED"
    }

    bot_configuration {
        bigint id PK "IDENTITY AUTO"
        varchar userId FK "→ users.id"
        bit active "Only 1 active per user"
        bigint version "Optimistic locking"
        datetime createdAt
        varchar configName
        varchar mode "LIVE | PAPER | SHADOW"
        varchar selectedStrategy "GOLDEN_CONFLUENCE | SMC | XGBOOST"
        int aiLookbackPeriod "Candles for context"
        double aiConfidenceThreshold "0.0–1.0"
        double stopLossPercentage
        double takeProfitPercentage
        int maxOpenTrades
        double riskPerTradePct "% of balance per trade"
        double maxDailyLossPct "Circuit breaker threshold"
        int cooldownMinutesAfterLoss
        varchar timeframe "M1|M5|M15|H1|H4|D1"
        bit allowShort
        bigint mt5Login
        varchar mt5Password "Stored in Vault (ref)"
        varchar mt5Server
        varchar mt5ConnectorBaseUrl "http://host:5005"
        varchar aiEngineBaseUrl "http://host:8000"
        bit enableAiModel
        bigint selectedModelId FK "→ trained_models.id"
    }

    bot_config_symbols {
        bigint bot_configuration_id FK
        varchar symbol "e.g. BTCUSD, EURUSD"
    }

    opportunities {
        bigint id PK
        varchar userId FK "→ users.id"
        varchar symbol
        varchar side "BUY | SELL"
        double entryPrice
        double sl "Stop Loss price"
        double tp "Take Profit price"
        double predictedWinProbability "0.0–1.0"
        double confidence "AI model confidence"
        varchar source "AI_ENGINE | AI_LAB_MODEL_n | NEWS"
        bit isSwing "Swing vs intraday"
        datetime createdAt
        datetime updatedAt
        varchar status "ACTIVE | CONFIRMED | REJECTED | EXPIRED"
        varchar primaryCatalyst "FVG | BSL_SWEEP | RSI etc."
        varchar strategyBreakdown "Human-readable reasoning"
        double sentimentScore "-1.0 to 1.0 (GPT-4o)"
        bigint configVersion "Snapshot of config at scan time"
    }

    trades {
        bigint id PK
        varchar userId FK "→ users.id"
        varchar symbol
        varchar side "BUY | SELL"
        double entryPrice
        double exitPrice
        double quantity "Lot size"
        double sl
        double tp
        double pnl "Realised P&L in account currency"
        datetime entryTime
        datetime exitTime
        varchar status "OPEN | CLOSED | SL_HIT | TP_HIT | CANCELLED"
        varchar externalOrderId "MT5 ticket number"
        double predictedWinProbability
        varchar strategyBreakdown
        bigint opportunityId FK "→ opportunities.id"
    }

    trained_models {
        bigint id PK
        varchar symbol "Asset trained on"
        varchar user_id FK "→ users.id"
        varchar name "Human-readable strategy name"
        text parameters "JSON: bestParams (ADX, EMA, RSI, ATR)"
        text metrics "JSON: winRate, return, drawdown, calmar"
        datetime trainingDate
        bit isDeployed "Active in live scanning"
    }

    risk_state {
        bigint id PK
        varchar userId UK "→ users.id (1-to-1)"
        double dailyPnl "Resets at midnight"
        datetime lastLossTime
        bit circuitBreakerTripped "Halts all trading"
        datetime lastReset
    }

    exchange_accounts {
        bigint id PK
        varchar userId FK "→ users.id"
        varchar name "Friendly label"
        varchar broker "IC Markets · Pepperstone etc."
        varchar accountType "DEMO | LIVE"
        varchar login
        varchar password
        varchar server
        varchar path
        datetime lastConnectedAt
        datetime createdAt
    }

    market_assets {
        bigint id PK
        varchar symbol UK "e.g. BTCUSD"
        varchar brokerSymbol "Broker-specific alias"
        varchar assetClass "CRYPTO | FOREX | COMMODITY | INDEX"
        bit isActive
    }

    %% Relationships
    users ||--o{ trades : "userId"
    users ||--o{ opportunities : "userId"
    users ||--o{ bot_configuration : "userId (max 1 active)"
    users ||--o| risk_state : "userId"
    users ||--o{ exchange_accounts : "userId"
    users ||--o{ trained_models : "userId"
    bot_configuration ||--o{ bot_config_symbols : "id"
    bot_configuration }o--|| trained_models : "selectedModelId"
    opportunities ||--o{ trades : "opportunityId"
```

---

## 3. Class Diagram — Core Services

```mermaid
classDiagram
    %% ── Domain Models ──────────────────────────────────────────
    class User {
        +Long id
        +String email
        +String username
        +BigDecimal walletBalance
        +Role role
        +boolean mt5Connected
        +SubscriptionPlan subscriptionPlan
        +PaymentStatus paymentStatus
        +getAuthorities() Collection~GrantedAuthority~
    }

    class Trade {
        +Long id
        +String userId
        +String symbol
        +String side
        +Double entryPrice
        +Double exitPrice
        +Double quantity
        +Double sl
        +Double tp
        +Double pnl
        +String status
        +String externalOrderId
        +Long opportunityId
    }

    class Opportunity {
        +Long id
        +String userId
        +String symbol
        +String side
        +Double entryPrice
        +Double sl
        +Double tp
        +Double predictedWinProbability
        +Double confidence
        +String source
        +Boolean isSwing
        +String status
        +String primaryCatalyst
        +String strategyBreakdown
        +Double sentimentScore
    }

    class BotConfiguration {
        +Long id
        +String userId
        +boolean active
        +String mode
        +List~String~ symbols
        +Double aiConfidenceThreshold
        +Double stopLossPercentage
        +Double takeProfitPercentage
        +Integer maxOpenTrades
        +Double riskPerTradePct
        +Double maxDailyLossPct
        +Integer cooldownMinutesAfterLoss
        +String timeframe
        +Long mt5Login
        +String mt5ConnectorBaseUrl
        +String aiEngineBaseUrl
        +Long selectedModelId
    }

    class TrainedModel {
        +Long id
        +String symbol
        +String userId
        +String name
        +String parameters
        +String metrics
        +LocalDateTime trainingDate
        +boolean isDeployed
    }

    class RiskState {
        +Long id
        +String userId
        +Double dailyPnl
        +LocalDateTime lastLossTime
        +boolean circuitBreakerTripped
        +LocalDateTime lastReset
    }

    %% ── Trade Service: Core Services ────────────────────────────
    class UserContextService {
        +getCurrentUserId() String
        +getCurrentUser() UserProfile
        -extractFromJwt(Authentication) String
    }

    class TradeExecutionService {
        +processOpportunity(Opportunity, BotConfiguration) boolean
        -checkRiskLimits(BotConfiguration, RiskState) boolean
        -calculateLotSize(BotConfiguration, double) double
        -executeMt5Order(Opportunity, BotConfiguration) String
    }

    class TradeSyncService {
        +syncTrades(String userId) void
        -mapDealReasonToStatus(int reason) String
        -updateLivePositions(String userId, String mt5Url) void
    }

    class WalletService {
        +getWalletMetrics() WalletMetricsDTO
        +getLivePositions() List~Mt5Position~
        +getMarketOverview() List~MarketAssetOverviewDTO~
        +closeTrade(Long ticket) OrderResponse
        -getUserMt5Url(String userId) Optional~String~
    }

    class LabService {
        +startTraining(TrainingRequestDTO) String jobId
        +saveModel(Map result, String userId) TrainedModel
        +getTrainedModels(String userId) List~TrainedModel~
        +getActiveStrategies(String userId) List~ActiveStrategyDTO~
        -PYTHON_SERVICE_URL String "http://localhost:8002/lab/train"
    }

    class OpportunityScannerService {
        +scanForOpportunities() void
        -fetchAiSignal(String symbol, BotConfiguration) Opportunity
    }

    class SwingTradingService {
        +scanForSwingTrades() void
        -expireOldSignals() void
    }

    %% ── Trade Service: Controllers ──────────────────────────────
    class OpportunityController {
        +getOpportunities(page, size, symbol) Page~AiSignalDTO~
        +getTodaySwingSetups() List~AiSignalDTO~
        +getSwingHistory(page, size) Page~AiSignalDTO~
        +confirmOpportunity(Long id) ResponseEntity
        +triggerSwingScan() ResponseEntity
    }

    class TradeController {
        +getAllTrades(page, size, symbol) Page~Trade~
        +getLivePositions() List~Mt5Position~
        +syncTrades() ResponseEntity
    }

    class LabController {
        +startTraining(TrainingRequestDTO) ResponseEntity
        +saveModel(Map) ResponseEntity
        +getModels() List~TrainedModel~
        +getActiveStrategies() List~ActiveStrategyDTO~
    }

    class WalletController {
        +getWalletMetrics() WalletMetricsDTO
        +getLivePositions() List~Mt5Position~
        +getMarketOverview() List~MarketAssetOverviewDTO~
        +closeTrade(Long ticket) ResponseEntity
    }

    %% ── Python AI Lab Engine (service-ai-lab :8002) ─────────────
    class LabEngine {
        +run_optimization(symbol, dates, indicators, target_wr, n_trials, param_ranges) dict
        +predict(market_data, indicators, params, news_sentiment, asset_class) dict
        +fetch_data(symbol, start_date, end_date) DataFrame
        +backtest_strategy(df, params) tuple
        -COMMISSION_RATE = 0.0005
        -SLIPPAGE_RATE = 0.0001
    }

    class FusionArbiter {
        +judge(df, asset_class) dict
        -core_a ClassicalBrain
        -core_b SmartMoneyBrain
    }

    class ClassicalBrain {
        +analyze(df) dict
        -RSI window=14
        -MACD standard
        -EMA_50 EMA_200
    }

    class SmartMoneyBrain {
        +analyze(df) dict
        -detect_fvg(df) dict
        -detect_liquidity_sweep(df) dict
        -is_in_killzone(time) bool
        -LondonOpen 02:00–05:00 EST
        -NewYorkOpen 07:00–10:00 EST
    }

    %% ── Relationships ───────────────────────────────────────────
    WalletService --> BotConfiguration : reads config
    WalletService --> Trade : filters by userId
    TradeExecutionService --> Opportunity : processes
    TradeExecutionService --> BotConfiguration : applies risk rules
    TradeExecutionService --> RiskState : checks & updates
    TradeSyncService --> Trade : syncs from MT5
    LabService --> TrainedModel : persists
    LabService ..> LabEngine : REST POST /lab/train

    OpportunityController --> UserContextService : getCurrentUserId
    TradeController --> UserContextService : getCurrentUserId
    LabController --> LabService : delegates
    WalletController --> WalletService : delegates

    FusionArbiter --> ClassicalBrain : weight 30%
    FusionArbiter --> SmartMoneyBrain : weight 70%
    LabEngine --> FusionArbiter : predict()

    Opportunity "1" --> "0..*" Trade : generates
    BotConfiguration "1" --> "0..1" TrainedModel : uses
    UserContextService ..> User : identifies via JWT
```

---

## 4. Request Flow — Trade Execution

```mermaid
sequenceDiagram
    actor User
    participant FE as Angular :4200
    participant GW as API Gateway :8080
    participant AUTH as Auth Service :8085
    participant TRADE as Trade Service :8081
    participant AI as AI Engine :8000
    participant MT5 as MT5 Connector :5005
    participant DB as SQL Server :1434
    participant KAFKA as Kafka :9092
    participant NEWS as News Service :8086

    User->>FE: Login (email + password)
    FE->>GW: POST /api/auth/login
    GW->>AUTH: Forward request
    AUTH->>DB: SELECT user WHERE email = ?
    DB-->>AUTH: User entity
    AUTH-->>FE: JWT { sub: email, user_id: "42", exp }

    Note over NEWS,KAFKA: Background — Real-time News Flow
    NEWS->>KAFKA: Publish market.news (enriched article)
    KAFKA->>TRADE: Consume event (sentiment score)
    NEWS-->>FE: WebSocket STOMP /topic/news (HIGH priority → toast)

    Note over FE,MT5: Signal Discovery
    FE->>GW: GET /api/opportunities?page=0&size=20
    GW->>TRADE: Forward (extract user_id from JWT)
    TRADE->>AI: GET /predict?symbol=BTCUSD (live candles + sentiment)
    AI-->>TRADE: { signal: BUY, win_probability: 0.78, reasoning }
    TRADE->>DB: INSERT opportunity (userId scoped)
    DB-->>TRADE: Saved opportunity
    TRADE-->>FE: Page~AiSignalDTO~ (paginated)

    Note over User,DB: Manual Trade Confirmation
    User->>FE: Click "Confirm Trade" on signal
    FE->>GW: POST /api/opportunities/{id}/confirm
    GW->>TRADE: Forward (JWT userId)
    TRADE->>DB: SELECT risk_state WHERE userId = ?
    DB-->>TRADE: RiskState (dailyPnl, circuitBreaker)
    alt Risk Check Passed
        TRADE->>MT5: POST /trade/open { symbol, side, lots, sl, tp }
        MT5-->>TRADE: { ticket: 123456, result: "ok" }
        TRADE->>DB: INSERT trade (userId, ticket, entryPrice...)
        TRADE-->>FE: 200 "Trade Executed"
    else Risk Rejected (max trades / daily loss)
        TRADE-->>FE: 400 "Trade Rejected by Risk Engine"
    end
```

---

## 5. AI Lab — Backtest & Training Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Angular :4200
    participant GW as API Gateway :8080
    participant TRADE as Trade Service :8081
    participant LAB as AI Lab :8002
    participant YF as yfinance (Yahoo)
    participant DB as SQL Server :1434
    participant WS as WebSocket /topic/lab/progress

    User->>FE: Configure backtest (symbol, dates, engine, trials)
    FE->>GW: POST /api/lab/train { symbol, startDate, endDate, engineType, trials, param_ranges }
    GW->>TRADE: Forward
    TRADE->>WS: Push { progress: 10, message: "Connecting to Neuro-Quantum Engine..." }
    WS-->>FE: Progress update (live log panel)

    TRADE->>LAB: POST /lab/train (async thread)
    LAB->>YF: Download OHLCV data (symbol, date range)
    YF-->>LAB: DataFrame

    alt engineType == OPTUNA (Golden Confluence)
        loop N trials (max 50)
            LAB->>LAB: Sample random params (ADX, EMA, RSI, ATR multipliers)
            LAB->>LAB: backtest_strategy(df, params)
            LAB->>LAB: Score = CalmarRatio × WinRate
        end
        LAB-->>TRADE: { winRate, totalReturn, maxDrawdown, equityCurve, bestParams }
    else engineType == XGBOOST
        LAB->>LAB: Feature engineering (RSI, MACD, ATR, Bollinger...)
        LAB->>LAB: Train XGBoost multi-class classifier (BUY/SELL/HOLD)
        LAB->>LAB: Walk-forward backtest
        LAB-->>TRADE: { winRate, totalReturn, equityCurve, featureImportance }
    end

    TRADE->>WS: Push { progress: 100, result: { equityCurve, winRate, bestParams... } }
    WS-->>FE: Final result — render equity curve chart + stats

    User->>FE: Click "Save & Deploy"
    FE->>GW: POST /api/lab/save { ...result, name: "My BTC Strategy" }
    GW->>TRADE: Forward
    TRADE->>DB: INSERT trained_models (userId, symbol, parameters, metrics, isDeployed=true)
    DB-->>TRADE: TrainedModel { id: 7 }
    TRADE-->>FE: { id: 7, name: "My BTC Strategy" }
    FE->>FE: Reload model list — strategy now selectable in BotConfiguration
```

---

## 6. Role & Access Control Diagram

### 6a. Role Hierarchy & Permissions

```mermaid
graph TB
    subgraph ROLES["Roles (User.Role enum)"]
        USER["👤 USER\nDefault on registration"]
        ADMIN["🛡️ ADMIN\nSet manually in DB"]
    end

    subgraph AUTH_ENDPOINTS["Auth Service :8085 — Public Endpoints\n(permitAll — no JWT required)"]
        R1["POST /api/auth/register"]
        R2["POST /api/auth/login"]
        R3["POST /api/auth/refresh"]
    end

    subgraph USER_ENDPOINTS["Auth Service :8085 — User Endpoints\n(Any authenticated user)"]
        U1["PUT /api/users/profile\nUpdate own username / password"]
    end

    subgraph ADMIN_ENDPOINTS["Auth Service :8085 — Admin Endpoints\n(@PreAuthorize hasAuthority('ADMIN'))"]
        A1["GET /api/admin/stats\nPlatform KPIs: users, trades 24h, net PnL"]
        A2["GET /api/admin/users\nFull user list with win rate & P&L"]
        A3["PUT /api/admin/users/{id}/ban\nToggle active flag — ban / unban"]
        A4["PUT /api/admin/users/{id}/subscription\nSet plan: FREE | PRO · status: ACTIVE | FAILED | TRIAL"]
        A5["PUT /api/admin/users/{id}/reset-usage\nReset dataUsage counter to 0"]
    end

    subgraph TRADE_ENDPOINTS["Trade Service :8081 — User Endpoints\n(Any authenticated user — userId scoped)"]
        T1["GET /api/opportunities\nPaginated AI signals for own userId"]
        T2["POST /api/opportunities/{id}/confirm\nExecute trade via risk engine"]
        T3["GET /api/swing/today · /swing/history\nSwing setups scoped to own userId"]
        T4["GET /api/trades\nTrade history for own userId"]
        T5["GET /api/wallet/metrics · /wallet/positions\nLive MT5 data via own bot config"]
        T6["POST /api/lab/train\nStart backtest job (async)"]
        T7["POST /api/lab/save · GET /api/lab/models\nSave & list own trained models"]
        T8["GET /api/bot-configuration\nPOST · PUT own bot config"]
    end

    subgraph TRADE_ADMIN_ENDPOINTS["Trade Service :8081 — Admin Endpoint\n(No role check — called only internally by Auth Service)"]
        TA1["GET /api/admin/trade-stats\nAggregate trades24h, platformNetPnl, symbolBreakdown"]
    end

    USER -- "JWT Bearer token" --> USER_ENDPOINTS
    USER -- "JWT Bearer token" --> TRADE_ENDPOINTS
    ADMIN -- "JWT Bearer token" --> USER_ENDPOINTS
    ADMIN -- "JWT Bearer token" --> TRADE_ENDPOINTS
    ADMIN -- "JWT Bearer token\nAuthority = ADMIN" --> ADMIN_ENDPOINTS

    ADMIN_ENDPOINTS -- "Internal REST call\nhttp://localhost:8081" --> TRADE_ADMIN_ENDPOINTS
```

---

### 6b. JWT Authentication Filter Chain

```mermaid
sequenceDiagram
    actor Client as Browser / Angular
    participant GW as API Gateway :8080
    participant AUTH as Auth Service :8085\nJwtAuthenticationFilter
    participant CTRL as Controller\n(any service)

    Client->>GW: Request + Authorization: Bearer <token>
    GW->>AUTH: Forward (all /api/** routes)

    Note over AUTH: JwtAuthenticationFilter (OncePerRequestFilter)
    AUTH->>AUTH: Extract token from Authorization header
    AUTH->>AUTH: jwtService.extractUsername(token) → email
    AUTH->>AUTH: userDetailsService.loadUserByUsername(email) → User entity

    alt Token valid & user active
        AUTH->>AUTH: Set SecurityContext\nUsernamePasswordAuthenticationToken\n{ principal: User, authorities: [ROLE] }
        AUTH->>CTRL: Continue filter chain

        alt Endpoint requires ADMIN
            CTRL->>CTRL: @PreAuthorize hasAuthority('ADMIN')\nchecks User.role == ADMIN
            alt Is ADMIN
                CTRL-->>Client: 200 OK + data
            else Is USER
                CTRL-->>Client: 403 Forbidden
            end
        else Endpoint requires any authenticated user
            CTRL-->>Client: 200 OK + data (userId-scoped)
        end

    else Token expired or invalid
        AUTH-->>Client: 403 Forbidden (filter short-circuits)
    else User is banned (active = false)
        AUTH-->>Client: 403 Forbidden (isAccountNonLocked = false)
    end
```

---

### 6c. Admin Dashboard — Data Flow

```mermaid
graph LR
    subgraph FE["Angular Admin Dashboard"]
        AD["AdminDashboardComponent\n/admin route\nRole guard: ADMIN only"]
        AS["AdminService\nHTTP calls"]
    end

    subgraph AUTH["Auth Service :8085"]
        AC["AdminController\n@PreAuthorize ADMIN"]
        ASS["AdminStatsService"]
        UR["UserRepository\nSQL Server"]
    end

    subgraph TRADE["Trade Service :8081"]
        TAS["GET /api/admin/trade-stats\nAggregate by userId, symbol, 24h window"]
    end

    AD -- "loadData()" --> AS
    AS -- "GET /api/admin/stats" --> AC
    AS -- "GET /api/admin/users" --> AC
    AS -- "GET /api/admin/crowd-signals" --> AC
    AS -- "PUT /api/admin/users/{id}/ban" --> AC
    AS -- "PUT /api/admin/users/{id}/subscription" --> AC
    AS -- "PUT /api/admin/users/{id}/reset-usage" --> AC

    AC --> ASS
    ASS -- "count(), countByActiveTrue()\ncountBySubscriptionPlan()\ngetUserGrowthSince(30d)" --> UR
    ASS -- "Internal REST\nhttp://localhost:8081/api/admin/trade-stats" --> TAS

    AC -- "AdminStatsDTO\n{ totalUsers, activeUsers, bannedUsers\nproSubs, freeSubs, trialSubs\ntrades24h, platformNetPnl\nuserGrowth[], symbolBreakdown[] }" --> AS
    AC -- "List~AdminUserDTO~\n{ id, username, email\nisActive, subscriptionPlan\npaymentStatus, dataUsage\nrole, winRate, totalProfit }" --> AS
    AS --> AD

    subgraph WIDGETS["Dashboard Widgets"]
        W1["KPI Cards\nTotal · Active · Banned users\n24h Trades · Platform PnL · PRO count"]
        W2["User Growth Chart\nApexCharts Area — last 30 days"]
        W3["Favorite Pairs Chart\nApexCharts Donut — by trade volume"]
        W4["Crowd Signals\nTop 3 winning-trader consensus\nBUY/SELL % with progress bar"]
        W5["User Management Table\nSearch · Ban · Upgrade · Reset · Mark Failed"]
    end

    AD --> WIDGETS
```
