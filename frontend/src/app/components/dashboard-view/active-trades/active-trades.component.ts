import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LivePosition } from '../../../services/wallet.service';

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
            <tr *ngFor="let trade of trades" class="border-b border-white/5 hover:bg-white/5 transition-colors group">
              <td class="py-3 pl-2 font-medium text-white">
                <div class="flex items-center">
                  <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] mr-2">
                    {{ trade.symbol ? trade.symbol[0] : '' }}
                  </div>
                  {{ trade.symbol }}
                </div>
              </td>
              <td class="py-3">
                <span [class]="'px-2 py-0.5 rounded text-[10px] font-bold ' + 
                  (trade.type === '0' || trade.type.toLowerCase() === 'buy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20')">
                  {{ trade.type === '0' || trade.type.toLowerCase() === 'buy' ? 'BUY' : 'SELL' }}
                </span>
              </td>
              <td class="py-3 text-right font-mono text-gray-300">\${{ trade.openPrice | number:'1.2-5' }}</td>
              <td class="py-3 text-right text-gray-400">{{ trade.volume | number:'1.2-4' }}</td>
              <td class="py-3 text-right">
                <div [class]="'font-mono ' + (trade.profit >= 0 ? 'text-green-400' : 'text-red-400')">
                  {{ trade.profit > 0 ? '+' : '' }}\${{ trade.profit | number:'1.2-2' }}
                </div>
              </td>
              <td class="py-3 text-right">
                <button (click)="onCloseTrade(trade.ticket)" class="text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1 rounded transition-colors border border-white/5">
                  Close
                </button>
              </td>
            </tr>
            <tr *ngIf="trades.length === 0">
              <td colspan="6" class="py-8 text-center text-gray-500 italic">
                No active trades found. Waiting for AI execution.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ActiveTradesComponent {
  @Input() trades: LivePosition[] = [];
  @Output() closeTrade = new EventEmitter<number>();

  onCloseTrade(ticket: number) {
    this.closeTrade.emit(ticket);
  }
}
