import pandas as pd
import ta
import optuna
import logging
import yfinance as yf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LabEngine:
    def __init__(self):
        pass

    def fetch_data(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        """Fetch historical data from yfinance"""
        logger.info(f"Fetching data for {symbol} from {start_date} to {end_date}")
        # Adjust symbol for Yahoo Finance if needed (e.g., BTC/USDT -> BTC-USD)
        yf_symbol = symbol.replace("/", "-")
        if "USDT" in yf_symbol and not "-" in yf_symbol:
             yf_symbol = yf_symbol.replace("USDT", "-USD")
        
        df = yf.download(yf_symbol, start=start_date, end=end_date, progress=False)
        if df.empty:
            raise ValueError(f"No data found for {symbol}")
        
        # Ensure flat columns if MultiIndex (yfinance update)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        return df

    def add_indicators(self, df: pd.DataFrame, indicators: list) -> pd.DataFrame:
        """Feature Engineering: RSI, MACD, Fibonacci"""
        df = df.copy()
        
        # RSI
        if "RSI" in indicators or True: # Always calc basic ones for now
            df['RSI_14'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()
            
        # MACD
        if "MACD" in indicators or True:
            macd = ta.trend.MACD(df['Close'])
            df['MACD_12_26_9'] = macd.macd()
            df['MACD_h_12_26_9'] = macd.macd_diff()
            df['MACD_s_12_26_9'] = macd.macd_signal()
            
        # Fibonacci Levels (Simplified: Last 100 candles Swing High/Low)
        # Note: In a real streaming calc, this would be dynamic.
        # Here we calculate it rolling or for the window.
        # Let's simple rolling max/min for dynamic fibo
        period = 50
        df['Roll_High'] = df['High'].rolling(window=period).max()
        df['Roll_Low'] = df['Low'].rolling(window=period).min()
        df['Range'] = df['Roll_High'] - df['Roll_Low']
        
        df['Fibo_0.618'] = df['Roll_High'] - (df['Range'] * 0.618)
        df['Fibo_0.5'] = df['Roll_High'] - (df['Range'] * 0.5)
        df['Fibo_0.382'] = df['Roll_High'] - (df['Range'] * 0.382)
        
        df.dropna(inplace=True)
        return df

    def backtest_strategy(self, df: pd.DataFrame, rsi_buy: int, rsi_sell: int, stop_loss_pct: float, take_profit_pct: float):
        """
        Simple Vectorized or Event-driven Backtest.
        For Optuna speed, we iterate but keep it simple.
        Logic: 
          BUY if RSI < rsi_buy
          SELL if RSI > rsi_sell (or TP/SL hit)
        """
        balance = 10000.0
        position = 0 # 0: None, 1: Long
        entry_price = 0.0
        trades = []
        equity_curve = []
        
        # Get column index for speed
        # Assuming OHLCV and indicators present
        # 'RSI_14' is default name from pandas_ta
        
        closes = df['Close'].values
        lows = df['Low'].values
        highs = df['High'].values
        rsis = df['RSI_14'].values
        times = df.index
        
        for i in range(len(df)):
            current_price = closes[i]
            current_time = str(times[i])
            current_rsi = rsis[i]
            
            # Check Exit (SL/TP) if in position
            if position == 1:
                # Check Stop Loss
                sl_price = entry_price * (1 - stop_loss_pct/100)
                tp_price = entry_price * (1 + take_profit_pct/100)
                
                # Check if Low hit SL
                if lows[i] <= sl_price:
                    exit_price = sl_price
                    pnl = (exit_price - entry_price) / entry_price
                    balance = balance * (1 + pnl)
                    position = 0
                    trades.append({'side': 'SELL', 'pnl': pnl, 'reason': 'SL'})
                # Check if High hit TP
                elif highs[i] >= tp_price:
                    exit_price = tp_price
                    pnl = (exit_price - entry_price) / entry_price
                    balance = balance * (1 + pnl)
                    position = 0
                    trades.append({'side': 'SELL', 'pnl': pnl, 'reason': 'TP'})
                # Check RSI Overbought Exit (Strategy specific)
                elif current_rsi > rsi_sell:
                    exit_price = current_price
                    pnl = (exit_price - entry_price) / entry_price
                    balance = balance * (1 + pnl)
                    position = 0
                    trades.append({'side': 'SELL', 'pnl': pnl, 'reason': 'RSI_EXIT'})
            
            # Check Entry
            elif position == 0:
                if current_rsi < rsi_buy:
                    position = 1
                    entry_price = current_price
                    trades.append({'side': 'BUY', 'price': entry_price})
            
            equity_curve.append({'time': current_time, 'value': balance})
            
        return balance, trades, equity_curve

    def run_optimization(self, symbol: str, start_date: str, end_date: str, indicators: list, target_win_rate: float, n_trials: int = 50, param_ranges: dict = None):
        # 1. Fetch & Prep Data
        df = self.fetch_data(symbol, start_date, end_date)
        df = self.add_indicators(df, indicators)
        
        best_result = None
        best_win_rate = 0.0
        
        # Default ranges if not provided
        ranges = {
            'rsi_buy_min': 15, 'rsi_buy_max': 60,
            'rsi_sell_min': 40, 'rsi_sell_max': 85,
            'sl_min': 0.5, 'sl_max': 5.0,
            'tp_min': 0.5, 'tp_max': 15.0
        }
        if param_ranges:
            ranges.update(param_ranges)

        def objective(trial):
            # Define Parameter Space - Dynamic Ranges
            rsi_buy = trial.suggest_int('rsi_buy', int(ranges['rsi_buy_min']), int(ranges['rsi_buy_max'])) 
            rsi_sell = trial.suggest_int('rsi_sell', int(ranges['rsi_sell_min']), int(ranges['rsi_sell_max']))
            
            sl = trial.suggest_float('stop_loss', float(ranges['sl_min']), float(ranges['sl_max']))
            tp = trial.suggest_float('take_profit', float(ranges['tp_min']), float(ranges['tp_max']))
            
            # Run Backtest
            final_balance, trades, _ = self.backtest_strategy(df, rsi_buy, rsi_sell, sl, tp)
            
            # Metrics
            completed_trades = [t for t in trades if 'pnl' in t]
            trade_count = len(completed_trades)
            
            if trade_count < 10: # Minimum threshold (lowered for short tests)
                return 0.0 
                
            wins = len([t for t in completed_trades if t['pnl'] > 0])
            win_rate = wins / trade_count
            
            # Objective: Maximize WinRate * Return * TradeFrequencyBonus
            total_return = (final_balance - 10000.0) / 10000.0
            
            # Store 'best' for returning later (side effect)
            nonlocal best_result, best_win_rate
            # Prefer strategies with more trades if win rate is comparable
            idx_score = win_rate * (1 + total_return) * (trade_count / 100)
            
            if win_rate > best_win_rate and trade_count > 20:
                best_win_rate = win_rate
            
            return idx_score

        # 2. Run Optuna
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials)
        
        # 3. Get Best Params & Re-run for full details
        best_params = study.best_params
        final_balance, trades, equity_curve = self.backtest_strategy(
            df, 
            best_params['rsi_buy'], 
            best_params['rsi_sell'], 
            best_params['stop_loss'], 
            best_params['take_profit']
        )
        
        completed_trades = [t for t in trades if 'pnl' in t]
        win_rate = 0.0
        if completed_trades:
            wins = len([t for t in completed_trades if t['pnl'] > 0])
            win_rate = wins / len(completed_trades)
        
        total_return = (final_balance - 10000.0) / 10000.0
        
        # Calculate Max Drawdown
        # ... simplified
        peak = 10000.0
        max_dd = 0.0
        for p in equity_curve:
            val = p['value']
            if val > peak: peak = val
            dd = (peak - val) / peak
            if dd > max_dd: max_dd = dd

        # Sanitize NaNs for JSON compliance
        import math
        def clean(val):
            if isinstance(val, float):
                if math.isnan(val) or math.isinf(val):
                    return 0.0
            return val

        return {
            "totalTrades": len(completed_trades),
            "winRate": clean(win_rate),
            "totalReturn": clean(total_return),
            "maxDrawdown": clean(max_dd),
            "equityCurve": [{
                'time': p['time'], 
                'value': clean(p['value'])
            } for i, p in enumerate(equity_curve) if i % 10 == 0], 
            "bestParams": best_params,
            "symbol": symbol
        }

    def predict(self, market_data: list, indicators: list, params: dict, news_sentiment: float = 0.0) -> dict:
        """
        Real-time inference with Explainable AI (XAI) features.
        """
        if not market_data:
            return {"signal": "HOLD", "confidence": 0.0, "reason": "No Data"}

        df = pd.DataFrame(market_data)
        cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        for c in cols:
            df[c] = pd.to_numeric(df[c])
            
        df = self.add_indicators(df, indicators)
        
        if df.empty:
            return {"signal": "HOLD", "confidence": 0.0, "reason": "Not enough data"}
            
        latest = df.iloc[-1]
        prev = df.iloc[-2]
        
        # --- Technical Logic ---
        rsi_buy = params.get('rsi_buy', 30)
        rsi_sell = params.get('rsi_sell', 70)
        current_rsi = latest['RSI_14']
        current_price = latest['Close']
        
        # Calculate Support/Resistance (Simple: Recent Lows/Highs of last 50 periods)
        recent_low = df['Low'].tail(50).min()
        recent_high = df['High'].tail(50).max()
        
        is_near_support = abs(current_price - recent_low) / current_price < 0.02 # Within 2%
        is_near_resistance = abs(current_price - recent_high) / current_price < 0.02
        
        signal = "HOLD"
        confidence = 0.0
        reasons = []

        # 1. RSI Logic
        if current_rsi < rsi_buy:
            reasons.append(f"RSI Oversold ({current_rsi:.1f} < {rsi_buy}) indicating potential reversal")
            confidence += 0.4
            signal = "BUY"
        elif current_rsi > rsi_sell:
            reasons.append(f"RSI Overbought ({current_rsi:.1f} > {rsi_sell}) indicating pullback risk")
            confidence += 0.4
            signal = "SELL"
            
        # 2. Support/Resistance Logic
        if is_near_support and signal == "BUY":
            reasons.append(f"Price bounced off major Support level at ${recent_low:.2f}")
            confidence += 0.2
        elif is_near_resistance and signal == "SELL":
            reasons.append(f"Price rejected at key Resistance level of ${recent_high:.2f}")
            confidence += 0.2

        # 3. News Sentiment Logic
        # Normalize sentiment (-1.0 to 1.0)
        if news_sentiment > 0.2:
            reasons.append(f"Positive Market Sentiment (Score: {news_sentiment:.2f}) from global news")
            if signal == "BUY": confidence += 0.2
            elif signal == "HOLD": 
                signal = "BUY" # Sentiment can trigger entry
                confidence = 0.5
        elif news_sentiment < -0.2:
            reasons.append(f"Negative Market Sentiment (Score: {news_sentiment:.2f}) driving bearish pressure")
            if signal == "SELL": confidence += 0.2
            elif signal == "HOLD":
                signal = "SELL"
                confidence = 0.5
                
        # 4. MACD Confirmation (Bonus)
        if 'MACD_12_26_9' in latest:
            macd_val = latest['MACD_12_26_9']
            macd_sig = latest['MACD_s_12_26_9']
            if macd_val > macd_sig and signal == "BUY":
                 reasons.append("MACD Bullish Crossover confirmed momentum")
                 confidence += 0.1
            elif macd_val < macd_sig and signal == "SELL":
                 reasons.append("MACD Bearish Divergence detected")
                 confidence += 0.1

        # Format Final Reason
        if not reasons:
            final_reason = "Waiting for clear setup..."
        else:
            final_reason = " | ".join(reasons)
            
        return {
            "signal": signal,
            "confidence": min(confidence, 0.99), # Cap at 99%
            "reason": final_reason,
            "data": {
                "rsi": current_rsi,
                "price": current_price,
                "support": recent_low,
                "resistance": recent_high,
                "sentiment": news_sentiment
            }
        }
