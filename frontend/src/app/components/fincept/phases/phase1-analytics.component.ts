import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinceptService, MetricsResult } from '../../../services/fincept.service';
import { ToastService } from '../../../services/toast.service';
import { AssetHealthCardComponent } from '../asset-health-card.component';

@Component({
  selector: 'app-phase1-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, AssetHealthCardComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-white">Python Analytics Scripts</h3>
          <p class="text-sm text-gray-400 mt-0.5">
            CFA-level risk metrics: VaR (Historical Simulation), Sharpe, Sortino, Calmar, Max Drawdown,
            and a simplified DCF momentum score — powered by yfinance + numpy.
          </p>
        </div>
      </div>

      <!-- Quick-select asset chips -->
      <div class="space-y-2">
        <p class="text-xs text-gray-500 uppercase tracking-wider">Quick select</p>
        <div class="flex flex-wrap gap-2">
          @for (g of assetGroups; track g.label) {
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-gray-600 pr-1 border-r border-white/10">{{ g.label }}</span>
              @for (a of g.assets; track a.ticker) {
                <button (click)="pick(a.ticker)"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  [ngClass]="symbol === a.ticker
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'">
                  {{ a.label }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Controls -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 uppercase tracking-wider">Symbol</label>
          <input [(ngModel)]="symbol" placeholder="e.g. BTC-USD, AAPL, GC=F"
            class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                   placeholder-gray-600 focus:outline-none focus:border-blue-500/60 transition" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 uppercase tracking-wider">Start Date</label>
          <input type="date" [(ngModel)]="startDate"
            class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                   focus:outline-none focus:border-blue-500/60 transition" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 uppercase tracking-wider">End Date</label>
          <input type="date" [(ngModel)]="endDate"
            class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                   focus:outline-none focus:border-blue-500/60 transition" />
        </div>
      </div>

      <button (click)="run()" [disabled]="loading()"
        class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50
               text-white font-semibold text-sm transition flex items-center gap-2">
        @if (loading()) {
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Computing…
        } @else {
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Run Analysis
        }
      </button>

      <!-- Error -->
      @if (error()) {
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{{ error() }}</div>
      }

      <!-- Results -->
      @if (result()) {
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <span class="text-white font-semibold">{{ result()!.symbol }}</span>
            <span class="text-xs text-gray-500">{{ result()!.data_points }} trading days</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div *ngFor="let m of metrics()" class="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-1">
              <p class="text-xs text-gray-500 uppercase tracking-wider">{{ m.label }}</p>
              <p class="text-xl font-bold" [ngClass]="m.good ? 'text-emerald-400' : m.bad ? 'text-red-400' : 'text-white'">
                {{ m.value }}
              </p>
              <p class="text-xs text-gray-600">{{ m.hint }}</p>
            </div>
          </div>

          <!-- Asset Health Card — live risk decision for this symbol -->
          <app-asset-health-card [symbol]="result()!.symbol" />

          <!-- DCF Score Bar -->
          <div class="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">DCF Momentum Score</span>
              <span class="font-bold"
                [ngClass]="result()!.dcf_score >= 60 ? 'text-emerald-400' : result()!.dcf_score >= 40 ? 'text-yellow-400' : 'text-red-400'">
                {{ result()!.dcf_score }}/100
              </span>
            </div>
            <div class="h-2 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700"
                [style.width.%]="result()!.dcf_score"
                [ngClass]="result()!.dcf_score >= 60 ? 'bg-emerald-500' : result()!.dcf_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'">
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Phase1AnalyticsComponent {
  private svc   = inject(FinceptService);
  private toast = inject(ToastService);

  assetGroups = [
    {
      label: 'Indices',
      assets: [
        { ticker: '^GSPC',    label: 'S&P 500'   },
        { ticker: '^DJI',     label: 'Dow Jones'  },
        { ticker: '^NDX',     label: 'Nasdaq 100' },
        { ticker: '^FTSE',    label: 'FTSE 100'   },
        { ticker: '^N225',    label: 'Nikkei 225' },
      ]
    },
    {
      label: 'Commodities',
      assets: [
        { ticker: 'GC=F',  label: 'Gold'       },
        { ticker: 'SI=F',  label: 'Silver'     },
        { ticker: 'CL=F',  label: 'Oil WTI'    },
        { ticker: 'BZ=F',  label: 'Brent'      },
        { ticker: 'HG=F',  label: 'Copper'     },
      ]
    },
    {
      label: 'Crypto',
      assets: [
        { ticker: 'BTC-USD',  label: 'Bitcoin'  },
        { ticker: 'ETH-USD',  label: 'Ethereum' },
        { ticker: 'SOL-USD',  label: 'Solana'   },
        { ticker: 'BNB-USD',  label: 'BNB'      },
      ]
    },
    {
      label: 'Stocks',
      assets: [
        { ticker: 'AAPL',  label: 'Apple'    },
        { ticker: 'NVDA',  label: 'Nvidia'   },
        { ticker: 'MSFT',  label: 'Microsoft'},
        { ticker: 'TSLA',  label: 'Tesla'    },
        { ticker: 'AMZN',  label: 'Amazon'   },
        { ticker: 'META',  label: 'Meta'     },
      ]
    },
    {
      label: 'Forex / Macro',
      assets: [
        { ticker: 'EURUSD=X',  label: 'EUR/USD'   },
        { ticker: 'DX-Y.NYB',  label: 'DXY'       },
        { ticker: '^TNX',      label: '10Y Yield'  },
        { ticker: '^VIX',      label: 'VIX'        },
      ]
    },
  ];

  pick(ticker: string) {
    this.symbol = ticker;
  }

  symbol    = 'BTC-USD';
  startDate = '2023-01-01';
  endDate   = new Date().toISOString().slice(0, 10);

  loading = signal(false);
  error   = signal('');
  result  = signal<MetricsResult | null>(null);

  metrics() {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'VaR 95%',      value: `${r.var_95.toFixed(2)}%`,      good: false, bad: r.var_95 < -3,  hint: '1-day loss at 95% CI' },
      { label: 'VaR 99%',      value: `${r.var_99.toFixed(2)}%`,      good: false, bad: r.var_99 < -5,  hint: '1-day loss at 99% CI' },
      { label: 'Sharpe',       value: r.sharpe.toFixed(2),             good: r.sharpe > 1, bad: r.sharpe < 0, hint: 'Risk-adj return (RF=5.25%)' },
      { label: 'Sortino',      value: r.sortino.toFixed(2),            good: r.sortino > 1, bad: r.sortino < 0, hint: 'Downside risk adj return' },
      { label: 'Calmar',       value: r.calmar.toFixed(2),             good: r.calmar > 1, bad: r.calmar < 0, hint: 'Return / Max Drawdown' },
      { label: 'Max Drawdown', value: `${r.max_drawdown.toFixed(2)}%`, good: false, bad: r.max_drawdown < -20, hint: 'Peak-to-trough loss' },
      { label: 'Volatility',   value: `${r.volatility.toFixed(1)}%`,   good: false, bad: r.volatility > 80, hint: 'Annualized std deviation' },
      { label: 'Total Return', value: `${r.total_return.toFixed(1)}%`, good: r.total_return > 0, bad: r.total_return < 0, hint: 'Period performance' },
    ];
  }

  run() {
    if (!this.symbol) return;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.svc.computeMetrics(this.symbol.trim().toUpperCase(), this.startDate, this.endDate).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: err => {
        this.error.set(err?.error?.detail || 'Failed to compute metrics. Is fincept-service running on port 8006?');
        this.loading.set(false);
      }
    });
  }
}
