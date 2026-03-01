import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BotConfigurationService, BotConfigurationDTO, StrategyType, RiskRewardRatio, Broker, AccountType, ExchangeAccount, ScanResult } from '../../services/bot-configuration.service';
import { ToastService } from '../../services/toast.service';
import { ModalService } from '../../services/modal.service';
import { LabService } from '../../services/lab.service';

import { AiStatusWidget } from '../dashboard-view/ai-status-widget/ai-status-widget';

@Component({
  selector: 'app-bot-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AiStatusWidget],
  template: `
    <div class="space-y-6">
      
      <!-- Top Bar -->
      <div class="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-gray-900 to-black rounded-2xl border border-white/10 shadow-2xl space-y-4 md:space-y-0 relative overflow-hidden">
        <!-- Glow Effect -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        <div class="flex items-center space-x-6 z-10">
             <div>
                <h2 class="text-3xl font-bold text-white tracking-tight flex items-center">
                    <span class="mr-3 text-primary">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </span>
                    Quantum Config
                </h2>
                <div class="flex items-center space-x-2 mt-2" [formGroup]="configForm">
                   <!-- Config name input removed, now handled via Save popup -->
                </div>
             </div>
             
             <!-- Symbol Selector & Auto Toggle -->
             <div class="h-12 w-px bg-white/10 mx-4 hidden md:block"></div>
             
             <div class="flex items-center space-x-4" [formGroup]="configForm">
                 <div class="flex items-center space-x-4" formGroupName="executionParameters">
                     <!-- Symbol Selector -->
                     <div class="relative">
                        <select formControlName="symbols" multiple class="hidden"></select> <!-- Hidden underlying control -->
                        <!-- Custom Fake Select for Single Symbol (Simplified) -->
                         <div class="flex items-center bg-black/40 border border-white/10 rounded-lg px-3 py-2 space-x-3">
                            <span class="text-xs text-gray-500 uppercase font-bold tracking-wider">Market</span>
                            <select 
                                 (change)="configForm.get('executionParameters.symbols')?.setValue([$any($event.target).value])"
                                 [value]="configForm.get('executionParameters.symbols')?.value?.[0] || 'EURUSD'"
                                 class="bg-transparent text-white font-mono font-bold outline-none cursor-pointer appearance-none hover:text-primary transition-colors">
                                <option *ngFor="let s of availableSymbols" [value]="s" class="bg-gray-900 text-gray-300">{{ s }}</option>
                            </select>
                            <svg class="w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                         </div>
                     </div>

                     <!-- Auto Toggle -->
                     <div class="flex items-center space-x-3 bg-black/30 px-3 py-2 rounded-lg border border-white/5 cursor-pointer hover:bg-black/50 transition-all" (click)="toggleAutoTrading()">
                        <div class="flex flex-col items-end">
                            <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Engine Mode</span>
                            <span class="text-xs font-bold" [class.text-gray-400]="!isAutoTrading()" [class.text-green-400]="isAutoTrading()">
                                {{ isAutoTrading() ? 'ACTIVE' : 'MANUAL' }}
                            </span>
                        </div>
                        <div 
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                            [class.bg-green-500]="isAutoTrading()"
                            [class.bg-gray-700]="!isAutoTrading()">
                            <span
                                class="inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ml-1"
                                [class.translate-x-4]="isAutoTrading()"
                            ></span>
                        </div>
                     </div>
                 </div>
             </div>
        </div>

        <div class="flex space-x-3 z-10">
             <button class="btn-secondary flex items-center px-4 py-2 text-sm" (click)="testConnectivity()" [disabled]="testingConnection()">
                <svg *ngIf="!testingConnection()" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <svg *ngIf="testingConnection()" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ testingConnection() ? 'Testing' : 'Test' }}
            </button>

            <button class="btn-primary flex items-center px-4 py-2 text-sm shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] transition-all" (click)="saveConfig()" [disabled]="configForm.invalid || savingConfig()">
              <svg *ngIf="!savingConfig()" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
               <svg *ngIf="savingConfig()" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {{ savingConfig() ? 'Saving' : 'Save Config' }}
            </button>
        </div>
      </div>

      <form [formGroup]="configForm" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        

          <!-- Strategy Selection -->
        <div class="glass-card p-6 lg:col-span-2">
          
          <!-- Model Selection Dropdown (Insert at top of card) -->
             <div class="glass-card mb-6 p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative group">
                 <!-- Decorator -->
                 <div class="absolute top-0 right-0 w-20 h-20 bg-primary/10 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>

                 <label class="label-text flex justify-between mb-3 relative z-10">
                    <span class="text-primary font-bold tracking-wide flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        AI Model Source
                    </span>
                    <a routerLink="/lab" class="text-xs text-primary/80 hover:text-primary hover:underline transition-colors flex items-center">
                        Train New Model <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </a>
                 </label>
                 
                 <div class="relative z-10">
                     <select formControlName="selectedModelId" class="w-full bg-black/50 border border-white/10 rounded-xl p-3 pr-10 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none text-sm font-mono appearance-none transition-all shadow-inner hover:bg-black/60 cursor-pointer">
                        <option [ngValue]="null" class="text-gray-400 italic">✨ Auto-Select Best Available Model</option>
                        <option *ngFor="let m of availableModels()" [value]="m.id" class="text-white bg-gray-900">
                            {{ m.name }} ({{ m.symbol }}) &nbsp; | &nbsp; Win Rate: {{ (m.metrics?.winRate * 100) | number:'1.0-1' }}%
                        </option>
                     </select>
                     <!-- Custom Arrow -->
                     <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-primary">
                         <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                     </div>
                 </div>
                 
                 <p class="text-[11px] text-gray-500 mt-3 flex items-center">
                     <svg class="w-3 h-3 mr-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     Selected strategy will override default auto-selection logic.
                 </p>
             </div>

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
              (click)="setStrategy(strat.id)"
              [class]="'cursor-pointer border rounded-xl p-4 transition-all duration-300 ' + 
                (configForm.get('selectedStrategy')?.value === strat.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,242,255,0.15)] transform scale-[1.02]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20')"
            >
              <div class="flex justify-between items-start mb-3">
                <span class="text-2xl">{{ strat.icon }}</span>
                <span *ngIf="configForm.get('selectedStrategy')?.value === strat.id" class="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_#00f2ff]"></span>
              </div>
              <h4 class="font-bold text-white mb-1">{{ strat.name }}</h4>
              <p class="text-xs text-gray-400 leading-relaxed">{{ strat.desc }}</p>
            </div>
          </div>

          <!-- Parameters (AI) -->
          <div formGroupName="aiParameters" class="bg-black/20 rounded-xl p-6 border border-white/5 mb-6">
            <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">AI Parameters</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="label-text">Lookback Period</label>
                <input type="range" min="10" max="200" formControlName="lookbackPeriod" class="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <div class="flex justify-between text-xs text-gray-500">
                  <span>10 candles</span>
                  <span class="text-primary font-mono">{{ configForm.get('aiParameters.lookbackPeriod')?.value }}</span>
                  <span>200 candles</span>
                </div>
              </div>
              <div class="space-y-2">
                <label class="label-text">AI Confidence Threshold</label>
                <input type="range" min="0.5" max="0.99" step="0.01" formControlName="confidenceThreshold" class="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <div class="flex justify-between text-xs text-gray-500">
                  <span>50%</span>
                  <span class="text-primary font-mono">{{ (configForm.get('aiParameters.confidenceThreshold')?.value * 100) | number:'1.0-0' }}%</span>
                  <span>99%</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Parameters (Execution) -->
          <div formGroupName="executionParameters" class="bg-black/20 rounded-xl p-6 border border-white/5">
             <h4 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Execution Parameters</h4>
             <div class="space-y-4">
                <div class="space-y-2">
                    <label class="label-text">Timeframe</label>
                    <select formControlName="timeframe" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white">
                        <option value="M1">M1 (1 Minute)</option>
                        <option value="M5">M5 (5 Minutes)</option>
                        <option value="M15">M15 (15 Minutes)</option>
                        <option value="H1">H1 (1 Hour)</option>
                        <option value="H4">H4 (4 Hours)</option>
                    </select>
                </div>
             </div>
          </div>
        </div>

        <!-- Risk Management -->
        <div class="glass-card p-6" formGroupName="riskParameters">
          <h3 class="text-lg font-semibold text-white mb-6 flex items-center">
            <span class="w-8 h-8 rounded bg-danger/20 flex items-center justify-center text-danger mr-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            Risk Control
          </h3>
          
          <!-- Load Config Dropdown (Moved Here) -->
          <div class="relative group">
               <button (click)="isLoadConfigOpen.set(!isLoadConfigOpen())" class="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded text-gray-400 flex items-center transition-all mb-4 focus:outline-none">
                  Load Saved Config <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
               </button>
               
               <!-- Backdrop for closing -->
               <div *ngIf="isLoadConfigOpen()" (click)="isLoadConfigOpen.set(false)" class="fixed inset-0 z-40 bg-transparent cursor-default"></div>

               <div *ngIf="isLoadConfigOpen()" class="absolute top-8 left-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-1 z-50 backdrop-blur-md animate-fade-in-down">
                  <div *ngIf="savedConfigs().length === 0" class="px-4 py-2 text-xs text-gray-500">No saved configs</div>
                  <button *ngFor="let cfg of savedConfigs()" (click)="loadConfig(cfg.id!); isLoadConfigOpen.set(false)" class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-primary/20 hover:text-white transition-colors flex justify-between items-center group-item">
                      <span>{{ cfg.configName || 'Untitled' }}</span>
                      <span *ngIf="cfg.mode === 'AUTO'" class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                  </button>
               </div>
          </div>

          <div class="space-y-6">
            <div class="space-y-2">
              <label class="label-text">Stop Loss (%)</label>
              <div class="flex items-center space-x-4">
                <input type="range" min="0.5" max="10" step="0.1" formControlName="stopLossPercentage" class="flex-1 accent-danger h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <span class="px-3 py-1 bg-black/30 rounded border border-white/10 font-mono text-white min-w-[60px] text-center">{{ configForm.get('riskParameters.stopLossPercentage')?.value }}%</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="label-text">Take Profit (%)</label>
              <div class="flex items-center space-x-4">
                <input type="range" min="1" max="50" step="0.5" formControlName="takeProfitPercentage" class="flex-1 accent-secondary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer">
                <span class="px-3 py-1 bg-black/30 rounded border border-white/10 font-mono text-white min-w-[60px] text-center">{{ configForm.get('riskParameters.takeProfitPercentage')?.value }}%</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="label-text">Risk/Reward Ratio</label>
              <div class="grid grid-cols-3 gap-2">
                <button *ngFor="let rr of riskRewardOptions"
                  type="button"
                  (click)="setRiskReward(rr.value)"
                  [class]="'py-2 rounded-lg text-sm font-medium transition-colors border ' + 
                  (configForm.get('riskParameters.riskRewardRatio')?.value === rr.value 
                    ? 'bg-white/10 border-primary text-white' 
                    : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30')">
                  {{ rr.label }}
                </button>
              </div>
            </div>

            <div class="pt-6 border-t border-white/10">
              <!-- Using executionParameters here, so stepping out of riskParameters scope in template is tricky. 
                   Angular formGroupName works downwards. We need to be careful. 
                   My structure put Risk in separate div. The 'Max Open Trades' was in Execution DTO 
                   but in the UI it was in Risk section. I'll move it or bind correctly.
                   Actually 'maxOpenTrades' is in executionParameters. 
                   I will just access it via parent formGroup path for display if needed or move the UI block.
                   Let's keep the UI structure but bind to executionParameters.
              -->
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-300">Max Open Trades</span>
                <div class="flex items-center space-x-3">
                  <button type="button" class="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10" (click)="adjustMaxTrades(-1)">-</button>
                  <span class="font-mono text-lg text-primary">{{ configForm.get('riskParameters.maxOpenTrades')?.value }}</span>
                  <button type="button" class="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10" (click)="adjustMaxTrades(1)">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </form>

      <!-- AI Insights Widget (New) -->
      <app-ai-status-widget [symbol]="configForm.get('executionParameters.symbols')?.value?.[0]"></app-ai-status-widget>
      
      <!-- Exchange Connectivity -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-white mb-6">Exchange Connectivity</h3>
        
        <!-- Saved Accounts List -->
        <div class="mb-6" *ngIf="exchangeAccounts().length > 0">
            <h4 class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">Saved Accounts</h4>
            <div class="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                <div *ngFor="let acc of exchangeAccounts()" 
                     (click)="selectExchangeAccount(acc)"
                     class="flex-shrink-0 w-48 bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all group relative">
                    
                    <div class="flex items-center space-x-3 mb-2">
                        <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                             <!-- MT5 Icon or similar -->
                             <span class="font-bold text-xs">MT</span>
                        </div>
                        <div>
                            <div class="text-sm font-bold text-white">{{ acc.login }}</div>
                            <div class="text-[10px] text-gray-500">{{ acc.server }}</div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" 
                              [class.border-green-500_30]="acc.accountType === 'REAL'" [class.text-green-400]="acc.accountType === 'REAL'"
                              [class.border-gray-500_30]="acc.accountType === 'DEMO'" [class.text-gray-400]="acc.accountType === 'DEMO'">
                            {{ acc.accountType }}
                        </span>
                        <span class="text-[10px] text-gray-600 group-hover:text-primary transition-colors">Select &rarr;</span>
                    </div>
                    
                    <!-- Active Indicator if matches form -->
                    <div *ngIf="configForm.get('connectivity.mt5Login')?.value == acc.login" class="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"></div>
                </div>
            </div>
        </div>

        <div [formGroup]="configForm">
          <!-- Connectivity Settings -->
          <div formGroupName="connectivity" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div class="space-y-2">
                 <label class="label-text">Broker</label>
                 <select formControlName="broker" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                     <option *ngFor="let b of brokers" [value]="b">{{ b }}</option>
                 </select>
               </div>
               
               <div class="space-y-2">
                 <label class="label-text">Account Type</label>
                 <div class="flex space-x-4 h-[42px] items-center">
                     <label class="flex items-center space-x-2 cursor-pointer">
                         <input type="radio" formControlName="accountType" [value]="AccountType.DEMO" class="accent-primary">
                         <span class="text-gray-300">Demo</span>
                     </label>
                     <label class="flex items-center space-x-2 cursor-pointer">
                         <input type="radio" formControlName="accountType" [value]="AccountType.REAL" class="accent-primary">
                         <span class="text-gray-300">Real</span>
                     </label>
                 </div>
               </div>
               
               <div class="space-y-2">
                 <label class="label-text">Login / API Key</label>
                 <input type="text" formControlName="mt5Login" placeholder="MT5 Login / API Key" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none">
               </div>

                <div class="space-y-2">
                 <label class="label-text">Password / Secret</label>
                 <input type="password" formControlName="mt5Password" placeholder="MT5 Password / Secret" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none">
               </div>
               
                <div class="space-y-2">
                 <label class="label-text">Server / Host</label>
                 <input type="text" formControlName="mt5Server" placeholder="e.g. MetaQuotes-Demo" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none">
               </div>

               <div class="space-y-2">
                 <label class="label-text">MT5 Terminal Path (Optional)</label>
                 <input type="text" formControlName="mt5Path" placeholder="C:\Program Files\MetaTrader 5\terminal64.exe" class="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none">
               </div>
          </div>
          
          <!-- Connection Status Actions -->
           <div class="mt-6 border border-white/10 rounded-xl p-4 flex items-center justify-between bg-black/20" [formGroup]="configForm">
                <div class="flex items-center space-x-4">
                  <div class="w-8 h-8 rounded bg-[#FCD535] flex items-center justify-center" [class.bg-blue-500]="configForm.get('connectivity.broker')?.value !== 'BINANCE'">
                     <span *ngIf="configForm.get('connectivity.broker')?.value === 'BINANCE'">
                        <svg viewBox="0 0 24 24" class="w-5 h-5 text-black fill-current"><path d="M12 0L6.16 5.84l4.16 4.16L12 8.34l1.68 1.66 4.16-4.16L12 0zm0 24l5.84-5.84-4.16-4.16L12 15.66l-1.68-1.66-4.16 4.16L12 24zM0 12l5.84-5.84 4.16 4.16-1.66 1.68 1.66 1.68-4.16 4.16L0 12zm24 0l-5.84 5.84-4.16-4.16 1.66-1.68-1.66-1.68 4.16-4.16L24 12z"/></svg> 
                     </span>
                     <span *ngIf="configForm.get('connectivity.broker')?.value !== 'BINANCE'" class="text-xs font-bold text-white">MT</span>
                  </div>
                  <div>
                    <div class="font-bold text-white">{{ configForm.get('connectivity.broker')?.value }} ({{ configForm.get('connectivity.accountType')?.value }})</div>
                    <div class="text-xs flex items-center" [class.text-green-400]="connectionStatus === 'CONNECTED'" [class.text-gray-500]="connectionStatus !== 'CONNECTED'">
                      <span class="w-2 h-2 rounded-full mr-1" [class.bg-green-500]="connectionStatus === 'CONNECTED'" [class.bg-gray-500]="connectionStatus !== 'CONNECTED'"></span> 
                      {{ connectionStatus === 'CONNECTED' ? 'Connected (Ping: ' + ping + 'ms)' : 'Disconnected' }}
                    </div>
                  </div>
                </div>
                <button class="text-xs text-danger hover:underline" *ngIf="connectionStatus === 'CONNECTED'" (click)="disconnect()">Disconnect</button>
                 <button class="btn-secondary text-xs py-1 px-3" *ngIf="connectionStatus !== 'CONNECTED'" (click)="testConnectivity()">Connect</button>
              </div>
        </div>
      </div>

      <!-- AI Targeted Scan & Trade Execution -->
      <div class="glass-card p-6" [formGroup]="configForm">
         <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white flex items-center">
              <span class="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 mr-3">🎯</span>
              AI Targeted Scan
            </h3>
            <span class="text-xs text-secondary border border-secondary/30 rounded px-2 py-0.5" *ngIf="configForm.get('connectivity.accountType')?.value === 'DEMO'">Test Mode</span>
            <span class="text-xs text-red-500 border border-red-500/30 rounded px-2 py-0.5" *ngIf="configForm.get('connectivity.accountType')?.value === 'REAL'">LIVE</span>
         </div>
         
         <!-- Scan Button -->
         <button 
            class="w-full py-4 rounded-xl text-lg font-bold transition-all border mb-4"
            [class]="isScanning() ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 cursor-wait' : 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-white hover:from-purple-500/30 hover:to-indigo-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]'"
            [disabled]="isScanning()"
            (click)="runTargetedScan()">
            <span *ngIf="!isScanning()" class="flex items-center justify-center gap-2">
              🧠 Scan {{ configForm.get('executionParameters.symbols')?.value?.[0] || 'Symbol' }} Now
            </span>
            <span *ngIf="isScanning()" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning with AI Engine...
            </span>
         </button>

         <!-- AI Analysis Report Card -->
         <div *ngIf="scanResult()" 
              class="border rounded-2xl p-6 space-y-5 animate-shake"
              [class]="scanResult()!.action === 'BUY' ? 'border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent shadow-[0_0_30px_rgba(34,197,94,0.15)]' : scanResult()!.action === 'SELL' ? 'border-red-500/50 bg-gradient-to-br from-red-500/5 to-transparent shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'border-gray-500/30 bg-black/20'">

            <!-- Report Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Analysis Report</span>
                <span class="text-[10px] font-mono text-gray-600">{{ scanResult()!.symbol }}</span>
              </div>
              <button (click)="dismissScanResult()" class="text-gray-600 hover:text-white transition-colors text-xs">✕ Close</button>
            </div>

            <!-- Signal Badge -->
            <div class="flex items-center gap-4">
              <div class="px-6 py-3 rounded-xl text-2xl font-black tracking-wider animate-pulse"
                   [class]="scanResult()!.action === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : scanResult()!.action === 'SELL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'">
                {{ scanResult()!.action }}
              </div>
              <!-- Confidence Bar -->
              <div class="flex-1">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-500">Confidence</span>
                  <span class="font-mono font-bold" [class]="scanResult()!.confidence >= 0.75 ? 'text-green-400' : scanResult()!.confidence >= 0.55 ? 'text-yellow-400' : 'text-gray-400'">{{ (scanResult()!.confidence * 100) | number:'1.0-0' }}%</span>
                </div>
                <div class="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                       [style.width.%]="scanResult()!.confidence * 100"
                       [class]="scanResult()!.confidence >= 0.75 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : scanResult()!.confidence >= 0.55 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gray-600'"></div>
                </div>
              </div>
            </div>

            <!-- Main Idea -->
            <div class="p-4 rounded-xl bg-black/30 border border-white/5">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm">🧠</span>
                <span class="text-[10px] font-bold text-purple-400 uppercase tracking-wider">AI Reasoning</span>
              </div>
              <p class="text-sm text-gray-300 leading-relaxed font-mono">{{ scanResult()!.mainIdea }}</p>
            </div>

            <!-- Trade Setup -->
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-black/40 p-3 rounded-lg border border-white/5">
                <span class="text-[10px] text-gray-500 block">ENTRY</span>
                <span class="text-white font-mono font-bold">{{ scanResult()!.entryPrice | number:'1.2-5' }}</span>
              </div>
              <div class="bg-black/40 p-3 rounded-lg border border-green-500/10">
                <span class="text-[10px] text-gray-500 block">TAKE PROFIT</span>
                <span class="text-green-400 font-mono font-bold">{{ scanResult()!.tp | number:'1.2-5' }}</span>
              </div>
              <div class="bg-black/40 p-3 rounded-lg border border-red-500/10">
                <span class="text-[10px] text-gray-500 block">STOP LOSS</span>
                <span class="text-red-400 font-mono font-bold">{{ scanResult()!.sl | number:'1.2-5' }}</span>
              </div>
            </div>

            <!-- The Prompt -->
            <div class="text-center pt-2">
              <p class="text-lg font-bold text-white mb-4">⚡ Do you want to take this trade?</p>
              <div class="flex gap-4">
                <button 
                  class="flex-1 py-4 rounded-xl text-lg font-bold transition-all border"
                  [class]="scanResult()!.action === 'BUY' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.3)]' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/50 hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]'"
                  [disabled]="isExecutingTrade()"
                  (click)="executeAiTrade()">
                  <span *ngIf="!isExecutingTrade()">YES, Execute on MT5</span>
                  <span *ngIf="isExecutingTrade()" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Executing...
                  </span>
                </button>
                <button 
                  class="flex-1 py-4 rounded-xl text-lg font-bold transition-all border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
                  (click)="dismissScanResult()">
                  NO, Dismiss
                </button>
              </div>
            </div>
         </div>

         <!-- Manual Override Buttons (fallback) -->
         <div class="flex gap-4 mt-4" *ngIf="!scanResult()">
             <button class="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 py-3 rounded-xl text-sm font-bold transition-all" (click)="executeManualTrade('BUY')">
                BUY Market
             </button>
             <button class="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 py-3 rounded-xl text-sm font-bold transition-all" (click)="executeManualTrade('SELL')">
                SELL Market
             </button>
         </div>
      </div>

    </div>
  `
})
export class BotSettingsComponent implements OnInit {
  configForm: FormGroup;
  Math = Math;
  Broker = Broker;
  AccountType = AccountType;

  // UI States
  isAutoTrading = signal(false);
  savingConfig = signal(false);
  testingConnection = signal(false);
  savedConfigs = signal<BotConfigurationDTO[]>([]);
  exchangeAccounts = signal<ExchangeAccount[]>([]);
  connectionStatus = 'DISCONNECTED';

  // Scan States
  isScanning = signal(false);
  isExecutingTrade = signal(false);
  scanResult = signal<ScanResult | null>(null);
  ping = 0;

  availableModels = signal<any[]>([]); // New: Available AI Models

  strategies = [
    {
      id: StrategyType.NEURAL_LEARNER,
      name: 'Neural Learner',
      desc: 'Autonomous deep reinforcement learning agent that adapts to market volatility.',
      icon: '🧠'
    },
    {
      id: StrategyType.RSI_SCALPER,
      name: 'RSI Scalper',
      desc: 'High-frequency mean reversion strategy based on RSI divergence.',
      icon: '⚡'
    },
    {
      id: StrategyType.TREND_FOLLOWER,
      name: 'Trend Follower',
      desc: 'Momentum-based strategy using MACD and EMA crossovers.',
      icon: '📈'
    }
  ];

  riskRewardOptions = [
    { label: '1:1.5', value: RiskRewardRatio.RATIO_1_1_5 },
    { label: '1:2', value: RiskRewardRatio.RATIO_1_2 },
    { label: '1:3', value: RiskRewardRatio.RATIO_1_3 }
  ];

  brokers = Object.values(Broker);
  accountTypes = Object.values(AccountType);
  availableSymbols = [
    // Crypto
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD',
    // Commodities
    'XAUUSD', 'XAGUSD', 'USOIL',
    // Forex
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF',
    // Indices
    'NAS100', 'US500', 'US30', 'UK100',
    // Stocks
    'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN'
  ];
  isLoadConfigOpen = signal(false);

  constructor(
    private fb: FormBuilder,
    private botService: BotConfigurationService,
    private toastService: ToastService,
    private modalService: ModalService,
    private labService: LabService
  ) {
    this.configForm = this.fb.group({
      configName: ['My Bot Config'], // New Field
      selectedModelId: [null], // NEW
      selectedStrategy: [StrategyType.NEURAL_LEARNER, Validators.required],
      mode: ['MANUAL'],

      aiParameters: this.fb.group({
        lookbackPeriod: [50, [Validators.required, Validators.min(10), Validators.max(200)]],
        confidenceThreshold: [0.85, [Validators.required, Validators.min(0.5), Validators.max(0.99)]]
      }),

      riskParameters: this.fb.group({
        stopLossPercentage: [2.5, [Validators.required, Validators.min(0.5), Validators.max(10)]],
        takeProfitPercentage: [5.0, [Validators.required, Validators.min(1), Validators.max(50)]],
        riskRewardRatio: [RiskRewardRatio.RATIO_1_2, Validators.required],
        maxDailyLossPct: [2.0],
        riskPerTradePct: [1.0],
        maxOpenTrades: [3, [Validators.required, Validators.min(1), Validators.max(10)]]
      }),

      executionParameters: this.fb.group({
        symbols: [['EURUSD']], // We will bind the selector to this
        timeframe: ['M1']
      }),

      connectivity: this.fb.group({
        broker: [Broker.MT5, Validators.required],
        accountType: [AccountType.DEMO, Validators.required],
        mt5Login: [''],
        mt5Password: [''],
        mt5Server: ['MetaQuotes-Demo'],
        mt5Path: [''],
        mt5ConnectorBaseUrl: ['http://127.0.0.1:5005'],
        enableAiModel: [true]
      })
    });
  }

  ngOnInit(): void {
    this.refreshConfigList();
    this.refreshAccountList(); // New

    // Fetch available models
    this.labService.getModels().subscribe(models => {
      this.availableModels.set(models);
    });

    this.botService.getConfiguration().subscribe({
      next: (config) => {
        if (config) {
          this.applyConfig(config);
        }
      },
      error: (err) => console.error('Error fetching config', err)
    });

    // Subscribe to global connection status
    this.botService.connectionStatus$.subscribe(status => {
      this.connectionStatus = status;
      // If connected, maybe refresh account list to ensure new one is added?
      if (status === 'CONNECTED') {
        this.refreshAccountList();
      }
    });
  }

  refreshConfigList() {
    this.botService.listConfigurations().subscribe({
      next: (list) => this.savedConfigs.set(list),
      error: (err) => console.error('Failed to load config list', err)
    });
  }

  refreshAccountList() {
    this.botService.listExchangeAccounts().subscribe({
      next: (list) => this.exchangeAccounts.set(list),
      error: (err) => console.error('Failed to load accounts', err)
    });
  }

  selectExchangeAccount(account: ExchangeAccount) {
    this.configForm.get('connectivity')?.patchValue({
      broker: account.broker || Broker.MT5,
      accountType: account.accountType,
      mt5Login: account.login,
      mt5Server: account.server,
      mt5Path: account.path,
      mt5Password: '' // Clear password field, backend will use saved one
    });
    // Optional: Auto-connect? User might want to verify first.
    this.toastService.show(`Statement selected: ${account.login}`, 'info');
  }

  loadConfig(id: number) {
    this.botService.loadConfiguration(id).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.toastService.show(`Loaded configuration: ${config.configName || 'Untitled'}`, 'success');
      },
      error: (err) => this.toastService.show('Failed to load configuration', 'error')
    });
  }

  applyConfig(config: BotConfigurationDTO) {
    console.log('Applying config:', config);
    this.configForm.patchValue(config);

    // Explicitly set nested groups if needed, though patchValue is recursive.
    // Ensure symbols array is set correctly (sometimes arrays need explicit setValue)
    if (config.executionParameters?.symbols) {
      this.configForm.get('executionParameters.symbols')?.setValue(config.executionParameters.symbols);
    }

    this.isAutoTrading.set(config.mode === 'AUTO');

    // Auto-check connection if credentials exist AND we think we are connected (or want to auto-reconnect)
    // For now, if local storage says connected, we trust it, or silently verify.
    // If not connected, we don't auto-connect to avoid spamming unless intended.
    if ((config.connectivity?.mt5Login || config.connectivity?.mt5Path) && this.connectionStatus === 'CONNECTED') {
      this.testConnectivity(true);
    }
  }

  setStrategy(strategyId: StrategyType) {
    this.configForm.patchValue({ selectedStrategy: strategyId });
  }

  setRiskReward(ratio: RiskRewardRatio) {
    this.configForm.get('riskParameters')?.patchValue({ riskRewardRatio: ratio });
  }

  adjustMaxTrades(delta: number) {
    const control = this.configForm.get('riskParameters.maxOpenTrades');
    if (control) {
      const current = control.value || 1;
      const newValue = Math.min(10, Math.max(1, current + delta));
      control.setValue(newValue);
    }
  }

  toggleAutoTrading() {
    this.isAutoTrading.update(v => !v);
    this.configForm.patchValue({ mode: this.isAutoTrading() ? 'AUTO' : 'MANUAL' });
  }

  saveConfig() {
    if (this.configForm.valid) {
      // 1. Prompt for Configuration Name
      this.modalService.prompt({
        title: 'Save Configuration',
        message: 'Enter a name for this configuration:',
        inputPlaceholder: 'e.g., My Scalping Strategy',
        inputValue: this.configForm.get('configName')?.value || '',
        confirmLabel: 'Save',
        cancelLabel: 'Cancel',
        type: 'info'
      }).then((name) => {
        if (name) {
          // 2. Set name and Save
          this.configForm.patchValue({ configName: name });
          this.performSave();
        }
      });
    }
  }

  performSave() {
    this.savingConfig.set(true);
    const config: BotConfigurationDTO = this.configForm.value;

    this.botService.saveConfiguration(config).subscribe({
      next: () => {
        this.savingConfig.set(false);
        this.refreshConfigList();

        this.modalService.confirm({
          title: 'Configuration Saved',
          message: `Configuration "${config.configName}" has been saved successfully.`,
          confirmLabel: 'OK',
          type: 'info'
        });
      },
      error: (err) => {
        this.savingConfig.set(false);
        this.toastService.show('Failed to save configuration', 'error');
      }
    });
  }

  testConnectivity(silent: boolean = false) {
    this.testingConnection.set(true);
    const connParams = this.configForm.get('connectivity')?.value;

    this.botService.testConnectivity(connParams).subscribe({
      next: (res) => {
        this.testingConnection.set(false);
        if (res.mt5Connected) {
          this.botService.setConnectionStatus('CONNECTED');
          this.ping = res.mt5LatencyMs || 45;
          if (!silent) {
            this.toastService.show(`Connected: ${res.mt5AccountInfo}`, 'success');
          }
          this.refreshAccountList(); // Refresh list on success
        } else {
          this.botService.setConnectionStatus('DISCONNECTED');
          const msg = res.mt5Message || res.aiMessage || 'Connection Failed';
          if (!silent) {
            this.toastService.show(msg, 'error');
          }
        }
      },
      error: (err) => {
        this.testingConnection.set(false);
        this.botService.setConnectionStatus('DISCONNECTED');

        if (!silent) {
          this.toastService.show('⚠️ No account connected — check your credentials and MT5 connector.', 'error');
        }
      }
    });
  }

  disconnect() {
    this.botService.explicitDisconnect();
    this.toastService.show('Disconnected from Exchange', 'info');
  }

  // ── Targeted Scan ──
  runTargetedScan() {
    const symbolList = this.configForm.get('executionParameters.symbols')?.value;
    const symbol = (symbolList && symbolList.length > 0) ? symbolList[0] : 'EURUSD';
    const timeframe = this.configForm.get('executionParameters.timeframe')?.value || 'H1';

    this.isScanning.set(true);
    this.scanResult.set(null);

    this.botService.runTargetedScan(symbol, timeframe).subscribe({
      next: (result) => {
        this.isScanning.set(false);
        this.scanResult.set(result);
        this.toastService.show(`AI scan complete: ${result.action} (${Math.round(result.confidence * 100)}%)`, result.action === 'HOLD' ? 'info' : 'success');
      },
      error: (err) => {
        this.isScanning.set(false);
        const msg = err.error?.error || 'Scan failed. Check your connection and AI engine.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  // ── Execute AI-Suggested Trade ──
  executeAiTrade() {
    const scan = this.scanResult();
    if (!scan || scan.action === 'HOLD') return;

    if (this.connectionStatus !== 'CONNECTED') {
      this.toastService.show('Please connect to exchange first!', 'error');
      return;
    }

    this.isExecutingTrade.set(true);

    const trade = {
      symbol: scan.symbol,
      action: scan.action,
      price: scan.entryPrice,
      quantity: 0.1,
      sl: scan.sl,
      tp: scan.tp
    };

    this.botService.executeManualTrade(trade).subscribe({
      next: () => {
        this.isExecutingTrade.set(false);
        this.toastService.show(`✅ ${scan.action} trade executed on MT5!`, 'success');
        this.scanResult.set(null);
      },
      error: (err) => {
        this.isExecutingTrade.set(false);
        const msg = typeof err.error === 'string' ? err.error : 'Trade rejected by Risk Engine';
        this.toastService.show(msg, 'error');
      }
    });
  }

  dismissScanResult() {
    this.scanResult.set(null);
  }

  // ── Manual Override Trade ──
  async executeManualTrade(action: 'BUY' | 'SELL') {
    if (this.connectionStatus !== 'CONNECTED') {
      this.toastService.show('Please connect to exchange first!', 'error');
      return;
    }

    const symbolList = this.configForm.get('executionParameters.symbols')?.value;
    const symbol = (symbolList && symbolList.length > 0) ? symbolList[0] : 'EURUSD';

    const confirmed = await this.modalService.confirm({
      title: `Confirm ${action} Trade`,
      message: `Are you sure you want to execute a MANUAL ${action} trade on ${symbol}?`,
      confirmLabel: 'Yes, Execute',
      cancelLabel: 'Cancel',
      type: action === 'SELL' ? 'danger' : 'info'
    });

    if (confirmed) {
      const trade = {
        symbol: symbol,
        action: action,
        price: 0.0,
        quantity: 0.1,
        sl: 0.0,
        tp: 0.0
      };

      this.botService.executeManualTrade(trade).subscribe({
        next: () => this.toastService.show(`${action} Order Sent`, 'success'),
        error: (err) => this.toastService.show('Order execution failed', 'error')
      });
    }
  }
}
