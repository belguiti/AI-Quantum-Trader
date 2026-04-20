import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinceptService, SentimentResult } from '../../../services/fincept.service';

@Component({
  selector: 'app-phase3-sentiment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div class="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-white">Adanos Social Sentiment</h3>
          <p class="text-sm text-gray-400 mt-0.5">
            Aggregates Reddit posts from r/wallstreetbets, r/investing, r/stocks, r/options
            and scores bullish vs bearish language — no API key required.
          </p>
        </div>
      </div>

      <!-- Input -->
      <div class="flex gap-3">
        <input [(ngModel)]="symbol" placeholder="e.g. NVDA, BTC, TSLA"
          (keyup.enter)="analyze()"
          class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 transition" />
        <button (click)="analyze()" [disabled]="loading()"
          class="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50
                 text-white font-semibold text-sm transition flex items-center gap-2">
          @if (loading()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          } @else {
            Analyze
          }
        </button>
      </div>

      @if (error()) {
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{{ error() }}</div>
      }

      @if (result()) {
        <!-- Sentiment Gauge -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Score Card -->
          <div class="col-span-1 p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-3">
            <div class="text-5xl font-black"
              [ngClass]="labelColor(result()!.label)">
              {{ result()!.label }}
            </div>
            <div class="text-sm text-gray-400">{{ result()!.post_count }} posts analyzed</div>
            <!-- Score bar -->
            <div class="w-full space-y-1">
              <div class="flex justify-between text-xs text-gray-500">
                <span>Bearish</span><span>Bullish</span>
              </div>
              <div class="h-3 bg-white/10 rounded-full overflow-hidden relative">
                <div class="absolute inset-0 flex">
                  <div class="h-full bg-red-500/40 rounded-full" [style.width.%]="50"></div>
                </div>
                <div class="h-full rounded-full absolute top-0 transition-all duration-700"
                  [style.left]="gaugeLeft()"
                  [style.width]="'6px'"
                  [ngClass]="labelColor(result()!.label) + ' opacity-100'"
                  style="background: currentColor">
                </div>
                <div class="h-full rounded-full transition-all duration-700"
                  [ngClass]="result()!.label === 'BULLISH' ? 'bg-emerald-500' : result()!.label === 'BEARISH' ? 'bg-red-500' : 'bg-yellow-500'"
                  [style.width.%]="Math.round((result()!.score + 1) / 2 * 100)">
                </div>
              </div>
              <div class="text-center text-xs font-mono text-gray-400">score: {{ result()!.score.toFixed(3) }}</div>
            </div>
          </div>

          <!-- Posts Feed -->
          <div class="col-span-2 space-y-2 max-h-80 overflow-y-auto pr-1">
            @for (post of result()!.posts; track $index) {
              <div class="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 mr-2">{{ post.source }}</span>
                    <span class="text-sm text-gray-300">{{ post.text }}</span>
                  </div>
                  <span class="text-xs font-mono flex-shrink-0"
                    [ngClass]="post.score > 0 ? 'text-emerald-400' : post.score < 0 ? 'text-red-400' : 'text-gray-500'">
                    {{ post.score > 0 ? '+' : '' }}{{ post.score.toFixed(2) }}
                  </span>
                </div>
                <div class="flex items-center gap-1 mt-1 text-xs text-gray-600">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                  </svg>
                  {{ post.upvotes }} upvotes
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class Phase3SentimentComponent {
  private svc = inject(FinceptService);
  protected Math = Math;

  symbol  = 'NVDA';
  loading = signal(false);
  error   = signal('');
  result  = signal<SentimentResult | null>(null);

  analyze() {
    if (!this.symbol) return;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.svc.getSentiment(this.symbol.trim()).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => {
        this.error.set('Failed to fetch sentiment. Is fincept-service running on port 8006?');
        this.loading.set(false);
      }
    });
  }

  labelColor(label: string) {
    return label === 'BULLISH' ? 'text-emerald-400' : label === 'BEARISH' ? 'text-red-400' : 'text-yellow-400';
  }

  gaugeLeft() {
    const s = this.result()?.score ?? 0;
    const pct = Math.round((s + 1) / 2 * 100);
    return `calc(${pct}% - 3px)`;
  }
}
