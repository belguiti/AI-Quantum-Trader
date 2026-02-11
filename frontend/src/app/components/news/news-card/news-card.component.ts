import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NewsItem } from '../../../services/news.service';

@Component({
    selector: 'app-news-card',
    standalone: true,
    imports: [CommonModule, DatePipe],
    template: `
    <div class="glass-panel p-4 rounded-xl border-l-4 transition-all duration-300 hover:bg-white/5 group relative overflow-hidden"
         [class.border-l-red-500]="news.priority === 'HIGH'"
         [class.border-l-yellow-500]="news.priority === 'MEDIUM'"
         [class.border-l-blue-500]="news.priority === 'LOW'"
         [class.animate-pulse-border]="news.priority === 'HIGH'">
         
      <!-- Background Glow for High Priority -->
      <div *ngIf="news.priority === 'HIGH'" class="absolute inset-0 bg-red-500/5 pointer-events-none animate-pulse"></div>

      <div class="flex justify-between items-start mb-2 relative z-10">
        <div class="flex items-center space-x-2">
            <span class="text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                  [class.bg-white/10]="true"
                  [class.text-gray-300]="true">
                {{ news.category }}
            </span>
            <span class="text-xs text-gray-500 flex items-center">
                {{ news.source }} • {{ news.publishedAt | date:'shortTime' }}
            </span>
        </div>
        
        <!-- Sentiment Icon -->
        <div class="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/5">
            @if (news.sentiment === 'BULLISH') {
                <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span class="text-[0.6rem] font-bold text-green-400">BULL</span>
            } @else if (news.sentiment === 'BEARISH') {
                <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span class="text-[0.6rem] font-bold text-red-400">BEAR</span>
            } @else {
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
                </svg>
                <span class="text-[0.6rem] font-bold text-gray-400">NEUT</span>
            }
        </div>
      </div>

      <h3 class="text-base font-semibold text-white mb-2 group-hover:text-primary transition-colors leading-tight relative z-10">
        {{ news.title }}
      </h3>

      <p class="text-sm text-gray-400 line-clamp-2 relative z-10">
        {{ news.summary }}
      </p>

      <!-- AI Tag -->
      <div class="mt-3 flex items-center space-x-2">
         <div class="flex items-center space-x-1 text-[0.65rem] text-primary/80 border border-primary/20 px-1.5 py-0.5 rounded-md">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>AI Analyzed</span>
         </div>
      </div>

    </div>
  `,
    styles: [`
    .animate-pulse-border {
      animation: pulse-border 2s infinite;
    }
    @keyframes pulse-border {
      0% { border-left-color: rgba(239, 68, 68, 1); box-shadow: -2px 0 10px rgba(239, 68, 68, 0.2); }
      50% { border-left-color: rgba(239, 68, 68, 0.5); box-shadow: -2px 0 20px rgba(239, 68, 68, 0.5); }
      100% { border-left-color: rgba(239, 68, 68, 1); box-shadow: -2px 0 10px rgba(239, 68, 68, 0.2); }
    }
  `]
})
export class NewsCardComponent {
    @Input({ required: true }) news!: NewsItem;
}
