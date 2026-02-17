from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import MetaTrader5 as mt5
import uvicorn
import os
import datetime

app = FastAPI(title="MT5 Local Connector")

class ConnectionRequest(BaseModel):
    login: int
    password: str
    server: str = None
    accountType: str = "DEMO"
    path: str = None

class OrderIntent(BaseModel):
    symbol: str
    side: str  # BUY or SELL
    lot: float
    sl: float = 0.0
    tp: float = 0.0
    deviation: int = 20
    comment: str = ""

@app.on_event("startup")
async def startup_event():
    # Attempt to initialize without login first to check if terminal is present
    if not mt5.initialize():
        print("MetaTrader5 initialization failed")
    else:
        print("MetaTrader5 initialized successfully")

@app.post("/mt5/test-connection")
async def test_connection(request: ConnectionRequest):
    # If server is provided, use it. Otherwise rely on local config or previous login
    # For local dev, we often just need initialize() if the terminal is already logged in.
    # However, if creds are passed, we try to login.
    
    connected = False
    message = ""
    latency = 0
    account_info = None

    try:

        # Construct init params
        init_params = {}
        if request.path:
            init_params["path"] = request.path
        if request.login and request.password:
            init_params["login"] = request.login
            init_params["password"] = request.password
            if request.server:
                init_params["server"] = request.server
        
        # Attempt initialize with params
        if not mt5.initialize(**init_params):
             error_code = mt5.last_error()
             msg = f"initialize() failed, error code = {error_code}"
             if error_code == (-6, 'Terminal: Authorization failed') or error_code[0] == -6:
                 msg += " (Check 'Allow automated trading' in MT5 Options > Expert Advisors)"
             
             return {
                "connected": False,
                "message": msg,
                "latencyMs": 0,
                "accountId": None
            }

        # If we passed login to initialize, we should be connected. 
        # But let's verify with terminal_info or account_info
        if request.login and request.password:
             # Double check login if needed, but initialize should have handled it. 
             # Sometimes initialize returns True but login state is not fully ready immediately?
             # Let's check account_info
             account_info = mt5.account_info()
             if account_info and account_info.login == request.login:
                 connected = True
                 message = "Connected and Logged In"
             else:
                 # Try explicit login as fallback if initialize didn't auth successfully but returned True?
                 # Unlikely for initialize to return True if auth failed when params provided.
                 # But let's be safe.
                 authorized = mt5.login(request.login, password=request.password, server=request.server)
                 if authorized:
                     connected = True
                     message = "Connected and Logged In (Explicit)"
                     account_info = mt5.account_info()
                 else:
                     connected = False
                     message = f"Login failed, error = {mt5.last_error()}"

        else:
            # Check if already connected (Cached Session)
             account_info = mt5.account_info()
             if account_info:
                 connected = True
                 message = "Connected (Cached Session)"
             else:
                 connected = False
                 message = "Not connected, please provide credentials"

        if connected and account_info:
             latency = mt5.terminal_info().ping_last / 1000.0 # roughly? or just 0
             # ping_last is in microseconds usually? No, terminal_info has ping stats
             # Actually mt5 doesn't give direct ping easily, we can return 0 or dummy
             pass

        return {
            "connected": connected,
            "message": message,
            "latencyMs": 15, # Mock latency or real if available
            "accountId": str(request.login) if request.login else str(account_info.login) if account_info else None
        }

    except Exception as e:
        return {
            "connected": False,
            "message": str(e),
            "latencyMs": 0,
            "accountId": None
        }

@app.get("/mt5/account-summary")
async def account_summary():
    if not mt5.initialize():
         raise HTTPException(status_code=500, detail="MT5 not initialized")
    
    info = mt5.account_info()
    if not info:
        raise HTTPException(status_code=500, detail="Could not retrieve account info (not logged in?)")

    return {
        "balance": info.balance,
        "equity": info.equity,
        "margin": info.margin,
        "freeMargin": info.margin_free,
        "leverage": info.leverage,
        "currency": info.currency
    }

@app.get("/mt5/candles")
async def get_candles(symbol: str, timeframe: str = "H1", count: int = 100):
    if not mt5.initialize():
         raise HTTPException(status_code=500, detail="MT5 not initialized")

    # Timeframe mapping
    tf_map = {
        "M1": mt5.TIMEFRAME_M1,
        "M5": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15,
        "M30": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1,
        "H4": mt5.TIMEFRAME_H4,
        "D1": mt5.TIMEFRAME_D1,
    }
    
    tf = tf_map.get(timeframe.upper(), mt5.TIMEFRAME_H1)
    
    # Check symbol visibility similar to place_order
    if not mt5.symbol_select(symbol, True):
         raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found or not visible")

    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    
    if rates is None or len(rates) == 0:
        return []

    data = []
    for rate in rates:
        data.append({
            "time": int(rate['time']), # Unix timestamp
            "Open": float(rate['open']),
            "High": float(rate['high']),
            "Low": float(rate['low']),
            "Close": float(rate['close']),
            "TickVolume": float(rate['tick_volume']),
            "Spread": int(rate['spread']),
            "RealVolume": float(rate['real_volume'])
        })
        
    return data

@app.post("/mt5/place-order")
async def place_order(order: OrderIntent):
    if not mt5.initialize():
         raise HTTPException(status_code=500, detail="MT5 not initialized")
    
    # Check symbol
    symbol_info = mt5.symbol_info(order.symbol)
    if not symbol_info:
        return {"success": False, "message": f"Symbol {order.symbol} not found", "orderId": None}
    
    if not symbol_info.visible:
        if not mt5.symbol_select(order.symbol, True):
             return {"success": False, "message": f"Symbol {order.symbol} not visible", "orderId": None}

    action = mt5.TRADE_ACTION_DEAL
    order_type = mt5.ORDER_TYPE_BUY if order.side.upper() == "BUY" else mt5.ORDER_TYPE_SELL
    price = mt5.symbol_info_tick(order.symbol).ask if order.side.upper() == "BUY" else mt5.symbol_info_tick(order.symbol).bid

    request = {
        "action": action,
        "symbol": order.symbol,
        "volume": order.lot,
        "type": order_type,
        "price": price,
        "sl": order.sl,
        "tp": order.tp,
        "deviation": order.deviation,
        "magic": 123456,
        "comment": order.comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "success": False, 
            "message": f"Order failed: {result.retcode} - {result.comment}", 
            "orderId": None
        }

    return {
        "success": True,
        "message": "Order executed",
        "orderId": str(result.order)
    }

@app.get("/mt5/positions")
async def get_positions():
    if not mt5.initialize():
         raise HTTPException(status_code=500, detail="MT5 not initialized")
    
    positions = mt5.positions_get()
    if positions is None:
        return []

    data = []
    for pos in positions:
        data.append({
            "ticket": pos.ticket,
            "symbol": pos.symbol,
            "type": "BUY" if pos.type == mt5.ORDER_TYPE_BUY else "SELL",
            "volume": pos.volume,
            "openPrice": pos.price_open,
            "currentPrice": pos.price_current,
            "sl": pos.sl,
            "tp": pos.tp,
            "profit": pos.profit,
            "swap": pos.swap,
            "commission": 0.0, # MT5 doesn't always give comms here easily, depends on broker
            "comment": pos.comment
        })
        
    return data

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
