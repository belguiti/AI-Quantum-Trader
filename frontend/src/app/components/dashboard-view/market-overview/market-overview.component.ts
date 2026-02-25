import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketAssetOverview } from '../../../services/wallet.service';

@Component({
  selector: 'app-market-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card p-6 h-full">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-white">Market Overview</h3>
        <button class="text-xs text-primary hover:text-white transition-colors">View All</button>
      </div>

      <div class="space-y-4">
        <div *ngFor="let item of overviewData" class="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
          
          <!-- Asset Info -->
          <div class="flex items-center space-x-3 w-1/3">
            <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white border border-white/10 group-hover:border-primary/50">
              {{ item.symbol ? item.symbol[0] : '' }}
            </div>
            <div>
              <div class="font-medium text-white group-hover:text-primary transition-colors">{{ item.symbol }}</div>
              <div class="text-xs text-gray-500">Forex/Crypto</div>
            </div>
          </div>

          <!-- Sparkline -->
          <div class="w-1/4 h-8">
            <svg class="w-full h-full text-primary" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path [attr.d]="generateSparklinePath(item.sparklineData)" 
                    fill="none" 
                    [attr.stroke]="item.dailyChangePercent >= 0 ? '#00ff9d' : '#ef4444'" 
                    stroke-width="2" 
                    vector-effect="non-scaling-stroke" />
            </svg>
          </div>

          <!-- Price & Change -->
          <div class="text-right w-1/3">
            <div class="font-mono text-white">\${{ item.currentPrice | number:'1.2-5' }}</div>
            <div [class]="'text-xs font-medium ' + (item.dailyChangePercent >= 0 ? 'text-green-400' : 'text-red-400')">
              {{ item.dailyChangePercent > 0 ? '+' : '' }}{{ item.dailyChangePercent | number:'1.2-2' }}%
            </div>
          </div>

        </div>
        <div *ngIf="overviewData.length === 0" class="text-gray-500 italic text-center py-4 text-sm">
            No market data available.
        </div>
      </div>
    </div>
  `
})
export class MarketOverviewComponent {
  @Input() overviewData: MarketAssetOverview[] = [];

  generateSparklinePath(data: number[]): string {
    if (!data || data.length === 0) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min; // avoid division by zero

    // Normalize to 0-100 x 0-20
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 20 - ((val - min) / range) * 20;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }
}
