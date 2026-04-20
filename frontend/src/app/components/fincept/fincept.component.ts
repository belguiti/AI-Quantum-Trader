import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinceptService } from '../../services/fincept.service';
import { Phase1AnalyticsComponent } from './phases/phase1-analytics.component';
import { Phase2MacroComponent }     from './phases/phase2-macro.component';
import { Phase3SentimentComponent } from './phases/phase3-sentiment.component';
import { Phase4AgentsComponent }    from './phases/phase4-agents.component';
import { Phase5BrokerComponent }    from './phases/phase5-broker.component';

interface PhaseTab {
  id: number;
  key: string;
  label: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-fincept',
  standalone: true,
  imports: [
    CommonModule,
    Phase1AnalyticsComponent,
    Phase2MacroComponent,
    Phase3SentimentComponent,
    Phase4AgentsComponent,
    Phase5BrokerComponent,
  ],
  template: `
    <div class="p-6 space-y-6 min-h-full">

      <!-- Page Header -->
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-white">FinceptTerminal</h1>
            <span class="text-xs px-2.5 py-1 rounded-full font-semibold"
              [ngClass]="serviceOnline()
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'">
              <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                [ngClass]="serviceOnline() ? 'bg-emerald-400' : 'bg-red-400'"></span>
              {{ serviceOnline() ? 'Service Online' : 'Service Offline — run fincept-service on :8006' }}
            </span>
          </div>
          <p class="text-sm text-gray-400">
            Bloomberg-class analytics integrated into QuantumForge —
            Python scripts, macro data, social sentiment, AI personas, and multi-broker routing.
          </p>
        </div>
      </div>

      <!-- Phase Progress Stepper -->
      <div class="flex items-center gap-0 overflow-x-auto pb-2">
        @for (phase of phases; track phase.id; let last = $last) {
          <div class="flex items-center gap-0 flex-shrink-0">
            <button (click)="activePhase.set(phase.id)"
              class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all"
              [ngClass]="activePhase() === phase.id
                ? 'bg-white/10 border border-white/20'
                : 'hover:bg-white/5'">
              <!-- Step Circle -->
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                [ngClass]="activePhase() === phase.id
                  ? 'text-white ' + phase.color
                  : 'bg-white/10 text-gray-500'">
                {{ phase.id }}
              </div>
              <span class="text-sm font-medium whitespace-nowrap"
                [ngClass]="activePhase() === phase.id ? 'text-white' : 'text-gray-500'">
                {{ phase.label }}
              </span>
            </button>
            @if (!last) {
              <div class="w-8 h-px bg-white/10 flex-shrink-0 mx-1"></div>
            }
          </div>
        }
      </div>

      <!-- Active Phase Description -->
      <div class="flex items-center gap-3 p-4 rounded-2xl bg-white/3 border border-white/8">
        <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
          [ngClass]="currentPhase().color">
          {{ currentPhase().id }}
        </div>
        <div>
          <span class="text-sm font-semibold text-white">Phase {{ currentPhase().id }}: {{ currentPhase().label }}</span>
          <span class="text-xs text-gray-400 ml-3">{{ currentPhase().description }}</span>
        </div>
      </div>

      <!-- Phase Content -->
      <div class="min-h-96">
        @switch (activePhase()) {
          @case (1) { <app-phase1-analytics /> }
          @case (2) { <app-phase2-macro /> }
          @case (3) { <app-phase3-sentiment /> }
          @case (4) { <app-phase4-agents /> }
          @case (5) { <app-phase5-broker /> }
        }
      </div>

      <!-- Footer: Start service hint -->
      @if (!serviceOnline()) {
        <div class="p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-300/80 font-mono space-y-1">
          <p class="font-semibold text-yellow-300 font-sans">Start the FinceptTerminal service:</p>
          <p>cd fincept-service</p>
          <p>pip install -r requirements.txt</p>
          <p>uvicorn main:app --port 8006 --reload</p>
        </div>
      }
    </div>
  `
})
export class FinceptComponent implements OnInit {
  private svc = inject(FinceptService);

  activePhase  = signal(1);
  serviceOnline = signal(false);

  phases: PhaseTab[] = [
    { id: 1, key: 'analytics',  label: 'Analytics',     color: 'bg-blue-600',   description: 'VaR, Sharpe, Sortino, Calmar, Max Drawdown, DCF Score via yfinance + numpy' },
    { id: 2, key: 'macro',      label: 'Macro Data',    color: 'bg-emerald-600', description: 'Live FRED/DBnomics proxies: VIX, Yields, Yield Curve, DXY, Gold, Oil' },
    { id: 3, key: 'sentiment',  label: 'Sentiment',     color: 'bg-violet-600',  description: 'Reddit social sentiment aggregation across WSB, Investing, Stocks, Options' },
    { id: 4, key: 'agents',     label: 'AI Agents',     color: 'bg-amber-600',   description: 'Buffett / Graham / Lynch / Soros LLM personas analyze your ML signals' },
    { id: 5, key: 'brokers',    label: 'Brokers',       color: 'bg-rose-600',    description: 'Switch execution: MT5 (CFD/Forex) ↔ Alpaca (Stocks) ↔ IBKR (Multi-Asset)' },
  ];

  currentPhase() {
    return this.phases.find(p => p.id === this.activePhase()) ?? this.phases[0];
  }

  ngOnInit() {
    this.svc.health().subscribe(r => this.serviceOnline.set(r?.status === 'online'));
  }
}
