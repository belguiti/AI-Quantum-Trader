import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../services/mock-data.service';
import { StatsTileComponent } from './stats-tile/stats-tile.component';
import { MarketOverviewComponent } from './market-overview/market-overview.component';
import { ActiveTradesComponent } from './active-trades/active-trades.component';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, StatsTileComponent, MarketOverviewComponent, ActiveTradesComponent],
  template: `
    <div class="space-y-6">
      
      <!-- Top Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <app-stats-tile 
          title="Total PnL" 
          [value]="'$' + (mockData.portfolio().totalPnL | number:'1.2-2')" 
          [change]="12.5" 
          [progress]="75"
          iconBgClass="bg-green-500/10 text-green-400">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </app-stats-tile>

        <app-stats-tile 
          title="Daily PnL" 
          [value]="'$' + (mockData.portfolio().dailyPnL | number:'1.2-2')" 
          [change]="5.2" 
          [progress]="45"
          iconBgClass="bg-blue-500/10 text-blue-400">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </app-stats-tile>

        <app-stats-tile 
          title="Win Rate" 
          [value]="mockData.portfolio().winRate + '%'" 
          [change]="1.2" 
          [progress]="mockData.portfolio().winRate"
          iconBgClass="bg-purple-500/10 text-purple-400">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </app-stats-tile>

        <app-stats-tile 
          title="Active Bots" 
          [value]="mockData.portfolio().activeBots" 
          [progress]="mockData.portfolio().activeBots * 20"
          iconBgClass="bg-orange-500/10 text-orange-400">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </app-stats-tile>
      </div>

      <!-- Main Grid: Market Overview & Active Trades -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        
        <!-- Left: Market Overview (1 col) -->
        <div class="lg:col-span-1 h-full">
          <app-market-overview></app-market-overview>
        </div>

        <!-- Right: Active Trades (2 cols) -->
        <div class="lg:col-span-2 h-full">
          <app-active-trades></app-active-trades>
        </div>

      </div>
    </div>
  `
})
export class DashboardViewComponent {
  mockData = inject(MockDataService);
}
