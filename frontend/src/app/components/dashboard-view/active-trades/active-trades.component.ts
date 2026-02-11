import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../services/mock-data.service';

@Component({
    selector: 'app-active-trades',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="glass-card p-6 h-full">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-white">Active Trades</h3>
        <div class="flex space-x-2">
           <span class="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20 animate-pulse">
             Live Feeds
           </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
              <th class="pb-3 pl-2">Asset</th>
              <th class="pb-3">Side</th>
              <th class="pb-3 text-right">Entry</th>
              <th class="pb-3 text-right">Size</th>
              <th class="pb-3 text-right">PnL</th>
              <th class="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            <tr *ngFor="let trade of mockData.activeTrades().slice(0, 8)" class="border-b border-white/5 hover:bg-white/5 transition-colors group">
              <td class="py-3 pl-2 font-medium text-white">
                <div class="flex items-center">
                  <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] mr-2">
                    {{ trade.symbol[0] }}
                  </div>
                  {{ trade.symbol }}/USDT
                </div>
              </td>
              <td class="py-3">
                <span [class]="'px-2 py-0.5 rounded text-[10px] font-bold ' + 
                  (trade.side === 'BUY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20')">
                  {{ trade.side }}
                </span>
              </td>
              <td class="py-3 text-right font-mono text-gray-300">\${{ trade.price | number:'1.2-2' }}</td>
              <td class="py-3 text-right text-gray-400">{{ trade.amount | number:'1.4-4' }}</td>
              <td class="py-3 text-right">
                <div class="font-mono text-green-400">+\$124.50</div>
                <div class="text-[10px] text-green-500/70">+2.4%</div>
              </td>
              <td class="py-3 text-right">
                <button class="text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1 rounded transition-colors border border-white/5">
                  Close
                </button>
              </td>
            </tr>
            <tr *ngIf="mockData.activeTrades().length === 0">
              <td colspan="6" class="py-8 text-center text-gray-500 italic">
                No active trades. Bot is scanning...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ActiveTradesComponent {
    mockData = inject(MockDataService);
}
