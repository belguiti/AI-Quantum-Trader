from swing_analyzer import analyze_swing, fetch_data
import logging

try:
    # Test fetch directly to see dates
    df = fetch_data("BTCUSD", period="730d", interval="1d")
    print(f"Latest Data Point: {df.index[-1]}")
    print(f"Latest Close: {df['Close'].iloc[-1]}")
    
    result = analyze_swing("BTCUSD")
    print(result)
except Exception as e:
    print(f"Error: {e}")
