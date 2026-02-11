import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-lab',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6">
      
      <!-- Lab Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Quantum Lab <span class="text-sm font-normal text-gray-500 px-2 border border-white/10 rounded ml-2">v2.1.0</span></h2>
          <p class="text-gray-400 text-sm">Backtest strategies and train neural models on historical data.</p>
        </div>
        <div class="flex space-x-3">
          <select class="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:border-primary/50 outline-none">
            <option>BTC/USDT - 1h</option>
            <option>ETH/USDT - 15m</option>
            <option>SOL/USDT - 4h</option>
          </select>
          <button class="btn-primary" (click)="startBacktest()" [disabled]="isValidating()">
            <span *ngIf="!isValidating()">Start Backtest</span>
            <span *ngIf="isValidating()" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          </button>
        </div>
      </div>

      <!-- Main Chart Area -->
      <div class="glass-card p-6 h-[500px] flex flex-col relative">
        <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Equity Curve vs. Price Action</h3>
        
        <!-- Simplified Chart Placeholder using CSS/SVG -->
        <div class="flex-1 w-full bg-black/20 rounded-lg border border-white/5 relative overflow-hidden flex items-end px-4 pb-0">
          
          <!-- Grid Lines -->
          <div class="absolute inset-0 grid grid-rows-4 gap-4 pointer-events-none opacity-20">
            <div class="border-t border-dashed border-gray-500 w-full h-full"></div>
            <div class="border-t border-dashed border-gray-500 w-full h-full"></div>
            <div class="border-t border-dashed border-gray-500 w-full h-full"></div>
            <div class="border-t border-dashed border-gray-500 w-full h-full"></div>
          </div>

          <!-- Price Line (Blue) -->
          <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path class="stroke-primary stroke-[2px] fill-none drop-shadow-[0_0_10px_rgba(0,242,255,0.3)]" 
              d="M0,450 C100,400 200,420 300,300 C400,200 500,250 600,150 C700,100 800,120 1000,50 L1000,500 L0,500 Z"
              style="opacity: 0.1; fill: #00f2ff" />
             <path class="stroke-primary stroke-[2px] fill-none" 
              d="M0,450 C100,400 200,420 300,300 C400,200 500,250 600,150 C700,100 800,120 1000,50" />
          </svg>

          <!-- Equity Line (Green) -->
           <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none">
             <path class="stroke-secondary stroke-[2px] fill-none" 
              d="M0,480 C150,470 300,400 450,350 C600,300 750,200 1000,100" />
          </svg>

          <div class="absolute top-4 left-4 flex space-x-4">
            <div class="flex items-center text-xs text-gray-300">
              <span class="w-3 h-0.5 bg-primary mr-2"></span> Asset Price
            </div>
            <div class="flex items-center text-xs text-gray-300">
              <span class="w-3 h-0.5 bg-secondary mr-2"></span> Portfolio Equity
            </div>
          </div>

        </div>

        <!-- Progress Overlay -->
        <div *ngIf="isValidating()" class="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
           <div class="w-64">
             <div class="flex justify-between text-xs text-gray-300 mb-2">
               <span>Simulating trades...</span>
               <span>{{ progress() }}%</span>
             </div>
             <div class="h-1 w-full bg-white/10 rounded-full overflow-hidden">
               <div class="h-full bg-primary transition-all duration-300 ease-out" [style.width]="progress() + '%'"></div>
             </div>
             <div class="mt-4 text-center text-xs text-gray-500 font-mono">
               Tick: {{ currentTick() }} / 10000
             </div>
           </div>
        </div>
      </div>

      <!-- Trade Log -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Backtest Results</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="text-xs text-gray-500">Total Return</div>
            <div class="text-xl font-bold text-green-400">+145.2%</div>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="text-xs text-gray-500">Max Drawdown</div>
            <div class="text-xl font-bold text-red-400">-12.4%</div>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="text-xs text-gray-500">Sharpe Ratio</div>
            <div class="text-xl font-bold text-white">2.45</div>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="text-xs text-gray-500">Total Trades</div>
            <div class="text-xl font-bold text-white">452</div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class LabComponent {
    isValidating = signal(false);
    progress = signal(0);
    currentTick = signal(0);

    startBacktest() {
        this.isValidating.set(true);
        this.progress.set(0);
        this.currentTick.set(0);

        const interval = setInterval(() => {
            this.currentTick.update(v => v + 150);
            this.progress.update(v => Math.min(100, v + 1.5));

            if (this.progress() >= 100) {
                clearInterval(interval);
                this.isValidating.set(false);
            }
        }, 50);
    }
}
