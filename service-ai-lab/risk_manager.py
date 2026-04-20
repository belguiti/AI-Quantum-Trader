"""
Risk Manager — Prop-Firm / Funded Account Risk Controls.

Enforces three universal rules across ALL backtest engines:
  1. Risk per trade   : only risk a fixed % of equity per trade (default 1%)
  2. Daily loss limit : halt trading if daily loss exceeds threshold (default 5%)
  3. Max drawdown     : halt trading if peak-to-trough drawdown exceeds threshold (default 10%)

These match standard FTMO / MyForexFunds challenge rules.

Usage in any backtest loop:
    rm = RiskManager(initial_capital=10_000)

    for i in range(n_bars):
        rm.new_day(current_date, capital)
        rm.update_peak(capital)

        if position_open:
            # close position, update capital with position_fraction

        can, reason = rm.can_trade(capital)
        if can and signal:
            position_fraction = rm.position_size(entry_price, sl_price, capital)
            # open position with position_fraction
"""

from __future__ import annotations


class RiskManager:
    """
    Stateful risk manager for backtesting.

    Parameters
    ----------
    initial_capital      : float  — starting equity
    risk_per_trade_pct   : float  — fraction of equity to risk per trade  (default 0.01 = 1%)
    daily_loss_limit_pct : float  — max allowed daily drawdown before halt (default 0.05 = 5%)
    max_drawdown_pct     : float  — max allowed total drawdown before halt  (default 0.10 = 10%)
    max_position_pct     : float  — hard cap on position size as % of equity (default 0.20 = 20%)
    """

    def __init__(
        self,
        initial_capital: float,
        risk_per_trade_pct: float = 0.01,
        daily_loss_limit_pct: float = 0.05,
        max_drawdown_pct: float = 0.10,
        max_position_pct: float = 0.20,
    ) -> None:
        self.initial_capital = initial_capital
        self.risk_per_trade_pct = risk_per_trade_pct
        self.daily_loss_limit_pct = daily_loss_limit_pct
        self.max_drawdown_pct = max_drawdown_pct
        self.max_position_pct = max_position_pct

        self.peak_capital: float = initial_capital
        self.daily_start_capital: float = initial_capital
        self._current_day = None

        # Statistics for reporting
        self.halt_days: int = 0
        self.halt_reason: str = ""

    # ──────────────────────────────────────────────
    # Call once per bar
    # ──────────────────────────────────────────────

    def new_day(self, date, capital: float) -> None:
        """Reset daily tracking when the date changes."""
        day_key = str(date)[:10]
        if self._current_day != day_key:
            self._current_day = day_key
            self.daily_start_capital = capital

    def update_peak(self, capital: float) -> None:
        """Track equity high-water mark."""
        if capital > self.peak_capital:
            self.peak_capital = capital

    # ──────────────────────────────────────────────
    # Gate: call before opening any trade
    # ──────────────────────────────────────────────

    def can_trade(self, capital: float) -> tuple[bool, str]:
        """
        Returns (True, "") if trading is allowed.
        Returns (False, reason) if a risk limit has been breached.
        """
        if capital <= 0:
            return False, "Capital depleted"

        # 1. Max total drawdown check
        total_dd = (self.peak_capital - capital) / self.peak_capital
        if total_dd >= self.max_drawdown_pct:
            self.halt_reason = f"Max drawdown {total_dd:.1%} >= {self.max_drawdown_pct:.0%}"
            self.halt_days += 1
            return False, self.halt_reason

        # 2. Daily loss limit check
        daily_loss = (self.daily_start_capital - capital) / self.daily_start_capital
        if daily_loss >= self.daily_loss_limit_pct:
            self.halt_reason = f"Daily loss {daily_loss:.1%} >= {self.daily_loss_limit_pct:.0%}"
            self.halt_days += 1
            return False, self.halt_reason

        return True, ""

    # ──────────────────────────────────────────────
    # Position sizing — fixed fractional risk
    # ──────────────────────────────────────────────

    def position_size(self, entry_price: float, sl_price: float, capital: float) -> float:
        """
        Calculate what fraction of current equity to deploy.

        Logic:
            risk_amount  = capital × risk_per_trade_pct   (e.g. 1% of $10,000 = $100 at risk)
            risk_per_unit = |entry - sl|                   (dollar risk per unit)
            units        = risk_amount / risk_per_unit
            position_val  = units × entry_price
            fraction      = position_val / capital         (capped at max_position_pct)

        Example:
            capital=$10,000, risk=1%, entry=$50,000 (BTC), sl=$49,000 → ATR gap=$1,000
            risk_amount=$100, units=0.1 BTC, position_val=$5,000, fraction=50% → ✓
        """
        if entry_price <= 0 or sl_price <= 0 or capital <= 0:
            return 0.0

        risk_amount = capital * self.risk_per_trade_pct
        risk_per_unit = abs(entry_price - sl_price)

        if risk_per_unit < 1e-10:
            return 0.0

        units = risk_amount / risk_per_unit
        position_value = units * entry_price
        fraction = position_value / capital

        # Hard cap — never deploy more than max_position_pct of equity
        return min(fraction, self.max_position_pct)

    # ──────────────────────────────────────────────
    # PnL helper — use position_fraction
    # ──────────────────────────────────────────────

    @staticmethod
    def apply_pnl(capital: float, position_fraction: float, pnl_pct: float,
                  commission_rate: float, slippage_rate: float) -> tuple[float, float]:
        """
        Apply trade result to capital using position fraction.

        Returns (new_capital, fee_paid).

        Formula:
            pnl_amount   = capital × fraction × pnl_pct
            fee          = capital × fraction × (commission + slippage)
            new_capital  = capital + pnl_amount - fee
        """
        pnl_amount = capital * position_fraction * pnl_pct
        fee = capital * position_fraction * (commission_rate + slippage_rate)
        new_capital = capital + pnl_amount - fee
        return max(new_capital, 0.0), fee  # floor at 0 — no negative equity

    @staticmethod
    def apply_entry_fee(capital: float, position_fraction: float,
                        commission_rate: float) -> tuple[float, float]:
        """Deduct entry commission based on position size."""
        fee = capital * position_fraction * commission_rate
        return capital - fee, fee

    # ──────────────────────────────────────────────
    # Dynamic risk — asset-quality-aware sizing
    # ──────────────────────────────────────────────

    @classmethod
    def compute_dynamic_risk_pct(cls, sortino: float, volatility: float) -> float:
        """
        Compute risk-per-trade % dynamically based on asset quality.

        Rules (applied on top of 1% base):
          • Sortino > 1.0  → bonus up to +0.5%  (reward good risk/return)
          • Sortino < 0.5  → penalty -0.3%       (penalise poor downside control)
          • Volatility > 30% → penalty up to -0.5% (high-vol assets get smaller bets)
          • Volatility < 15% → bonus up to +0.3%   (stable assets get slightly larger bets)

        Result is clamped to [0.2%, 2.0%].
        """
        base = 0.01

        # Sortino adjustment
        if sortino >= 1.0:
            sortino_adj = min(0.005, (sortino - 1.0) * 0.005)
        else:
            sortino_adj = max(-0.003, (sortino - 1.0) * 0.003)

        # Volatility adjustment (reference: 30% annual vol)
        vol_adj = max(-0.005, min(0.003, (0.30 - volatility) * 0.02))

        dynamic = base + sortino_adj + vol_adj
        return round(max(0.002, min(0.02, dynamic)), 4)

    @classmethod
    def from_warmup(cls, closes_warmup, initial_capital: float,
                    daily_loss_limit_pct: float = 0.05,
                    max_drawdown_pct: float = 0.10,
                    max_position_pct: float = 0.20) -> "RiskManager":
        """
        Build a RiskManager whose risk_per_trade_pct is computed from a
        warmup window of closing prices (first 20% of data recommended).

        This avoids the chicken-and-egg problem of needing backtest results
        to size the backtest.
        """
        import math
        closes = [float(c) for c in closes_warmup if c and not math.isnan(float(c))]
        if len(closes) < 10:
            return cls(initial_capital, 0.01, daily_loss_limit_pct, max_drawdown_pct, max_position_pct)

        returns = [(closes[i] - closes[i - 1]) / closes[i - 1] for i in range(1, len(closes))]
        rf_daily = 0.0525 / 252

        # Annualised volatility
        mean_r = sum(returns) / len(returns)
        variance = sum((r - mean_r) ** 2 for r in returns) / len(returns)
        vol = (variance ** 0.5) * (252 ** 0.5)

        # Sortino
        downside = [r for r in returns if r < rf_daily]
        if len(downside) > 1:
            d_mean = sum(downside) / len(downside)
            d_var = sum((r - d_mean) ** 2 for r in downside) / len(downside)
            d_std = (d_var ** 0.5) * (252 ** 0.5)
        else:
            d_std = 0.10
        sortino = (mean_r - rf_daily) * 252 / d_std if d_std > 0 else 1.0

        risk_pct = cls.compute_dynamic_risk_pct(sortino=sortino, volatility=vol)
        return cls(initial_capital, risk_pct, daily_loss_limit_pct, max_drawdown_pct, max_position_pct)
