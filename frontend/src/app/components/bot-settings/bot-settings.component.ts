import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-bot-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">Bot Configuration</h2>
        <button class="btn-primary flex items-center" (click)="saveConfig()">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Configuration
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Strategy Selection -->
        <div class="glass-card p-6 lg:col-span-2">
          <h3 class="text-lg font-semibold text-white mb-6 flex items-center">
            <span class="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary mr-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </span>
            Strategy Engine
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div 
              *ngFor="let strat of strategies"
              (click)="selectedStrategy.set(strat.id)"
              [class]="'cursor-pointer border rounded-xl p-4 transition-all duration-300 ' + 
                (selectedStrategy() === strat.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,242,255,0.15)] transform scale-[1.02]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20')"
            >
              <div class="flex justify-between items-start mb-3">
                <span class="text-2xl">{{ strat.icon }}</span>
                <span *ngIf="selectedStrategy() === strat.id" class="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_#00f2ff]"></span>
              </div>
              <h4 class="font-bold text-white mb-1">{{ strat.name }}</h4>
              <p class="text-xs text-gray-400 leading-relaxed">{{ strat.desc }}</p>
            </div>
          </div>

          <!-- Parameters for Selected Strategy -->
          <div class="bg-black/20 rounded-xl p-6 border border-white/5">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Parameters</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="label-text">Lookback Period</label>
                <input type="range" min="10" max="200" class="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <div class="flex justify-between text-xs text-gray-500">
                  <span>10 candles</span>
                  <span class="text-primary font-mono">50</span>
                  <span>200 candles</span>
                </div>
              </div>
              <div class="space-y-2">
                <label class="label-text">AI Confidence Threshold</label>
                <input type="range" min="50" max="99" class="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <div class="flex justify-between text-xs text-gray-500">
                  <span>50%</span>
                  <span class="text-primary font-mono">85%</span>
                  <span>99%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Management -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-white mb-6 flex items-center">
            <span class="w-8 h-8 rounded bg-danger/20 flex items-center justify-center text-danger mr-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            Risk Control
          </h3>

          <div class="space-y-6">
            <div class="space-y-2">
              <label class="label-text">Stop Loss (%)</label>
              <div class="flex items-center space-x-4">
                <input type="range" min="0.5" max="10" step="0.1" [(ngModel)]="stopLoss" class="flex-1 accent-danger h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <span class="px-3 py-1 bg-black/30 rounded border border-white/10 font-mono text-white min-w-[60px] text-center">{{ stopLoss }}%</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="label-text">Take Profit (%)</label>
              <div class="flex items-center space-x-4">
                <input type="range" min="1" max="50" step="0.5" [(ngModel)]="takeProfit" class="flex-1 accent-secondary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <span class="px-3 py-1 bg-black/30 rounded border border-white/10 font-mono text-white min-w-[60px] text-center">{{ takeProfit }}%</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="label-text">Risk/Reward Ratio</label>
              <div class="grid grid-cols-3 gap-2">
                <button *ngFor="let rr of ['1:1.5', '1:2', '1:3']"
                  (click)="riskReward.set(rr)"
                  [class]="'py-2 rounded-lg text-sm font-medium transition-colors border ' + 
                  (riskReward() === rr 
                    ? 'bg-white/10 border-primary text-white' 
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30')">
                  {{ rr }}
                </button>
              </div>
            </div>

            <div class="pt-6 border-t border-white/10">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-300">Max Open Trades</span>
                <div class="flex items-center space-x-3">
                  <button class="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10" (click)="maxTrades = Math.max(1, maxTrades - 1)">-</button>
                  <span class="font-mono text-lg text-primary">{{ maxTrades }}</span>
                  <button class="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10" (click)="maxTrades = Math.min(10, maxTrades + 1)">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      <!-- Connectivity -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-white mb-6">Exchange Connectivity</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="border border-white/10 rounded-xl p-4 flex items-center justify-between bg-black/20">
            <div class="flex items-center space-x-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg" class="w-8 h-8 opacity-80" alt="Binance">
              <div>
                <div class="font-bold text-white">Binance Futures</div>
                <div class="text-xs text-green-400 flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Connected (Ping: 45ms)
                </div>
              </div>
            </div>
            <button class="text-xs text-danger hover:underline">Disconnect</button>
          </div>
          
          <div class="border border-white/10 rounded-xl p-4 flex items-center justify-between bg-black/20 opacity-60">
            <div class="flex items-center space-x-4">
              <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">M</div>
              <div>
                <div class="font-bold text-gray-300">MetaTrader 5</div>
                <div class="text-xs text-gray-500">Not Configured</div>
              </div>
            </div>
            <button class="btn-secondary text-xs py-1 px-3">Connect</button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class BotSettingsComponent {
    selectedStrategy = signal('neural');
    riskReward = signal('1:2');

    stopLoss = 2.5;
    takeProfit = 5.0;
    maxTrades = 3;
    Math = Math;

    strategies = [
        {
            id: 'neural',
            name: 'Neural Learner',
            desc: 'Autonomous deep reinforcement learning agent that adapts to market volatility.',
            icon: '🧠'
        },
        {
            id: 'rsi',
            name: 'RSI Scalper',
            desc: 'High-frequency mean reversion strategy based on RSI divergence.',
            icon: '⚡'
        },
        {
            id: 'trend',
            name: 'Trend Follower',
            desc: 'Momentum-based strategy using MACD and EMA crossovers.',
            icon: '📈'
        }
    ];

    saveConfig() {
        // Save logic
        alert('Configuration saved successfully!');
    }
}
