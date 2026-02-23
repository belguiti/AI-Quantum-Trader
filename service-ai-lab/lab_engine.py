import pandas as pd
import ta
import optuna
import logging
import yfinance as yf
import numpy as np
from datetime import datetime, time
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClassicalBrain:
    """
    Core A: Retail/Classical Brain
    Calculates RSI, MACD, and EMA.
    Output: Confirms momentum (Overbought/Oversold/Trending).
    """
    def analyze(self, df: pd.DataFrame) -> dict:
        if df.empty:
            return {"signal": "NEUTRAL", "confidence": 0.0, "reason": "No Data"}

        # Calculate Indicators
        df['RSI'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()
        macd = ta.trend.MACD(df['Close'])
        df['MACD'] = macd.macd()
        df['MACD_Signal'] = macd.macd_signal()
        df['EMA_200'] = ta.trend.EMAIndicator(df['Close'], window=200).ema_indicator()
        df['EMA_50'] = ta.trend.EMAIndicator(df['Close'], window=50).ema_indicator()

        latest = df.iloc[-1]
        
        signal = "NEUTRAL"
        confidence = 0.0
        reasons = []

        # RSI Logic
        if latest['RSI'] < 30:
            signal = "BUY"
            confidence += 0.5
            reasons.append(f"RSI Oversold ({latest['RSI']:.1f})")
        elif latest['RSI'] > 70:
            signal = "SELL"
            confidence += 0.5
            reasons.append(f"RSI Overbought ({latest['RSI']:.1f})")

        # MACD Logic
        if latest['MACD'] > latest['MACD_Signal']:
            if signal == "BUY":
                confidence += 0.3
                reasons.append("MACD Bullish Crossover")
            elif signal == "NEUTRAL":
                signal = "BUY"
                confidence += 0.2
        elif latest['MACD'] < latest['MACD_Signal']:
            if signal == "SELL":
                confidence += 0.3
                reasons.append("MACD Bearish Crossover")
            elif signal == "NEUTRAL":
                signal = "SELL"
                confidence += 0.2

        # Trend Filter (EMA)
        if latest['Close'] > latest['EMA_200']:
            reasons.append("Price above EMA 200 (Uptrend)")
        else:
            reasons.append("Price below EMA 200 (Downtrend)")

        return {
            "signal": signal,
            "confidence": min(confidence, 1.0),
            "reason": " | ".join(reasons)
        }

class SmartMoneyBrain:
    """
    Core B: Smart Money/ICT Brain
    Calculates Market Structure, FVGs, Order Blocks, Liquidity Pools.
    """
    def __init__(self):
        self.est = pytz.timezone('US/Eastern')

    def analyze(self, df: pd.DataFrame) -> dict:
        if len(df) < 50:
             return {"signal": "NEUTRAL", "confidence": 0.0, "reason": "Not enough data for SMC"}

        df = df.copy()
        # Convert index to EST for Killzones
        if df.index.tz is None:
             # Assuming UTC input, convert to EST
             df.index = df.index.tz_localize('UTC').tz_convert(self.est)
        else:
             df.index = df.index.tz_convert(self.est)

        latest = df.iloc[-1]
        current_time = latest.name.time()
        current_price = latest['Close']

        # 1. Killzones (Time Filter)
        in_killzone = False
        killzone_name = ""
        
        london_open_start = time(2, 0)
        london_open_end = time(5, 0)
        ny_open_start = time(7, 0)
        ny_open_end = time(10, 0)

        if london_open_start <= current_time <= london_open_end:
            in_killzone = True
            killzone_name = "London Open"
        elif ny_open_start <= current_time <= ny_open_end:
            in_killzone = True
            killzone_name = "New York Open"

        # 2. Premium vs Discount (Equilibrium)
        # Swing High/Low of last 50 candles
        swing_high = df['High'].tail(50).max()
        swing_low = df['Low'].tail(50).min()
        equilibrium = (swing_high + swing_low) / 2
        
        zone = "Premium" if current_price > equilibrium else "Discount"

        # 3. Fair Value Gaps (FVG)
        # Look at last 3 completed candles (iloc -4 to -2)
        # Bullish FVG: Candle 1 High < Candle 3 Low
        # Bearish FVG: Candle 1 Low > Candle 3 High
        fvg_signal = "NEUTRAL"
        fvg_reason = ""
        
        c1 = df.iloc[-4]
        c2 = df.iloc[-3] # Impulsive candle
        c3 = df.iloc[-2]

        # Bullish FVG
        if c2['Close'] > c2['Open'] and c1['High'] < c3['Low']:
            fvg_signal = "BUY"
            fvg_reason = "Bullish FVG Detected"
        
        # Bearish FVG
        if c2['Close'] < c2['Open'] and c1['Low'] > c3['High']:
            fvg_signal = "SELL"
            fvg_reason = "Bearish FVG Detected"

        # 4. Liquidity Sweeps (BSL/SSL)
        # Check if recent candle pierced a swing point but closed inside
        sweep_signal = "NEUTRAL"
        sweep_reason = ""
        
        # Simple definition: Low of -2 was lower than min of (-10 to -3), but Close of -2 > Low of -2
        recent_window = df['Low'].iloc[-10:-2]
        if not recent_window.empty:
            prev_low = recent_window.min()
            candle_sweep = df.iloc[-2]
            
            # Bear Trap (Bullish Sweep)
            if candle_sweep['Low'] < prev_low and candle_sweep['Close'] > prev_low:
                sweep_signal = "BUY"
                sweep_reason = "Sell-Side Liquidity (SSL) Sweep"

        recent_window_high = df['High'].iloc[-10:-2]
        if not recent_window_high.empty:
            prev_high = recent_window_high.max()
            candle_sweep = df.iloc[-2]
            
            # Bull Trap (Bearish Sweep)
            if candle_sweep['High'] > prev_high and candle_sweep['Close'] < prev_high:
                sweep_signal = "SELL"
                sweep_reason = "Buy-Side Liquidity (BSL) Sweep"

        # --- Decision Logic ---
        final_signal = "NEUTRAL"
        confidence = 0.0
        reasons = []

        # Only trade if in Killzone (or heavily penalize if not? User said "prioritize")
        # Let's use it as a booster
        if in_killzone:
            reasons.append(f"In {killzone_name} Killzone")
            confidence += 0.2
        else:
            reasons.append("Outside Killzone")

        # FVG + Zone Confluence
        if fvg_signal == "BUY" and zone == "Discount":
            final_signal = "BUY"
            confidence += 0.4
            reasons.append(f"{fvg_reason} in Discount Zone")
        elif fvg_signal == "SELL" and zone == "Premium":
            final_signal = "SELL"
            confidence += 0.4
            reasons.append(f"{fvg_reason} in Premium Zone")

        # Sweep Confluence
        if sweep_signal == "BUY" and zone == "Discount":
            if final_signal == "BUY": confidence += 0.3 # Stack confluence
            else: 
                final_signal = "BUY"
                confidence += 0.5
            reasons.append(f"{sweep_reason}")
        elif sweep_signal == "SELL" and zone == "Premium":
            if final_signal == "SELL": confidence += 0.3
            else:
                final_signal = "SELL"
                confidence += 0.5
            reasons.append(f"{sweep_reason}")

        return {
            "signal": final_signal,
            "confidence": min(confidence, 1.0),
            "reason": " | ".join(reasons),
            "zone": zone,
            "catalyst": sweep_reason if sweep_reason else fvg_reason
        }

class FusionArbiter:
    """
    The Judge. Fuses signals from Core A and Core B.
    Weighting: SMC (70%), Classical (30%).
    """
    def __init__(self):
        self.core_a = ClassicalBrain()
        self.core_b = SmartMoneyBrain()

    def judge(self, df: pd.DataFrame, asset_class: str = "FOREX") -> dict:
        # Get Analyses
        a_result = self.core_a.analyze(df)
        b_result = self.core_b.analyze(df)

        # Base Trigger must come from Core B (SMC)
        primary_signal = b_result['signal']
        
        final_action = "HOLD"
        final_confidence = 0.0
        details = []

        if primary_signal == "NEUTRAL":
            final_action = "HOLD"
            details.append("Core B (SMC) sees no setup.")
        else:
            # Core B has a setup
            smc_conf = b_result['confidence']
            details.append(f"Core B detected {primary_signal}: {b_result['reason']}")

            # Check Core A confirmation
            classical_conf = 0.0
            if a_result['signal'] == primary_signal:
                classical_conf = a_result['confidence']
                details.append(f"Core A confirms with {a_result['reason']}")
            elif a_result['signal'] == "NEUTRAL":
                details.append(f"Core A is Neutral: {a_result['reason']}")
            else:
                details.append(f"Core A conflicts ({a_result['signal']}): {a_result['reason']}")
                # Penalize confidence
                classical_conf = -0.2

            # Weighted Fusion
            # Score = (SMC * 0.7) + (Classical * 0.3)
            # SMC max ~1.0, Classical max ~1.0
            fusion_score = (smc_conf * 0.7) + (max(0, classical_conf) * 0.3)
            
            # Boost if both agree strongly
            if primary_signal == a_result['signal']:
                fusion_score *= 1.2 # Synergy bonus

            final_confidence = min(fusion_score, 0.99)
            
            if final_confidence > 0.6: # Threshold to act
                final_action = primary_signal
            else:
                 final_action = "HOLD"
                 details.append(f"Confidence {final_confidence:.2f} too low to execute.")

        # Construct JSON Payload
        # entry_zone, sl, tp logic (Simplified from SMC structure)
        latest_close = df['Close'].iloc[-1]
        sl_placement = "N/A"
        tp_placement = "N/A"
        
        # Asset Class Specific Adjustments
        sl_buffer = 0.0
        if asset_class == "CRYPTO":
            # Widen SL for Crypto due to volatility (e.g. 2% buffer below low)
            sl_buffer = 0.02 
        
        # Killzone Priority for Indices
        if asset_class == "INDEX" and "Outside Killzone" in details:
             # Penalize Index trades outside killzone heavily
             final_confidence *= 0.5
             details.append("(Index Penalty: Outside Killzone)")

        if final_action == "BUY":
            min_low = df['Low'].tail(10).min()
            sl_price = min_low * (1 - sl_buffer)
            sl_placement = f"Below SSL ({sl_price:.2f})"
            tp_placement = f"Next Premium Array ({df['High'].tail(20).max():.2f})"
        elif final_action == "SELL":
            max_high = df['High'].tail(10).max()
            sl_price = max_high * (1 + sl_buffer)
            sl_placement = f"Above BSL ({sl_price:.2f})"
            tp_placement = f"Next Discount Array ({df['Low'].tail(20).min():.2f})"

        return {
            "action": final_action,
            "confidence_score": round(final_confidence, 2),
            "fusion_reasoning": " ".join(details),
            "primary_catalyst": b_result.get('catalyst', 'None'),
            "entry_zone": latest_close,
            "sl_placement": sl_placement,
            "tp_placement": tp_placement,
            # Keeping compatibility with existing data structure for frontend display if needed
            "data": {
                 "price": latest_close,
                 "rsi": df['RSI'].iloc[-1] if 'RSI' in df else 0,
                 "sentiment": 0.0 # Placeholder
            }
        }

class LabEngine:
    def __init__(self):
        self.arbiter = FusionArbiter()
        self.COMMISSION_RATE = 0.0005  # 0.05% per trade
        self.SLIPPAGE_RATE = 0.0001    # 0.01% per trade

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

    def backtest_strategy(self, df: pd.DataFrame, params: dict):
        """
        Executes the Institutional 'Golden Confluence' Strategy rules over historical data.
        Returns detailed robust objective metrics, including CalmarRatio.
        """
        if len(df) < 201:
             return 10000.0, [], [], 0.0, 0.0, 0.0, 0.0, 0.0

        df = df.copy()

        # Indicator Calculations via standard 'ta' and native pandas
        df['EMA'] = ta.trend.EMAIndicator(df['Close'], window=int(params['ema_period'])).ema_indicator()
        
        # ADX Calculation
        adx_indicator = ta.trend.ADXIndicator(df['High'], df['Low'], df['Close'], window=14)
        df['ADX'] = adx_indicator.adx()

        # RSI Calculation
        df['RSI'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()
        
        # Volume SMA
        df['VOL_SMA'] = df['Volume'].rolling(window=20).mean()
        
        # ATR Calculation
        df['ATR'] = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close'], window=14).average_true_range()
        
        df.dropna(inplace=True)

        initial_capital = 10000.0
        capital = initial_capital
        position = 0 # 1 for Long, -1 for Short
        entry_price = 0.0
        
        # Dynamic Risk Tracking
        sl_price = 0.0
        tp_price = 0.0
        trade_atr = 0.0
        break_even_triggered = False

        trades = []
        equity_curve = []
        total_fees_paid = 0.0
        
        wins = 0
        losses = 0
        peak_capital = capital
        max_drawdown = 0.0

        for i in range(1, len(df)):
            row = df.iloc[i]
            prev_row = df.iloc[i-1]
            current_price = row['Close']
            current_time = df.index[i]
            timestamp_str = current_time.strftime('%Y-%m-%d %H:%M:%S')

            # Record equity curve entry daily (or every step if needed, simulating daily for UI speed)
            if i % 24 == 0 or i == len(df) - 1: 
                unsettled = 0
                if position == 1:
                    unsettled = (current_price - entry_price) / entry_price * capital
                elif position == -1:
                    unsettled = (entry_price - current_price) / entry_price * capital
                
                total_equity = capital + unsettled
                equity_curve.append({'time': timestamp_str[:10], 'value': round(total_equity, 2)})
                
                if total_equity > peak_capital:
                    peak_capital = total_equity
                
                drawdown = (peak_capital - total_equity) / peak_capital
                if drawdown > max_drawdown:
                    max_drawdown = drawdown

            # Manage Position
            if position != 0:
                trade_pnl = 0.0
                close_signal = False

                if position == 1:
                    # Trailing Stop: Break-Even Logic (+1 ATR)
                    if not break_even_triggered and current_price >= entry_price + trade_atr:
                        sl_price = entry_price # Move SL to Break-Even (entry price)
                        break_even_triggered = True

                    if current_price <= sl_price or current_price >= tp_price:
                        close_price = sl_price if current_price <= sl_price else tp_price
                        # Apply Slippage on Exit
                        execution_price = close_price * (1 - self.SLIPPAGE_RATE) 
                        trade_pnl = (execution_price - entry_price) / entry_price
                        close_signal = True

                elif position == -1:
                    # Trailing Stop Breakdown (-1 ATR)
                    if not break_even_triggered and current_price <= entry_price - trade_atr:
                        sl_price = entry_price # Move SL to BE
                        break_even_triggered = True

                    if current_price >= sl_price or current_price <= tp_price:
                        close_price = sl_price if current_price >= sl_price else tp_price
                        # Apply Slippage on Exit
                        execution_price = close_price * (1 + self.SLIPPAGE_RATE)
                        trade_pnl = (entry_price - execution_price) / entry_price
                        close_signal = True

                if close_signal:
                    # Subtract exit commission
                    fee = capital * self.COMMISSION_RATE
                    total_fees_paid += fee
                    
                    capital = capital * (1 + trade_pnl) - fee
                    trades.append(trade_pnl)
                    
                    if trade_pnl > 0: wins += 1
                    else: losses += 1
                    
                    position = 0
                    entry_price = 0.0
                    break_even_triggered = False

            # Search for Entry if Flat
            if position == 0:
                # Golden Confluence Logic
                
                # 1. Market Regime Filter (The Shield)
                if row['ADX'] > params['adx_threshold']:
                    # 2. Volume Confirmation (The Fuel)
                    if row['Volume'] > row['VOL_SMA']:
                        
                        # LONG ENTRY
                        # 3. Baseline Trend (Compass)
                        if row['Close'] > row['EMA']:
                            # 4. Momentum Trigger (RSI Pullback recovery)
                            # Pullback below threshold yesterday, closed above it today
                            if prev_row['RSI'] < params['rsi_pullback_level'] and row['RSI'] >= params['rsi_pullback_level']:
                                position = 1
                                # Apply Entry Slippage
                                entry_price = current_price * (1 + self.SLIPPAGE_RATE) 
                                
                                # Setup Dynamic Risk via ATR
                                trade_atr = row['ATR']
                                sl_price = entry_price - (params['atr_sl_multiplier'] * trade_atr)
                                tp_price = entry_price + (params['atr_tp_multiplier'] * trade_atr)
                                break_even_triggered = False

                                # Subtract entry commission
                                fee = capital * self.COMMISSION_RATE
                                capital -= fee
                                total_fees_paid += fee

                        # SHORT ENTRY (Inverse Logic)
                        elif row['Close'] < row['EMA']:
                            # Overbought Pullback recovery
                            inverse_rsi_target = 100 - params['rsi_pullback_level']
                            if prev_row['RSI'] > inverse_rsi_target and row['RSI'] <= inverse_rsi_target:
                                position = -1
                                # Apply Entry Slippage
                                entry_price = current_price * (1 - self.SLIPPAGE_RATE)
                                
                                # Setup Dynamic Risk via ATR
                                trade_atr = row['ATR']
                                sl_price = entry_price + (params['atr_sl_multiplier'] * trade_atr)
                                tp_price = entry_price - (params['atr_tp_multiplier'] * trade_atr)
                                break_even_triggered = False

                                # Subtract entry commission
                                fee = capital * self.COMMISSION_RATE
                                capital -= fee
                                total_fees_paid += fee


        total_trades = wins + losses
        win_rate = wins / total_trades if total_trades > 0 else 0.0
        total_return = (capital - initial_capital) / initial_capital
        
        # Calculate Calmar Ratio proxy (avoiding divide-by-zero)
        calmar_ratio = 0.0
        if max_drawdown > 0:
            calmar_ratio = total_return / (max_drawdown + 0.1)

        return capital, trades, equity_curve, win_rate, total_return, max_drawdown, calmar_ratio, total_fees_paid

    def run_optimization(self, symbol: str, start_date: str, end_date: str, indicators: list, target_win_rate: float, n_trials: int = 50, param_ranges: dict = None):
         logger.info(f"Running Optuna tuning for Golden Confluence on {symbol}")
         try:
             df = self.fetch_data(symbol, start_date, end_date)
         except Exception as e:
             logger.error(f"Error fetching data: {e}")
             raise ValueError(f"Could not load data for {symbol}: {e}")

         best_score = -999.0
         best_params = {}
         best_metrics = {}
         best_equity = []

         # Default Grid Constraints aligned with prompt parameters
         adx_min, adx_max = 20, 30
         ema_min, ema_max = 100, 200
         rsi_min, rsi_max = 30, 45
         atr_sl_min, atr_sl_max = 1.0, 2.5
         atr_tp_min, atr_tp_max = 2.0, 5.0

         # Cap trials for synchronous responsiveness
         trials_to_run = min(n_trials, 50) 
         
         for _ in range(trials_to_run):
             # Simulating an Optuna suggest_ distribution for speed
             params = {
                 'adx_threshold': int(np.random.uniform(adx_min, adx_max)),
                 'ema_period': int(np.random.uniform(ema_min, ema_max)),
                 'rsi_pullback_level': int(np.random.uniform(rsi_min, rsi_max)),
                 'atr_sl_multiplier': round(np.random.uniform(atr_sl_min, atr_sl_max), 2),
                 'atr_tp_multiplier': round(np.random.uniform(atr_tp_min, atr_tp_max), 2)
             }
             
             final_cap, trds, eq_curve, wr, t_ret, m_draw, calmar, fees = self.backtest_strategy(df, params)
             
             # The Objective Function
             # Optimize for Calmar Ratio scaled by WinRate
             score = calmar * wr
             
             # Penalties
             if wr < target_win_rate:
                 score -= 10 # Heavily penalize missing target win rate

             if score > best_score:
                 best_score = score
                 best_params = params
                 best_metrics = {
                     'totalTrades': len(trds),
                     'winRate': wr,
                     'totalReturn': t_ret,
                     'maxDrawdown': m_draw,
                     'calmarRatio': calmar,
                     'totalFeesPaid': fees
                 }
                 best_equity = eq_curve

         # Guardrail for zero trades
         if not best_equity:
             best_metrics = {'totalTrades': 0, 'winRate': 0.0, 'totalReturn': 0.0, 'maxDrawdown': 0.0, 'calmarRatio': 0.0, 'totalFeesPaid': 0.0}
             best_params = {'adx_threshold': 25, 'ema_period': 200, 'rsi_pullback_level': 40, 'atr_sl_multiplier': 1.5, 'atr_tp_multiplier': 3.0}
             best_equity = [{'time': start_date, 'value': 10000}, {'time': end_date, 'value': 10000}]

         return {
             "totalTrades": best_metrics['totalTrades'],
             "winRate": best_metrics['winRate'],
             "totalReturn": best_metrics['totalReturn'],
             "maxDrawdown": best_metrics['maxDrawdown'],
             "calmarRatio": round(best_metrics['calmarRatio'], 3),
             "totalFeesPaid": round(best_metrics['totalFeesPaid'], 2),
             "equityCurve": best_equity,
             "bestParams": best_params,
             "symbol": symbol
         }

    def predict(self, market_data: list, indicators: list, params: dict, news_sentiment: float = 0.0, asset_class: str = "FOREX") -> dict:
        """
        Real-time inference using Dual-Core Fusion Engine.
        """
        if not market_data:
            return {"signal": "HOLD", "confidence": 0.0, "reason": "No Data"}

        # Convert list of dicts to DataFrame properly
        df = pd.DataFrame(market_data)
        
        # Ensure numeric columns
        cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        for c in cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c])
        
        # Ensure datetime index if 'time' or 'date' is present
        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'])
            df.set_index('time', inplace=True)
        elif 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
        else:
             # Create a dummy index if missing, but SMC time filters won't work well
             df.index = pd.date_range(end=datetime.now(), periods=len(df), freq='h')

        # Run Fusion Engine
        result = self.arbiter.judge(df, asset_class)
        
        # Remap keys to match expected Spring Boot interface
        # Spring Boot expects: "signal", "confidence", "reason", "data"
        return {
            "signal": result['action'],
            "confidence": result['confidence_score'],
            "reason": result['fusion_reasoning'],
            "data": result.get('data', {})
        }
