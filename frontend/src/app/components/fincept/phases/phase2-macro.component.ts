import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinceptService, MacroIndicator } from '../../../services/fincept.service';

@Component({
  selector: 'app-phase2-macro',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-white">FRED / DBnomics Macro Connectors</h3>
          <p class="text-sm text-gray-400 mt-0.5">
            Live macro indicators via yfinance proxies: VIX, Treasury yields, yield curve spread,
            US Dollar Index, Gold, and Crude Oil — refreshed on each load.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Macro Filter Toggle -->
          <div class="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
            [ngClass]="filterEnabled() ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-white/10 bg-white/3'">
            <span class="text-xs font-medium"
              [ngClass]="filterEnabled() ? 'text-emerald-400' : 'text-gray-500'">
              {{ filterEnabled() ? 'Filter ON' : 'Filter OFF' }}
            </span>
            <button (click)="toggleFilter()" [disabled]="toggling()"
              class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
                     transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 cursor-pointer"
              [ngClass]="filterEnabled() ? 'bg-emerald-500' : 'bg-gray-700'">
              <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                           transform transition duration-200 ease-in-out"
                [ngClass]="filterEnabled() ? 'translate-x-4' : 'translate-x-0'">
              </span>
            </button>
          </div>

          <button (click)="load()" [disabled]="loading()"
            class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                   text-sm text-gray-300 transition disabled:opacity-50 flex items-center gap-2">
            <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Filter status banner -->
      @if (filterEnabled()) {
        <div class="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
          <span class="text-emerald-300 font-medium">Macro filter active</span>
          <span class="text-gray-400">—</span>
          @if (cachedRegime()) {
            <span class="text-gray-300">
              Current regime: <strong [ngClass]="cachedRegime()!.regime === 'RISK-ON' ? 'text-emerald-400' : cachedRegime()!.regime === 'RISK-OFF' ? 'text-red-400' : 'text-yellow-400'">
                {{ cachedRegime()!.regime }}
              </strong> ({{ cachedRegime()!.confidence }}% confidence) —
              AI Engine signals and Swing Trade confidence are being adjusted accordingly.
            </span>
          } @else {
            <span class="text-gray-400">No regime published yet — refresh indicators to publish.</span>
          }
        </div>
      }

      @if (error()) {
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{{ error() }}</div>
      }

      @if (loading() && !indicators().length) {
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          @for (_ of [1,2,3,4,5,6,7]; track $index) {
            <div class="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse"></div>
          }
        </div>
      }

      <!-- Indicator Grid -->
      @if (indicators().length) {
        <!-- Yield Curve Banner -->
        @if (yieldCurve()) {
          <div class="flex items-center gap-3 p-4 rounded-2xl border"
            [ngClass]="yieldCurve()!.value >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'">
            <svg class="w-5 h-5 flex-shrink-0"
              [ngClass]="yieldCurve()!.value >= 0 ? 'text-emerald-400' : 'text-red-400'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <div>
              <span class="font-semibold text-sm"
                [ngClass]="yieldCurve()!.value >= 0 ? 'text-emerald-300' : 'text-red-300'">
                Yield Curve (10Y−3M): {{ yieldCurve()!.value > 0 ? '+' : '' }}{{ yieldCurve()!.value }}%
              </span>
              <span class="text-xs text-gray-400 ml-2">
                {{ yieldCurve()!.value >= 0 ? 'Normal — expansion regime' : 'Inverted — recession signal' }}
              </span>
            </div>
          </div>
        }

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div *ngFor="let ind of mainIndicators()"
            class="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2 hover:bg-white/8 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 uppercase tracking-wider">{{ ind.label }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                [ngClass]="categoryColor(ind.category)">{{ ind.category }}</span>
            </div>
            <div class="flex items-end gap-2">
              <span class="text-2xl font-bold text-white">{{ ind.value }}</span>
              <span class="text-xs text-gray-500 mb-1">{{ ind.unit }}</span>
            </div>
            <div class="flex items-center gap-1 text-xs" [ngClass]="changeColor(ind)">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  [attr.d]="ind.trend === 'up' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'"/>
              </svg>
              {{ ind.change > 0 ? '+' : '' }}{{ ind.change.toFixed(2) }}%
            </div>
          </div>
        </div>

        <!-- ── Macro Regime Summary ── -->
        @if (regime(); as r) {
          <div class="rounded-2xl border overflow-hidden"
            [ngClass]="r.regime === 'RISK-ON' ? 'border-emerald-500/30' : r.regime === 'RISK-OFF' ? 'border-red-500/30' : 'border-yellow-500/30'">

            <!-- Summary header -->
            <div class="flex items-center justify-between px-5 py-4"
              [ngClass]="r.regime === 'RISK-ON' ? 'bg-emerald-500/10' : r.regime === 'RISK-OFF' ? 'bg-red-500/10' : 'bg-yellow-500/10'">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ r.regime === 'RISK-ON' ? '🟢' : r.regime === 'RISK-OFF' ? '🔴' : '🟡' }}</span>
                <div>
                  <p class="font-bold text-lg"
                    [ngClass]="r.regime === 'RISK-ON' ? 'text-emerald-300' : r.regime === 'RISK-OFF' ? 'text-red-300' : 'text-yellow-300'">
                    {{ r.regime }}
                  </p>
                  <p class="text-xs text-gray-400">{{ r.headline }}</p>
                </div>
              </div>
              <div class="text-right hidden md:block">
                <p class="text-xs text-gray-500 uppercase tracking-wider">Confidence</p>
                <p class="font-bold text-white text-lg">{{ r.confidence }}%</p>
              </div>
            </div>

            <!-- Signal bullets -->
            <div class="px-5 py-4 bg-white/3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div *ngFor="let s of r.signals" class="flex items-start gap-2.5">
                <span class="mt-0.5 text-base flex-shrink-0">{{ s.icon }}</span>
                <div class="min-w-0">
                  <span class="text-xs font-semibold text-gray-300">{{ s.label }}:</span>
                  <span class="text-xs text-gray-400 ml-1">{{ s.reading }}</span>
                </div>
              </div>
            </div>

            <!-- Platform implications -->
            <div class="px-5 py-4 border-t border-white/5 space-y-3">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">How this affects your QuantumForge signals</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div *ngFor="let imp of r.implications"
                  class="p-3 rounded-xl border text-xs space-y-1"
                  [ngClass]="imp.type === 'boost' ? 'border-emerald-500/20 bg-emerald-500/5' : imp.type === 'reduce' ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/3'">
                  <p class="font-semibold" [ngClass]="imp.type === 'boost' ? 'text-emerald-400' : imp.type === 'reduce' ? 'text-red-400' : 'text-gray-300'">
                    {{ imp.title }}
                  </p>
                  <p class="text-gray-400 leading-relaxed">{{ imp.detail }}</p>
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class Phase2MacroComponent implements OnInit {
  private svc = inject(FinceptService);

  loading       = signal(false);
  error         = signal('');
  indicators    = signal<any[]>([]);
  filterEnabled = signal(false);
  toggling      = signal(false);
  cachedRegime  = signal<{ regime: string; confidence: number } | null>(null);

  ngOnInit() {
    this.load();
    this.loadFilterStatus();
  }

  loadFilterStatus() {
    this.svc.getMacroFilterStatus().subscribe({
      next: s => {
        this.filterEnabled.set(s.enabled);
        if (s.regime) this.cachedRegime.set(s.regime as any);
      },
      error: () => {}
    });
  }

  toggleFilter() {
    this.toggling.set(true);
    const next = !this.filterEnabled();
    this.svc.toggleMacroFilter(next).subscribe({
      next: r => {
        this.filterEnabled.set(r.enabled);
        this.toggling.set(false);
        // Re-fetch filter status so cached regime updates
        if (r.enabled) this.loadFilterStatus();
      },
      error: () => this.toggling.set(false)
    });
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.svc.getMacroIndicators().subscribe({
      next: data => {
        this.indicators.set(data);
        this.loading.set(false);
        // When filter is ON, refresh Redis regime and update the banner
        if (this.filterEnabled()) {
          this.svc.getMacroRegime().subscribe({
            next: r => this.cachedRegime.set({ regime: r.regime, confidence: r.confidence }),
            error: () => {}
          });
        }
      },
      error: () => {
        this.error.set('Failed to load macro data. Is fincept-service running on port 8006?');
        this.loading.set(false);
      }
    });
  }

  yieldCurve() {
    return this.indicators().find(i => i.key === 'YIELD_CURVE') ?? null;
  }

  mainIndicators() {
    return this.indicators().filter(i => i.key !== 'YIELD_CURVE');
  }

  categoryColor(cat: string) {
    const map: Record<string, string> = {
      risk: 'bg-red-500/20 text-red-400',
      yield: 'bg-blue-500/20 text-blue-400',
      currency: 'bg-purple-500/20 text-purple-400',
      commodity: 'bg-yellow-500/20 text-yellow-400',
      equity: 'bg-emerald-500/20 text-emerald-400',
    };
    return map[cat] ?? 'bg-white/10 text-gray-400';
  }

  changeColor(ind: any) {
    if (ind.key === '^VIX') return ind.change < 0 ? 'text-emerald-400' : 'text-red-400';
    return ind.trend === 'up' ? 'text-emerald-400' : 'text-red-400';
  }

  regime() {
    const all = this.indicators();
    if (!all.length) return null;

    const get = (key: string) => all.find((i: any) => i.key === key);
    const vix    = get('^VIX');
    const tnx    = get('^TNX');
    const irx    = get('^IRX');
    const dxy    = get('DX-Y.NYB');
    const gold   = get('GC=F');
    const oil    = get('CL=F');
    const spx    = get('^GSPC');
    const curve  = get('YIELD_CURVE');

    const vixVal   = vix?.value   ?? 20;
    const curveVal = curve?.value ?? 0;
    const dxyTrend = dxy?.trend   ?? 'flat';
    const goldTrend= gold?.trend  ?? 'flat';
    const oilTrend = oil?.trend   ?? 'flat';
    const spxTrend = spx?.trend   ?? 'flat';

    // Score: positive = risk-on, negative = risk-off
    let score = 0;
    if (vixVal < 15)  score += 2;
    else if (vixVal < 20) score += 1;
    else if (vixVal > 30) score -= 2;
    else if (vixVal > 25) score -= 1;

    if (curveVal > 0.5)  score += 2;
    else if (curveVal > 0) score += 1;
    else if (curveVal < -0.5) score -= 2;
    else if (curveVal < 0) score -= 1;

    if (spxTrend === 'up')   score += 1;
    if (spxTrend === 'down') score -= 1;
    if (dxyTrend === 'down') score += 1;  // weak USD = risk-on
    if (dxyTrend === 'up')   score -= 1;
    if (oilTrend === 'down') score -= 1;  // falling oil = demand concern

    const regime = score >= 3 ? 'RISK-ON' : score <= -2 ? 'RISK-OFF' : 'NEUTRAL';
    const confidence = Math.min(95, Math.abs(score) * 18 + 40);

    const headlines: Record<string, string> = {
      'RISK-ON':  'Markets are calm, equities rising — favour long trades',
      'RISK-OFF': 'Fear elevated, defensive assets leading — reduce exposure',
      'NEUTRAL':  'Mixed signals — wait for confirmation before sizing up',
    };

    const signals = [
      {
        icon: vixVal < 20 ? '😌' : vixVal > 30 ? '😨' : '😐',
        label: 'VIX',
        reading: vixVal < 20
          ? `${vixVal} — Low fear, market is calm`
          : vixVal > 30
          ? `${vixVal} — High fear, panic selling possible`
          : `${vixVal} — Moderate uncertainty`,
      },
      {
        icon: curveVal > 0 ? '📈' : '⚠️',
        label: 'Yield Curve',
        reading: curveVal > 0
          ? `+${curveVal.toFixed(2)}% — Normal, no recession signal`
          : `${curveVal.toFixed(2)}% — Inverted, recession risk`,
      },
      {
        icon: spxTrend === 'up' ? '🚀' : '📉',
        label: 'S&P 500',
        reading: spx
          ? `${spx.value.toFixed(0)} pts (${spx.change > 0 ? '+' : ''}${spx.change.toFixed(2)}%) — ${spxTrend === 'up' ? 'Bullish momentum' : 'Bearish pressure'}`
          : 'N/A',
      },
      {
        icon: dxyTrend === 'down' ? '💚' : '⚡',
        label: 'USD (DXY)',
        reading: dxy
          ? `${dxy.value} — ${dxyTrend === 'down' ? 'Weak USD boosts commodities & crypto' : 'Strong USD headwind for risk assets'}`
          : 'N/A',
      },
      {
        icon: goldTrend === 'up' ? '🥇' : '⬇️',
        label: 'Gold',
        reading: gold
          ? `$${gold.value.toFixed(0)}/oz — ${goldTrend === 'up' ? 'Inflation hedge demand rising' : 'Risk appetite over safe havens'}`
          : 'N/A',
      },
      {
        icon: oilTrend === 'down' ? '🛢️⬇️' : '🛢️',
        label: 'Oil WTI',
        reading: oil
          ? `$${oil.value.toFixed(1)}/bl (${oil.change.toFixed(1)}%) — ${oilTrend === 'down' ? 'Demand slowdown warning' : 'Energy demand strong'}`
          : 'N/A',
      },
    ];

    const implications: Record<string, any[]> = {
      'RISK-ON': [
        { type: 'boost',  title: '✅ Boost BUY signals',      detail: 'Increase XGBoost/LightGBM BUY confidence by +10%. Low VIX confirms trend following.' },
        { type: 'boost',  title: '✅ Normal position sizing',  detail: 'RiskManager operates at full dynamic_risk_pct. No macro penalty applied.' },
        { type: 'neutral',title: '⚡ Favour equities & crypto', detail: 'S&P trending up + weak DXY = best environment for your AI signals on stocks and BTC.' },
      ],
      'RISK-OFF': [
        { type: 'reduce', title: '🔴 Reduce signal confidence', detail: 'Cut all BUY confidence by -20%. High VIX means whipsaws — signals are less reliable.' },
        { type: 'reduce', title: '🔴 Halve position sizes',     detail: 'Apply 0.5× multiplier to dynamic_risk_pct across all models until VIX drops below 25.' },
        { type: 'neutral',title: '🛡️ Favour Gold & Bonds',     detail: 'Shift watchlist to GC=F, silver, defensive stocks. Avoid high-beta crypto trades.' },
      ],
      'NEUTRAL': [
        { type: 'neutral', title: '🟡 Standard sizing',         detail: 'No macro multiplier applied. Trust the ML signal confidence as-is.' },
        { type: 'neutral', title: '🟡 Wait for confirmation',   detail: 'Mixed signals — add a second confirmation (e.g. volume spike) before opening.' },
        { type: 'neutral', title: '🟡 Watch yield curve',       detail: 'Yield curve direction is the key trigger. If it inverts → switch to RISK-OFF rules.' },
      ],
    };

    return { regime, confidence, headline: headlines[regime], signals, implications: implications[regime] };
  }
}
