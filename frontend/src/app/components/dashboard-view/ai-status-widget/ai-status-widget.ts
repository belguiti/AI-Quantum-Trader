import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BotConfigurationService, AiPrediction } from '../../../services/bot-configuration.service';
import { interval, Subscription, switchMap, retry, startWith, BehaviorSubject, combineLatest } from 'rxjs';

@Component({
  selector: 'app-ai-status-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg relative overflow-hidden h-full">
      <!-- Background Glow -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      
      <div class="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 class="text-gray-400 text-sm font-medium">AI Quantum Brain</h3>
          <div class="flex items-center gap-2 mt-1">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span class="text-xs text-green-400 font-mono">LIVE ANALYSIS: {{ prediction()?.symbol || 'SCANNING' }}</span>
          </div>
        </div>
        <!-- Action Badge -->
        <div [ngClass]="{
          'bg-green-500/20 text-green-400 border-green-500/30': prediction()?.action === 'BUY',
          'bg-red-500/20 text-red-400 border-red-500/30': prediction()?.action === 'SELL',
          'bg-gray-500/20 text-gray-400 border-gray-500/30': prediction()?.action === 'HOLD'
        }" class="px-3 py-1 rounded-full border text-sm font-bold tracking-wide">
          {{ prediction()?.action || 'ANALYZING...' }}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 relative z-10">
        <!-- Technical Score -->
        <div class="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <div class="text-xs text-gray-500 mb-1">Technical Confidence</div>
          <div class="text-2xl font-bold text-white">
            {{ (prediction()?.technical_confidence || 0) * 100 | number:'1.0-0' }}<span class="text-sm text-gray-500">%</span>
          </div>
          <!-- Progress Bar -->
          <div class="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div class="bg-blue-500 h-full rounded-full transition-all duration-500"
                 [style.width.%]="(prediction()?.technical_confidence || 0) * 100"></div>
          </div>
        </div>

        <!-- Sentiment Score -->
        <div class="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <div class="text-xs text-gray-500 mb-1">Market Sentiment</div>
          <div class="flex items-center gap-2">
            <div class="text-xl font-bold" [ngClass]="getSentimentColor(prediction()?.sentiment_score || 0)">
              {{ getSentimentLabel(prediction()?.sentiment_score || 0) }}
            </div>
          </div>
           <div class="text-xs text-gray-600 mt-1 truncate">
             Based on recent news
           </div>
      </div>

      <!-- Quantum Logic (Reasoning) -->
      <div *ngIf="prediction()?.reasoning" class="mt-4 relative z-10 group">
        <div class="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-indigo-400">🧠</span>
                <span class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Quantum Logic</span>
            </div>
            <p class="text-xs text-gray-300 font-mono leading-relaxed">
                {{ prediction()?.reasoning }}
            </p>
        </div>
      </div>

      <!-- Aggregate Score -->
      <div class="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center relative z-10">
        <span class="text-xs text-gray-400">Total Signal Strength</span>
        <span class="font-mono text-lg font-bold text-purple-400">
          {{ (prediction()?.aggregate_score || 0) * 100 | number:'1.1-1' }}
        </span>
      </div>
    </div>
  `,
  styles: []
})
export class AiStatusWidget implements OnInit, OnDestroy, OnChanges {
  private botService = inject(BotConfigurationService);
  @Input() symbol: string | null = null;
  prediction = signal<AiPrediction | null>(null);
  private pollSub!: Subscription;
  private manualRefresh$ = new BehaviorSubject<void>(void 0);

  ngOnInit() {
    // Poll every 3 seconds, but also trigger when manualRefresh$ emits (on symbol change)
    this.pollSub = combineLatest([
      interval(3000).pipe(startWith(0)),
      this.manualRefresh$
    ]).pipe(
      switchMap(() => this.botService.getAiInsights(this.symbol || undefined).pipe(retry(1)))
    ).subscribe({
      next: (data) => this.prediction.set(data),
      error: (err) => console.error('Failed to fetch AI insights', err)
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol']) {
      this.prediction.set(null); // Reset while loading new symbol? Or keep old?
      this.manualRefresh$.next();
    }
  }

  ngOnDestroy() {
    if (this.pollSub) this.pollSub.unsubscribe();
  }

  getSentimentLabel(score: number): string {
    if (score > 0.3) return 'BULLISH 🚀';
    if (score < -0.3) return 'BEARISH 🐻';
    return 'NEUTRAL 😐';
  }

  getSentimentColor(score: number): string {
    if (score > 0.3) return 'text-green-400';
    if (score < -0.3) return 'text-red-400';
    return 'text-yellow-400';
  }
}
