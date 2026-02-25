import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { StatsTileComponent } from './stats-tile/stats-tile.component';
import { MarketOverviewComponent } from './market-overview/market-overview.component';
import { ActiveTradesComponent } from './active-trades/active-trades.component';
import { WalletService, WalletMetrics, MarketAssetOverview, LivePosition } from '../../services/wallet.service';
import { interval, Subscription, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, StatsTileComponent, MarketOverviewComponent, ActiveTradesComponent],
  providers: [DecimalPipe],
  template: `
    <div class="space-y-6" style="margin-top: 1.5rem">
      
      <!-- Top Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <app-stats-tile 
          title="Total PnL" 
          [value]="metrics() ? '$' + (metrics()!.totalPnl | number:'1.2-2') : '...'" 
          [change]="0" 
          [progress]="75"
          [iconBgClass]="(metrics()?.totalPnl || 0) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </app-stats-tile>

        <app-stats-tile 
          title="Daily PnL / Floating" 
          [value]="metrics() ? '$' + (metrics()!.dailyPnl | number:'1.2-2') : '...'" 
          [change]="0" 
          [progress]="45"
          [iconBgClass]="(metrics()?.dailyPnl || 0) >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </app-stats-tile>

        <app-stats-tile 
          title="Win Rate" 
          [value]="metrics() ? (metrics()!.winRate | number:'1.1-1') + '%' : '...'" 
          [change]="0" 
          [progress]="metrics()?.winRate || 0"
          iconBgClass="bg-purple-500/10 text-purple-400">
          <svg icon class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </app-stats-tile>

        <app-stats-tile 
          title="Active Bots" 
          [value]="metrics() ? metrics()!.activeBots : '0'" 
          [progress]="(metrics()?.activeBots || 0) * 20"
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
          <app-market-overview [overviewData]="marketOverview()"></app-market-overview>
        </div>

        <!-- Right: Active Trades (2 cols) -->
        <div class="lg:col-span-2 h-full">
          <app-active-trades 
            [trades]="livePositions()" 
            (closeTrade)="handleCloseTrade($event)">
          </app-active-trades>
        </div>

      </div>
    </div>
  `
})
export class DashboardViewComponent implements OnInit, OnDestroy {
  private walletService = inject(WalletService);

  metrics = signal<WalletMetrics | null>(null);
  marketOverview = signal<MarketAssetOverview[]>([]);
  livePositions = signal<LivePosition[]>([]);
  closingTickets = signal<Set<number>>(new Set());

  private pollSubscription?: Subscription;

  ngOnInit() {
    this.fetchInitialData();
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  private fetchInitialData() {
    this.walletService.getMetrics().subscribe({
      next: m => this.metrics.set(m),
      error: e => console.error('Failed to fetch initial wallet data', e)
    });

    this.walletService.getMarketOverview().subscribe(o => this.marketOverview.set(o));
    this.walletService.getLivePositions().subscribe(p => this.livePositions.set(p));
  }

  private startPolling() {
    this.pollSubscription = interval(3000).pipe(
      switchMap(() => forkJoin({
        metrics: this.walletService.getMetrics(),
        positions: this.walletService.getLivePositions(),
        overview: this.walletService.getMarketOverview()
      }))
    ).subscribe({
      next: ({ metrics, positions, overview }) => {
        this.metrics.set(metrics);

        const activeClosing = this.closingTickets();
        const filteredPositions = positions.filter(p => !activeClosing.has(p.ticket));
        this.livePositions.set(filteredPositions);

        this.marketOverview.set(overview);
      },
      error: err => console.error('Error polling wallet updates', err)
    });
  }

  handleCloseTrade(ticket: number) {
    if (this.closingTickets().has(ticket)) return;

    const newClosing = new Set(this.closingTickets()).add(ticket);
    this.closingTickets.set(newClosing);
    this.livePositions.update(positions => positions.filter(p => p.ticket !== ticket));

    this.walletService.closeTrade(ticket).subscribe({
      next: (res) => {
        if (res.success) {
          alert(`Position #${ticket} closed successfully.`);
        } else {
          alert(`Failed to close position: ${res.message}`);
          const rollbackClosing = new Set(this.closingTickets());
          rollbackClosing.delete(ticket);
          this.closingTickets.set(rollbackClosing);
        }
      },
      error: (err) => {
        alert('Error occurred while closing position.');
        const rollbackClosing = new Set(this.closingTickets());
        rollbackClosing.delete(ticket);
        this.closingTickets.set(rollbackClosing);
      }
    });
  }
}
