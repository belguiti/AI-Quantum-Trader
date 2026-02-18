import pandas_ta as ta
import yfinance as yf
import pandas as pd
import numpy as np

def fetch_data(symbol: str, period: str = "730d", interval: str = "1d"):
    """
    Fetch data from yfinance.
    Adapts symbol format if needed (e.g. BTCUSD -> BTC-USD).
    """
    ticker = symbol
    
    # Yahoo Finance Ticker Mapping
    MAPPING = {
        "GBPUSD": "GBPUSD=X",
        "EURUSD": "EURUSD=X",
        "USDJPY": "USDJPY=X",
        "XAUUSD": "XAUUSD=X", # Gold Spot
        "BTCUSD": "BTC-USD",
        "ETHUSD": "ETH-USD",
        "SOLUSD": "SOL-USD",
        "XRPUSD": "XRP-USD"
    }
    
    if ticker in MAPPING:
        ticker = MAPPING[ticker]
    elif not "-" in ticker and (ticker.endswith("USD") or ticker.endswith("USDT")):
        ticker = f"{ticker[:-3]}-{ticker[-3:]}"
    
    df = yf.download(ticker, period=period, interval=interval, progress=False)
    if df.empty:
        raise ValueError(f"No data found for {ticker}")
    
    # Handle MultiIndex columns (yfinance v0.2+)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
        
    return df

def detect_support_resistance(df: pd.DataFrame, window=20):
    """
    Simple local min/max detection for S/R levels.
    Returns list of price levels.
    """
    # Use 'Close' or 'Low'/'High'
    # Defaulting to Close to keep it simple for now, or High/Low for precision
    highs = df['High']
    lows = df['Low']
    
    levels = []
    
    # Vectorized local min/max would be faster, but rolling apply is easier to read
    # For Swing, we want 'major' levels, so we look at 2-year data (D1)
    
    # We can use pivot points or fractal logic
    # Let's use a rolling window to find local extrema
    
    # Local Lows
    # A point is a local low if it's the min of its window
    # shift(-window) is future, so we look at center
    
    # Heuristic: simple major levels
    # Let's just return key psychological levels and 200 SMA for now as dynamic support
    
    return []

def analyze_swing(symbol: str):
    try:
        # 1. Fetch Daily Data (2 Years)
        df_d1 = fetch_data(symbol, period="730d", interval="1d")
        
        # 2. Fetch H4 Data (60 Days)
        # yfinance H4 is tricky, usually it gives 1h. We can resample 1h -> 4h.
        df_h1 = fetch_data(symbol, period="60d", interval="1h")
        df_h4 = df_h1.resample("4h").agg({
            'Open': 'first',
            'High': 'max',
            'Low': 'min',
            'Close': 'last',
            'Close': 'last'
        }).dropna()
        
        # 3. Trend Analysis (D1)
        # SMA 200
        df_d1.ta.sma(length=200, append=True) # Creates SMA_200 column

        
        current_date = df_d1.index[-1]
        current_close = df_d1['Close'].iloc[-1]
        debug_msg = f"DEBUG: Analyzing {symbol} at {current_date} Price: {current_close}\n"
        print(debug_msg)
        with open("debug_log.txt", "a") as f:
            f.write(debug_msg)
        
        sma_200 = df_d1['SMA_200'].iloc[-1]
        
        trend = "UP" if current_close > sma_200 else "DOWN"
        
        # 4. Pattern Recognition (D1)
        # Placeholder for complex pattern rec (Head & Shoulders)
        # For now, we check for simple "Pullback to SMA"
        
        signal_type = "NEUTRAL"
        reason = []
        
        dist_to_sma = (current_close - sma_200) / sma_200
        
        if trend == "UP":
            reason.append("Price is above 200-day SMA (Bullish Trend).")
            # Check for pullback (within 5% of SMA)
            if 0 < dist_to_sma < 0.05:
                reason.append("Price pulled back to near SMA200 support.")
                signal_type = "SWING_LONG"
        
        elif trend == "DOWN":
            reason.append("Price is below 200-day SMA (Bearish Trend).")
             # Check for pullback (within 5% of SMA from below)
            if -0.05 < dist_to_sma < 0:
                reason.append("Price rallied to near SMA200 resistance.")
                signal_type = "SWING_SHORT"
                
        # 5. H4 Confirmation (RSI)
        df_h4.ta.rsi(length=14, append=True)
        rsi_h4 = df_h4['RSI_14'].iloc[-1]
        
        if signal_type == "SWING_LONG":
            if rsi_h4 < 30:
                reason.append("H4 RSI is Oversold (Bullish Divergence potential).")
            elif rsi_h4 > 70:
                signal_type = "NEUTRAL" # Don't buy at top
                reason.append("H4 RSI Overbought - Waiting for reset.")
        
        # Construct Response
        entry_zone = f"{current_close * 0.99:.2f} - {current_close * 1.01:.2f}"
        stop_loss = f"{current_close * 0.95:.2f}"
        take_profit = f"{current_close * 1.15:.2f}" # 1:3 RR approx
        
        return {
            "symbol": symbol,
            "signalType": signal_type,
            "trend": trend,
            "entryZone": entry_zone,
            "stopLoss": stop_loss,
            "takeProfit": take_profit,
            "reasoning": " ".join(reason)
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Test
    print(analyze_swing("BTCUSD"))
