import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinceptService, AssetHealth } from '../../services/fincept.service';

@Component({
  selector: 'app-asset-health-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading()) {
      <div class="p-5 rounded-2xl border border-white/10 bg-white/5 animate-pulse h-48"></div>
    }
    @if (!loading() && health()) {
      <div class="p-5 rounded-2xl border space-y-4 transition-all"
        [ngClass]="{
          'border-emerald-500/40 bg-emerald-500/5': health()!.risk_level === 'LOW',
          'border-yellow-500/40 bg-yellow-500/5':  health()!.risk_level === 'MEDIUM',
          'border-orange-500/40 bg-orange-500/5':  health()!.risk_level === 'HIGH',
          'border-red-500/40 bg-red-500/5':         health()!.risk_level === 'EXTREME'
        }">

        <!-- Header row -->
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <span class="font-bold text-white text-lg">{{ health()!.symbol }}</span>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
              [ngClass]="riskBadge()">{{ health()!.risk_level }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">Recommended action:</span>
            <span class="text-sm font-bold" [ngClass]="recColor()">{{ health()!.recommendation }}</span>
          </div>
        </div>

        <!-- Metrics row -->
        <div class="grid grid-cols-3 md:grid-cols-5 gap-3">
          <div class="text-center p-2.5 rounded-xl bg-white/5">
            <p class="text-xs text-gray-500">VaR 95%</p>
            <p class="font-bold text-sm mt-0.5" [ngClass]="health()!.metrics.var_95 < -3 ? 'text-red-400' : 'text-white'">
              {{ health()!.metrics.var_95.toFixed(2) }}%
            </p>
          </div>
          <div class="text-center p-2.5 rounded-xl bg-white/5">
            <p class="text-xs text-gray-500">Volatility</p>
            <p class="font-bold text-sm mt-0.5" [ngClass]="health()!.metrics.volatility > 40 ? 'text-orange-400' : 'text-white'">
              {{ health()!.metrics.volatility.toFixed(1) }}%
            </p>
          </div>
          <div class="text-center p-2.5 rounded-xl bg-white/5">
            <p class="text-xs text-gray-500">Sharpe</p>
            <p class="font-bold text-sm mt-0.5" [ngClass]="health()!.metrics.sharpe > 1 ? 'text-emerald-400' : health()!.metrics.sharpe < 0.5 ? 'text-red-400' : 'text-yellow-400'">
              {{ health()!.metrics.sharpe.toFixed(2) }}
            </p>
          </div>
          <div class="text-center p-2.5 rounded-xl bg-white/5">
            <p class="text-xs text-gray-500">Sortino</p>
            <p class="font-bold text-sm mt-0.5" [ngClass]="health()!.metrics.sortino > 1.5 ? 'text-emerald-400' : 'text-white'">
              {{ health()!.metrics.sortino.toFixed(2) }}
            </p>
          </div>
          <div class="text-center p-2.5 rounded-xl bg-white/5">
            <p class="text-xs text-gray-500">Max DD</p>
            <p class="font-bold text-sm mt-0.5" [ngClass]="health()!.metrics.max_drawdown < -20 ? 'text-red-400' : 'text-white'">
              {{ health()!.metrics.max_drawdown.toFixed(1) }}%
            </p>
          </div>
        </div>

        <!-- Dynamic risk + rules -->
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="space-y-1">
            <p class="text-xs text-gray-400">Suggested risk per trade</p>
            <p class="text-2xl font-black" [ngClass]="recColor()">
              {{ (health()!.dynamic_risk_pct * 100).toFixed(2) }}%
              <span class="text-xs font-normal text-gray-500 ml-1">of equity</span>
            </p>
          </div>
          <div class="flex flex-col gap-1.5 flex-1 min-w-0">
            @for (rule of health()!.rules; track rule.rule) {
              <div class="flex items-center gap-2 text-xs">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  [ngClass]="rule.severity === 'high' ? 'bg-red-400' : rule.severity === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'">
                </span>
                <span class="text-gray-400 font-medium">{{ rule.rule }}</span>
                <span class="text-gray-500">→</span>
                <span class="text-gray-300">{{ rule.action }}</span>
              </div>
            }
          </div>
        </div>

      </div>
    }
    @if (!loading() && error()) {
      <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{{ error() }}</div>
    }
  `
})
export class AssetHealthCardComponent implements OnChanges {
  @Input() symbol = '';

  private svc = inject(FinceptService);
  loading = signal(false);
  health  = signal<AssetHealth | null>(null);
  error   = signal('');

  ngOnChanges() {
    if (!this.symbol) return;
    this.loading.set(true);
    this.health.set(null);
    this.error.set('');
    this.svc.getAssetHealth(this.symbol).subscribe({
      next: h  => { this.health.set(h);  this.loading.set(false); },
      error: () => { this.error.set(`Could not load health for ${this.symbol}`); this.loading.set(false); }
    });
  }

  riskBadge() {
    const map: Record<string, string> = {
      LOW:     'bg-emerald-500/20 text-emerald-300',
      MEDIUM:  'bg-yellow-500/20 text-yellow-300',
      HIGH:    'bg-orange-500/20 text-orange-300',
      EXTREME: 'bg-red-500/20 text-red-300',
    };
    return map[this.health()?.risk_level ?? ''] ?? '';
  }

  recColor() {
    const map: Record<string, string> = {
      TRADE:   'text-emerald-400',
      CAUTION: 'text-yellow-400',
      REDUCE:  'text-orange-400',
      AVOID:   'text-red-400',
    };
    return map[this.health()?.recommendation ?? ''] ?? 'text-white';
  }
}
