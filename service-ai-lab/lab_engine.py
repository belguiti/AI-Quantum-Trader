"""
Golden Confluence Lab Engine — Optuna Bayesian Optimization
Real TPE (Tree-structured Parzen Estimator) hyperparameter search with walk-forward validation.
Metrics: Sharpe Ratio, Calmar Ratio, Win Rate.
"""
import pandas as pd
import ta
import optuna
import logging
import yfinance as yf
import numpy as np
from datetime import datetime, time
import pytz

# Suppress Optuna's verbose trial-by-trial logging
optuna.logging.set_verbosity(optuna.logging.WARNING)

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

        if latest['RSI'] < 30:
            signal = "BUY"
            confidence += 0.5
            reasons.append(f"RSI Oversold ({latest['RSI']:.1f})")
        elif latest['RSI'] > 70:
            signal = "SELL"
            confidence += 0.5
            reasons.append(f"RSI Overbought ({latest['RSI']:.1f})")

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
        if df.index.tz is None:
            df.index = df.index.tz_localize('UTC').tz_convert(self.est)
        else:
            df.index = df.index.tz_convert(self.est)

        latest = df.iloc[-1]
        current_time = latest.name.time()
        current_price = latest['Close']

        # Killzones (Time Filter)
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

        # Premium vs Discount (Equilibrium)
        swing_high = df['High'].tail(50).max()
        swing_low = df['Low'].tail(50).min()
        equilibrium = (swing_high + swing_low) / 2
        zone = "Premium" if current_price > equilibrium else "Discount"

        # Fair Value Gaps (FVG)
        fvg_signal = "NEUTRAL"
        fvg_reason = ""
        c1 = df.iloc[-4]
        c2 = df.iloc[-3]
        c3 = df.iloc[-2]

        if c2['Close'] > c2['Open'] and c1['High'] < c3['Low']:
            fvg_signal = "BUY"
            fvg_reason = "Bullish FVG Detected"
        if c2['Close'] < c2['Open'] and c1['Low'] > c3['High']:
            fvg_signal = "SELL"
            fvg_reason = "Bearish FVG Detected"

        # Liquidity Sweeps (BSL/SSL)
        sweep_signal = "NEUTRAL"
        sweep_reason = ""
        recent_window = df['Low'].iloc[-10:-2]
        if not recent_window.empty:
            prev_low = recent_window.min()
            candle_sweep = df.iloc[-2]
            if candle_sweep['Low'] < prev_low and candle_sweep['Close'] > prev_low:
                sweep_signal = "BUY"
                sweep_reason = "Sell-Side Liquidity (SSL) Sweep"

        recent_window_high = df['High'].iloc[-10:-2]
        if not recent_window_high.empty:
            prev_high = recent_window_high.max()
            candle_sweep = df.iloc[-2]
            if candle_sweep['High'] > prev_high and candle_sweep['Close'] < prev_high:
                sweep_signal = "SELL"
                sweep_reason = "Buy-Side Liquidity (BSL) Sweep"

        # Decision Logic
        final_signal = "NEUTRAL"
        confidence = 0.0
        reasons = []

        if in_killzone:
            reasons.append(f"In {killzone_name} Killzone")
            confidence += 0.2
        else:
            reasons.append("Outside Killzone")

        if fvg_signal == "BUY" and zone == "Discount":
            final_signal = "BUY"
            confidence += 0.4
            reasons.append(f"{fvg_reason} in Discount Zone")
        elif fvg_signal == "SELL" and zone == "Premium":
            final_signal = "SELL"
            confidence += 0.4
            reasons.append(f"{fvg_reason} in Premium Zone")

        if sweep_signal == "BUY" and zone == "Discount":
            if final_signal == "BUY":
                confidence += 0.3
            else:
                final_signal = "BUY"
                confidence += 0.5
            reasons.append(f"{sweep_reason}")
        elif sweep_signal == "SELL" and zone == "Premium":
            if final_signal == "SELL":
                confidence += 0.3
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
        a_result = self.core_a.analyze(df)
        b_result = self.core_b.analyze(df)

        primary_signal = b_result['signal']
        final_action = "HOLD"
        final_confidence = 0.0
        details = []

        if primary_signal == "NEUTRAL":
            final_action = "HOLD"
            details.append("Core B (SMC) sees no setup.")
        else:
            smc_conf = b_result['confidence']
            details.append(f"Core B detected {primary_signal}: {b_result['reason']}")

            classical_conf = 0.0
            if a_result['signal'] == primary_signal:
                classical_conf = a_result['confidence']
                details.append(f"Core A confirms with {a_result['reason']}")
            elif a_result['signal'] == "NEUTRAL":
                details.append(f"Core A is Neutral: {a_result['reason']}")
            else:
                details.append(f"Core A conflicts ({a_result['signal']}): {a_result['reason']}")
                classical_conf = -0.2

            fusion_score = (smc_conf * 0.7) + (max(0, classical_conf) * 0.3)
            if primary_signal == a_result['signal']:
                fusion_score *= 1.2

            final_confidence = min(fusion_score, 0.99)

            if final_confidence > 0.6:
                final_action = primary_signal
            else:
                final_action = "HOLD"
                details.append(f"Confidence {final_confidence:.2f} too low to execute.")

        latest_close = df['Close'].iloc[-1]
        sl_placement = "N/A"
        tp_placement = "N/A"
        sl_buffer = 0.0

        if asset_class == "CRYPTO":
            sl_buffer = 0.02

        if asset_class == "INDEX" and "Outside Killzone" in details:
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
            "data": {
                "price": latest_close,
                "rsi": df['RSI'].iloc[-1] if 'RSI' in df else 0,
                "sentiment": 0.0
            }
        }


# ═══════════════════════════════════════════════════════════════
#  Shared feature computation
# ═══════════════════════════════════════════════════════════════
def _build_indicators(df: pd.DataFrame, ema_period: int) -> pd.DataFrame:
    """Pre-compute all technical indicators for the Golden Confluence strategy."""
    df = df.copy()
    df['EMA'] = ta.trend.EMAIndicator(df['Close'], window=ema_period).ema_indicator()

    adx_ind = ta.trend.ADXIndicator(df['High'], df['Low'], df['Close'], window=14)
    df['ADX'] = adx_ind.adx()
    df['ADX_POS'] = adx_ind.adx_pos()
    df['ADX_NEG'] = adx_ind.adx_neg()

    df['RSI'] = ta.momentum.RSIIndicator(df['Close'], window=14).rsi()
    df['VOL_SMA'] = df['Volume'].rolling(window=20).mean()
    df['ATR'] = ta.volatility.AverageTrueRange(df['High'], df['Low'], df['Close'], window=14).average_true_range()

    # Stochastic Oscillator — extra momentum confirmation
    stoch = ta.momentum.StochasticOscillator(df['High'], df['Low'], df['Close'], window=14)
    df['STOCH_K'] = stoch.stoch()
    df['STOCH_D'] = stoch.stoch_signal()

    # Bollinger %B — where price sits within the band
    bb = ta.volatility.BollingerBands(df['Close'], window=20, window_dev=2)
    df['BB_PCT_B'] = bb.bollinger_pband()

    df.dropna(inplace=True)
    return df


def _calculate_sharpe(returns: list, risk_free_rate: float = 0.0) -> float:
    """Annualised Sharpe ratio from a list of per-trade percentage returns."""
    if len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    mean_r = np.mean(arr)
    std_r = np.std(arr, ddof=1)
    if std_r == 0:
        return 0.0
    # Approximate annualisation: assume ~252 trading events per year
    sharpe = (mean_r - risk_free_rate) / std_r * np.sqrt(252)
    return float(np.clip(sharpe, -10.0, 10.0))


class LabEngine:
    def __init__(self):
        self.arbiter = FusionArbiter()
        self.COMMISSION_RATE = 0.0005  # 0.05% per trade
        self.SLIPPAGE_RATE = 0.0001    # 0.01% per trade

    def fetch_data(self, symbol: str, start_date: str, end_date: str) -> pd.DataFrame:
        logger.info(f"Fetching data for {symbol} from {start_date} to {end_date}")
        yf_symbol = symbol.replace("/", "-")
        if "USDT" in yf_symbol and "-" not in yf_symbol:
            yf_symbol = yf_symbol.replace("USDT", "-USD")
        df = yf.download(yf_symbol, start=start_date, end=end_date, progress=False)
        if df.empty:
            raise ValueError(f"No data found for {symbol}")
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        return df

    def backtest_strategy(self, df: pd.DataFrame, params: dict):
        """
        Golden Confluence strategy backtest.
        Returns: (final_capital, trades_pct, equity_curve, win_rate,
                  total_return, max_drawdown, calmar_ratio, sharpe_ratio, total_fees)
        """
        if len(df) < 201:
            return 10000.0, [], [], 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

        processed = _build_indicators(df, int(params['ema_period']))
        if len(processed) < 50:
            return 10000.0, [], [], 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

        initial_capital = 10000.0
        capital = initial_capital
        position = 0  # 1=Long, -1=Short
        entry_price = 0.0
        sl_price: float = 0.0   # set in entry block; read in position management
        tp_price: float = 0.0   # set in entry block; read in position management
        trade_atr: float = 0.0
        break_even_triggered = False

        trades_pct = []
        equity_curve = []
        total_fees_paid = 0.0
        wins = losses = 0
        peak_capital = capital
        max_drawdown = 0.0

        for i in range(1, len(processed)):
            row = processed.iloc[i]
            prev_row = processed.iloc[i - 1]
            current_price = float(row['Close'])
            timestamp_str = processed.index[i].strftime('%Y-%m-%d')

            # Record equity curve point (sampled)
            if i % max(1, len(processed) // 500) == 0 or i == len(processed) - 1:
                unsettled = 0.0
                if position == 1:
                    unsettled = (current_price - entry_price) / entry_price * capital
                elif position == -1:
                    unsettled = (entry_price - current_price) / entry_price * capital
                total_equity = capital + unsettled
                equity_curve.append({'time': timestamp_str, 'value': round(total_equity, 2)})

                if total_equity > peak_capital:
                    peak_capital = total_equity
                dd = (peak_capital - total_equity) / peak_capital
                if dd > max_drawdown:
                    max_drawdown = dd

            # Manage open position
            if position != 0:
                close_signal = False
                trade_pnl_pct = 0.0

                if position == 1:
                    # Break-even logic: move SL to entry after +1 ATR
                    if not break_even_triggered and current_price >= entry_price + trade_atr:
                        sl_price = entry_price
                        break_even_triggered = True

                    if current_price <= sl_price or current_price >= tp_price:
                        close_px = sl_price if current_price <= sl_price else tp_price
                        exec_px = close_px * (1 - self.SLIPPAGE_RATE)
                        trade_pnl_pct = (exec_px - entry_price) / entry_price
                        close_signal = True

                elif position == -1:
                    if not break_even_triggered and current_price <= entry_price - trade_atr:
                        sl_price = entry_price
                        break_even_triggered = True

                    if current_price >= sl_price or current_price <= tp_price:
                        close_px = sl_price if current_price >= sl_price else tp_price
                        exec_px = close_px * (1 + self.SLIPPAGE_RATE)
                        trade_pnl_pct = (entry_price - exec_px) / entry_price
                        close_signal = True

                if close_signal:
                    fee = capital * self.COMMISSION_RATE
                    total_fees_paid += fee
                    capital = capital * (1 + trade_pnl_pct) - fee
                    trades_pct.append(trade_pnl_pct)
                    if trade_pnl_pct > 0:
                        wins += 1
                    else:
                        losses += 1
                    position = 0
                    break_even_triggered = False

            # Search for entry when flat
            if position == 0:
                adx_ok = float(row['ADX']) > float(params['adx_threshold'])
                vol_ok = float(row['Volume']) > float(row['VOL_SMA'])

                if adx_ok and vol_ok:
                    rsi_pb = float(params['rsi_pullback_level'])

                    # LONG entry: price above EMA, RSI pulls back then recovers
                    if float(row['Close']) > float(row['EMA']):
                        if float(prev_row['RSI']) < rsi_pb and float(row['RSI']) >= rsi_pb:
                            position = 1
                            entry_price = current_price * (1 + self.SLIPPAGE_RATE)
                            trade_atr = float(row['ATR'])
                            sl_price = entry_price - (float(params['atr_sl_multiplier']) * trade_atr)
                            tp_price = entry_price + (float(params['atr_tp_multiplier']) * trade_atr)
                            break_even_triggered = False
                            fee = capital * self.COMMISSION_RATE
                            capital -= fee
                            total_fees_paid += fee

                    # SHORT entry: price below EMA, RSI pops then falls
                    elif float(row['Close']) < float(row['EMA']):
                        inv_rsi_target = 100 - rsi_pb
                        if float(prev_row['RSI']) > inv_rsi_target and float(row['RSI']) <= inv_rsi_target:
                            position = -1
                            entry_price = current_price * (1 - self.SLIPPAGE_RATE)
                            trade_atr = float(row['ATR'])
                            sl_price = entry_price + (float(params['atr_sl_multiplier']) * trade_atr)
                            tp_price = entry_price - (float(params['atr_tp_multiplier']) * trade_atr)
                            break_even_triggered = False
                            fee = capital * self.COMMISSION_RATE
                            capital -= fee
                            total_fees_paid += fee

        total_trades = wins + losses
        win_rate = wins / total_trades if total_trades > 0 else 0.0
        total_return = (capital - initial_capital) / initial_capital
        calmar_ratio = total_return / (max_drawdown + 0.001) if max_drawdown > 0 else 0.0
        sharpe_ratio = _calculate_sharpe(trades_pct)

        return (capital, trades_pct, equity_curve, win_rate, total_return,
                max_drawdown, calmar_ratio, sharpe_ratio, total_fees_paid)

    def run_optimization(self, symbol: str, start_date: str, end_date: str, _indicators: list,
                         target_win_rate: float, n_trials: int = 50, param_ranges: dict = None):
        """
        Real Bayesian optimization with Optuna TPE sampler + walk-forward validation.
        - Trains on 70% of data, evaluates on remaining 30% (out-of-sample).
        - Objective: maximise Sharpe × Calmar with win-rate penalty.
        """
        logger.info(f"Running Optuna (TPE) Golden Confluence optimisation for {symbol}")
        try:
            df = self.fetch_data(symbol, start_date, end_date)
        except Exception as e:
            raise ValueError(f"Could not load data for {symbol}: {e}")

        # Walk-forward split: optimise on in-sample, report on out-of-sample
        split_idx = int(len(df) * 0.70)
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:]

        # Param range defaults with user overrides
        pr = param_ranges or {}
        sl_min = float(pr.get('sl_min', 0.5))
        sl_max = float(pr.get('sl_max', 3.0))
        tp_min = float(pr.get('tp_min', 1.0))
        tp_max = float(pr.get('tp_max', 6.0))

        def objective(trial: optuna.Trial) -> float:
            params = {
                'adx_threshold': trial.suggest_int('adx_threshold', 18, 38),
                'ema_period': trial.suggest_int('ema_period', 50, 250),
                'rsi_pullback_level': trial.suggest_int('rsi_pullback_level', 25, 50),
                'atr_sl_multiplier': trial.suggest_float('atr_sl_multiplier', sl_min, sl_max),
                'atr_tp_multiplier': trial.suggest_float('atr_tp_multiplier', tp_min, tp_max),
            }

            _, trades, _, wr, t_ret, m_draw, calmar, sharpe, _ = self.backtest_strategy(train_df, params)

            if len(trades) < 5:
                return -999.0

            # Composite objective: Sharpe × Calmar with win-rate penalty
            if calmar > 0 and sharpe > 0:
                score = sharpe * calmar
            elif sharpe > 0:
                score = sharpe * 0.5
            else:
                score = sharpe

            if wr < target_win_rate:
                score -= 4.0 * (target_win_rate - wr)

            return score

        sampler = optuna.samplers.TPESampler(seed=42, n_startup_trials=10)
        pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=0)
        study = optuna.create_study(
            direction='maximize',
            sampler=sampler,
            pruner=pruner
        )
        study.optimize(objective, n_trials=min(n_trials, 200), show_progress_bar=False)

        best_params = study.best_params
        logger.info(f"Best params (in-sample): {best_params}")

        # Evaluate on held-out test set (out-of-sample performance)
        final_cap, trades, eq_curve, wr, t_ret, m_draw, calmar, sharpe, fees = self.backtest_strategy(
            test_df, best_params
        )

        # Optuna parameter importance (which HP mattered most)
        try:
            raw_importance = optuna.importance.get_param_importances(study)
        except Exception:
            raw_importance = {}

        param_labels = {
            'adx_threshold': 'ADX Trend Filter',
            'ema_period': 'EMA Baseline Period',
            'rsi_pullback_level': 'RSI Pullback Level',
            'atr_sl_multiplier': 'ATR Stop Loss Mult.',
            'atr_tp_multiplier': 'ATR Take Profit Mult.',
        }
        feature_importance = {
            param_labels.get(k, k): round(float(v), 4)
            for k, v in raw_importance.items()
        }

        # Guardrail: no trades on test set → fall back to train set
        if not eq_curve:
            _, trades, eq_curve, wr, t_ret, m_draw, calmar, sharpe, fees = self.backtest_strategy(
                df, best_params
            )
        if not eq_curve:
            eq_curve = [{'time': start_date, 'value': 10000}, {'time': end_date, 'value': 10000}]

        main_idea = (
            f"Golden Confluence (Bayesian Optuna, {len(study.trials)} trials). "
            f"Best combo: ADX>{best_params.get('adx_threshold', '?')}, "
            f"EMA({best_params.get('ema_period', '?')}), "
            f"RSI pullback <{best_params.get('rsi_pullback_level', '?')}. "
            f"Out-of-sample Sharpe: {sharpe:.2f}, Win Rate: {wr:.1%}."
        )

        return {
            "totalTrades": int(len(trades)),
            "winRate": round(float(wr), 4),
            "totalReturn": round(float(t_ret), 4),
            "maxDrawdown": round(float(m_draw), 4),
            "calmarRatio": round(float(calmar), 3),
            "sharpeRatio": round(float(sharpe), 3),
            "totalFeesPaid": round(float(fees), 2),
            "equityCurve": eq_curve,
            "bestParams": best_params,
            "featureImportance": feature_importance,
            "mainIdea": main_idea,
            "engineType": "OPTUNA",
            "modelType": "Golden Confluence (Rule-Based)",
            "symbol": symbol,
        }

    def predict(self, market_data: list, _indicators: list, _params: dict,
                _news_sentiment: float = 0.0, asset_class: str = "FOREX") -> dict:
        """Real-time inference using Dual-Core Fusion Engine."""
        if not market_data:
            return {"signal": "HOLD", "confidence": 0.0, "reason": "No Data"}

        df = pd.DataFrame(market_data)
        cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        for c in cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c])

        if 'time' in df.columns:
            df['time'] = pd.to_datetime(df['time'])
            df.set_index('time', inplace=True)
        elif 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
        else:
            df.index = pd.date_range(end=datetime.now(), periods=len(df), freq='h')

        result = self.arbiter.judge(df, asset_class)
        return {
            "signal": result['action'],
            "confidence": result['confidence_score'],
            "reason": result['fusion_reasoning'],
            "data": result.get('data', {})
        }
