import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinceptService, BrokerStatus } from '../../../services/fincept.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-phase5-broker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-white">Broker Adapter Router</h3>
          <p class="text-sm text-gray-400 mt-0.5">
            Switch execution between MT5 (active), Alpaca (stocks/crypto), and IBKR (multi-asset).
            Configure credentials in <code class="text-gray-300 bg-white/10 px-1 rounded">.env</code> to enable each broker.
          </p>
        </div>
        <button (click)="loadAll()" [disabled]="loadingAll()"
          class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                 text-sm text-gray-300 transition disabled:opacity-50 flex items-center gap-2">
          <svg class="w-4 h-4" [class.animate-spin]="loadingAll()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      @if (error()) {
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{{ error() }}</div>
      }

      <!-- Broker Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div *ngFor="let broker of brokers()"
          class="p-5 rounded-2xl border transition-all"
          [ngClass]="broker.active
            ? 'border-primary/50 bg-primary/5'
            : 'border-white/10 bg-white/5'">

          <!-- Top row -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors"
                [ngClass]="broker.connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-gray-600'">
              </div>
              <span class="font-bold text-white text-lg">{{ broker.name }}</span>
              @if (broker.active) {
                <span class="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">ACTIVE</span>
              }
            </div>
            <span class="text-xs px-2 py-1 rounded-lg bg-white/10 text-gray-400">{{ broker.type }}</span>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="p-3 rounded-xl bg-white/5 text-center">
              <p class="text-xs text-gray-500 mb-1">Status</p>
              <p class="text-sm font-semibold" [ngClass]="broker.connected ? 'text-emerald-400' : 'text-gray-500'">
                {{ broker.connected ? 'Connected' : 'Offline' }}
              </p>
            </div>
            <div class="p-3 rounded-xl bg-white/5 text-center">
              <p class="text-xs text-gray-500 mb-1">Latency</p>
              <p class="text-sm font-semibold" [ngClass]="broker.latency_ms > 0 ? 'text-white' : 'text-gray-600'">
                {{ broker.latency_ms > 0 ? broker.latency_ms + ' ms' : '—' }}
              </p>
            </div>
          </div>

          <!-- Note -->
          @if (broker.note) {
            <p class="text-xs text-yellow-500/80 bg-yellow-500/10 rounded-lg px-3 py-2 mb-4">{{ broker.note }}</p>
          }

          <!-- Actions -->
          <div class="flex gap-2">
            <button (click)="testOne(broker.name)"
              [disabled]="testing()[broker.name]"
              class="flex-1 py-2 rounded-xl text-xs font-semibold border border-white/10
                     bg-white/5 hover:bg-white/10 text-gray-300 transition disabled:opacity-50">
              {{ testing()[broker.name] ? 'Testing…' : 'Test' }}
            </button>
            @if (!broker.active) {
              <button (click)="activate(broker.name)"
                [disabled]="activating() === broker.name"
                class="flex-1 py-2 rounded-xl text-xs font-semibold
                       bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition disabled:opacity-50">
                {{ activating() === broker.name ? 'Activating…' : 'Set Active' }}
              </button>
            } @else {
              <div class="flex-1 py-2 rounded-xl text-xs font-semibold text-center
                          bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ✓ Active
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Env var hints -->
      <div class="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-2">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">.env keys required</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono text-gray-500">
          <div><span class="text-gray-400">MT5:</span> runs via mt5-connector (always available)</div>
          <div><span class="text-gray-400">Alpaca:</span> ALPACA_API_KEY · ALPACA_SECRET_KEY</div>
          <div><span class="text-gray-400">IBKR:</span> IBKR_HOST · IBKR_PORT (TWS must be open)</div>
        </div>
      </div>
    </div>
  `
})
export class Phase5BrokerComponent implements OnInit {
  private svc   = inject(FinceptService);
  private toast = inject(ToastService);

  brokers    = signal<BrokerStatus[]>([]);
  loadingAll = signal(false);
  error      = signal('');
  testing    = signal<Record<string, boolean>>({});
  activating = signal('');

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loadingAll.set(true);
    this.error.set('');
    this.svc.getBrokerStatuses().subscribe({
      next: b => { this.brokers.set(b); this.loadingAll.set(false); },
      error: () => {
        this.error.set('Failed to fetch broker statuses. Is fincept-service running on port 8006?');
        this.loadingAll.set(false);
      }
    });
  }

  testOne(name: string) {
    this.testing.update(t => ({ ...t, [name]: true }));
    this.svc.testBroker(name).subscribe({
      next: result => {
        this.brokers.update(list => list.map(b => b.name === name ? { ...b, ...result } : b));
        this.testing.update(t => ({ ...t, [name]: false }));
        this.toast.show(`${name}: ${result.connected ? 'Connected (' + result.latency_ms + 'ms)' : 'Unreachable'}`,
          result.connected ? 'success' : 'error');
      },
      error: () => {
        this.testing.update(t => ({ ...t, [name]: false }));
        this.toast.show(`${name} test failed`, 'error');
      }
    });
  }

  activate(name: string) {
    this.activating.set(name);
    this.svc.activateBroker(name).subscribe({
      next: () => {
        this.brokers.update(list => list.map(b => ({ ...b, active: b.name === name })));
        this.activating.set('');
        this.toast.show(`${name} is now the active broker`, 'success');
      },
      error: () => { this.activating.set(''); this.toast.show('Activation failed', 'error'); }
    });
  }
}
