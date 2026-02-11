# AI-Quantum Trader 🚀📉

A next-generation trading platform powered by **Spring AI**, **Kafka**, **Redis**, and **Angular 17+**.
This system aggregates real-time news, analyzes market sentiment using LLMs (OpenAI), and delivers high-performance trading signals via a reactive dashboard.

---

## 🏗️ Architecture

### **Backend Microservices**
- **News Service**: Aggregates RSS/Social feeds, enriches data with AI, and pushes to Kafka.
- **Trading Engine** (Planned): Executes orders based on signals.
- **Portoflio Service** (Planned): Manages user assets.

### **Tech Stack**
- **Java 17 / Spring Boot 3.2**: Core backend framework.
- **Spring AI**: LLM integration for Sentiment/Categorization.
- **Apache Kafka**: Event-driven architecture (`market.news` topic).
- **Redis**: High-speed caching for "Smart Feeds" and timelines.
- **WebSockets (STOMP)**: Real-time data push to frontend.
- **Docker Compose**: Orchestration for Kafka, Zookeeper, Redis, SQL Server.

### **Frontend**
- **Angular 17+**: Standalone Components, Signals, RxJS.
- **TailwindCSS**: Modern, responsive styling.
- **ApexCharts** / **Lightweight Charts**: Financial visualization.

---

## ⚡ Features

### **1. Real-Time News Intelligence**
- **Multi-Source Fetching**: Yahoo Finance, CoinDesk, Reddit (Simulated).
- **AI Analysis**:
  - **Sentiment**: BULLISH 🟢, BEARISH 🔴, NEUTRAL ⚪.
  - **Priority**: HIGH (Major Impact), MEDIUM, LOW.
  - **Categorization**: MARKET, CRYPTO, FINANCE, REAL_ESTATE.
- **Smart Feed Algorithm**:
  - Displays **80% High Priority** news to cut through noise.
  - Uses Redis Lists for efficient pagination and sorting.
- **Instant Alerts**:
  - **WebSockets** push new articles instantly.
  - **Global Toasts** alert users of High-Priority market-moving news.

---

## 🚀 Getting Started

### **Prerequisites**
- Java 17+
- Node.js 18+
- Docker & Docker Compose

### **1. Infrastructure (Docker)**
Start the required services (Kafka, Redis, SQL Server):
```powershell
./start-all.ps1
# OR
docker-compose up -d
```

### **2. Backend (News Service)**
Configure your OpenAI API Key in `news-service/src/main/resources/application.properties` (or env var `OPENAI_API_KEY`).

Run the service:
```powershell
./run-news.ps1
```

### **3. Frontend (Angular)**
Navigate to the frontend directory and start the dev server:
```bash
cd frontend
npm install
ng serve
```
Visit **http://localhost:4200/news** to see the dashboard.

---

## 🛠️ Development

### **Key Scripts**
- `Action: Compile Backend` -> `./fix-build.ps1`
- `Action: Infrastructure` -> `./start-all.ps1`
- `Action: Run News Service` -> `./run-news.ps1`

### **Project Structure**
```
ai-quantum-trader/
├── news-service/           # Spring Boot Backend
│   ├── src/main/java/com/aiquantum/news/
│   │   ├── service/        # Business Logic (AI, Fetcher, SmartFeed)
│   │   ├── controller/     # REST & WebSocket Endpoints
│   │   └── config/         # App Config (Kafka, Redis, AI)
├── frontend/               # Angular Frontend
│   ├── src/app/
│   │   ├── components/     # UI Components (NewsDashboard, Toast)
│   │   ├── services/       # Services (WebSocket, News, Toast)
│   │   └── models/         # TypeScript Interfaces
├── docker-compose.yml      # Infrastructure Setup
└── README.md               # You are here!
```

---

## 🤝 Contributing
1. Fork the repo.
2. Create a feature branch.
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

## 📄 License
MIT
