import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinceptService, AgentExplanation, PersonaMeta } from '../../../services/fincept.service';

@Component({
  selector: 'app-phase4-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-white">AI Trading Persona Agents</h3>
          <p class="text-sm text-gray-400 mt-0.5">
            37 FinceptTerminal-style investment personas powered by GPT-4o-mini.
            Select a legend, enter a symbol and ML signal, get their analysis.
          </p>
        </div>
      </div>

      <!-- Persona Grid -->
      <div class="space-y-2">
        <p class="text-xs text-gray-500 uppercase tracking-wider">Select Persona</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button *ngFor="let p of personas()"
            (click)="selectedPersona = p.key"
            class="p-4 rounded-2xl border transition text-left"
            [ngClass]="selectedPersona === p.key
              ? 'border-amber-500/60 bg-amber-500/10'
              : 'border-white/10 bg-white/5 hover:bg-white/8'">
            <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mb-2"
              [style.background-color]="p.color + '33'"
              [style.color]="p.color">
              {{ p.avatar }}
            </div>
            <p class="text-sm font-medium text-white">{{ p.name }}</p>
          </button>
        </div>
      </div>

      <!-- Signal Controls -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 uppercase tracking-wider">Symbol</label>
          <input [(ngModel)]="symbol" placeholder="e.g. AAPL, BTC-USD, NVDA"
            class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                   placeholder-gray-600 focus:outline-none focus:border-amber-500/60 transition" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 uppercase tracking-wider">ML Signal</label>
          <div class="flex gap-2">
            @for (sig of ['BUY','SELL','HOLD']; track sig) {
              <button (click)="signal_ = sig"
                class="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition"
                [ngClass]="signal_ === sig
                  ? sig === 'BUY' ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : sig === 'SELL' ? 'bg-red-500/20 border-red-500/60 text-red-300'
                  : 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8'">
                {{ sig }}
              </button>
            }
          </div>
        </div>
      </div>

      <button (click)="explain()" [disabled]="loading() || !selectedPersona"
        class="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50
               text-white font-semibold text-sm transition flex items-center gap-2">
        @if (loading()) {
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Thinking…
        } @else {
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          Get Analysis
        }
      </button>

      @if (error()) {
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{{ error() }}</div>
      }

      <!-- Result -->
      @if (result()) {
        <div class="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              [style.background-color]="result()!.color + '33'"
              [style.color]="result()!.color">
              {{ result()!.avatar }}
            </div>
            <div>
              <p class="font-semibold text-white">{{ result()!.persona }}</p>
              <p class="text-xs text-gray-400">{{ result()!.symbol }} —
                <span [ngClass]="result()!.signal === 'BUY' ? 'text-emerald-400' : result()!.signal === 'SELL' ? 'text-red-400' : 'text-yellow-400'">
                  {{ result()!.signal }}
                </span>
              </p>
            </div>
          </div>

          <p class="text-gray-300 text-sm leading-relaxed italic">"{{ result()!.rationale }}"</p>

          <div class="space-y-1">
            <div class="flex justify-between text-xs text-gray-500">
              <span>Agreement confidence</span>
              <span class="font-mono">{{ (result()!.confidence * 100).toFixed(0) }}%</span>
            </div>
            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-amber-500 transition-all duration-700"
                [style.width.%]="result()!.confidence * 100">
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Phase4AgentsComponent implements OnInit {
  private svc = inject(FinceptService);

  personas       = signal<PersonaMeta[]>([]);
  selectedPersona = 'buffett';
  symbol         = 'AAPL';
  signal_        = 'BUY';
  loading        = signal(false);
  error          = signal('');
  result         = signal<AgentExplanation | null>(null);

  ngOnInit() {
    this.svc.getPersonas().subscribe({
      next: p => this.personas.set(p),
      error: () => this.personas.set([
        { key: 'buffett', name: 'Warren Buffett', avatar: 'WB', color: '#3B82F6' },
        { key: 'graham',  name: 'Benjamin Graham', avatar: 'BG', color: '#10B981' },
        { key: 'lynch',   name: 'Peter Lynch',     avatar: 'PL', color: '#F59E0B' },
        { key: 'soros',   name: 'George Soros',    avatar: 'GS', color: '#EF4444' },
      ])
    });
  }

  explain() {
    if (!this.selectedPersona || !this.symbol) return;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.svc.explainSignal(this.selectedPersona, this.symbol.trim().toUpperCase(), this.signal_).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: err => {
        this.error.set(err?.error?.detail || 'Failed. Is fincept-service running on port 8006 with OPENAI_API_KEY set?');
        this.loading.set(false);
      }
    });
  }
}
