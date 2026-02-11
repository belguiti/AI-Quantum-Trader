from fastapi import FastAPI, BackgroundTasks
import uvicorn
import requests
import random
import time
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configuration
GATEWAY_URL = "http://localhost:8080/api/trades"
SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD"]
ACTIONS = ["BUY", "SELL"]

running = False

async def trading_loop():
    """Background task that generates random trades."""
    global running
    logger.info("AI Trading Engine Started...")
    
    while running:
        try:
            # 1. Generate Signal
            symbol = random.choice(SYMBOLS)
            action = random.choice(ACTIONS)
            price = round(random.uniform(20000, 60000) if "BTC" in symbol else random.uniform(1000, 4000), 2)
            quantity = round(random.uniform(0.1, 2.0), 4)

            trade_data = {
                "symbol": symbol,
                "action": action,
                "price": price,
                "quantity": quantity,
                "status": "EXECUTED" # Auto-execute for now
            }

            # 2. Send to Trade Service via Gateway
            logger.info(f"Generated Signal: {action} {quantity} {symbol} @ ${price}")
            
            try:
                response = requests.post(GATEWAY_URL, json=trade_data)
                if response.status_code == 200:
                    logger.info(f"Trade Executed Successfully: {response.json()['id']}")
                else:
                    logger.error(f"Trade Failed: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                 logger.error(f"Connection Failed: Could not reach Gateway at {GATEWAY_URL}")

        except Exception as e:
            logger.error(f"Error in trading loop: {e}")

        # Wait for next trade
        await asyncio.sleep(5)  # Trade every 5 seconds

@app.get("/")
def read_root():
    return {"message": "AI Quantum Trader Engine Running"}

@app.post("/start")
async def start_trading(background_tasks: BackgroundTasks):
    global running
    if not running:
        running = True
        background_tasks.add_task(trading_loop)
        return {"message": "Trading started"}
    return {"message": "Trading already running"}

@app.post("/stop")
def stop_trading():
    global running
    running = False
    return {"message": "Trading stopped"}

@app.get("/health")
def health_check():
    return {"status": "UP"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
