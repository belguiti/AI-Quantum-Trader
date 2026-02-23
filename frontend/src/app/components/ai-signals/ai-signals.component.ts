import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService, Mt5Position } from '../../services/trade.service';
import { Opportunity } from '../../models/opportunity.model';
import { Trade } from '../../models/trade.model';
import { Subscription, interval } from 'rxjs';

@Component({
    selector: 'app-ai-signals',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ai-signals.component.html',
    styleUrl: './ai-signals.component.css'
})
export class AiSignalsComponent implements OnInit, OnDestroy {
    livePositions: Mt5Position[] = [];
    opportunities: Opportunity[] = [];
    trades: Trade[] = [];

    isLoading = true;
    activeTab: 'live' | 'predictions' | 'history' = 'live';

    // Pagination & Filter
    currentPage = 0;
    pageSize = 20;
    totalPages = 0;
    totalElements = 0;
    filterSymbol = '';

    private pollingSubscription!: Subscription;

    constructor(private tradeService: TradeService) { }

    ngOnInit(): void {
        this.loadInitialData();

        // Poll for live positions every 2 seconds
        this.pollingSubscription = interval(2000).subscribe(() => {
            if (this.activeTab === 'live') {
                this.loadLivePositions();
            }
        });
    }

    ngOnDestroy(): void {
        if (this.pollingSubscription) {
            this.pollingSubscription.unsubscribe();
        }
    }

    loadInitialData(): void {
        setTimeout(() => this.isLoading = true);
        if (this.activeTab === 'live') this.loadLivePositions();
        else if (this.activeTab === 'predictions') this.loadSignals();
        else if (this.activeTab === 'history') this.loadTrades();
    }

    loadLivePositions(): void {
        this.tradeService.getLivePositions().subscribe({
            next: (data) => {
                this.livePositions = data;
                // Filter live positions locally if symbol is set
                if (this.filterSymbol) {
                    this.livePositions = data.filter(p => p.symbol.toLowerCase().includes(this.filterSymbol.toLowerCase()));
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load live positions', err);
            }
        });
    }

    loadSignals(): void {
        this.tradeService.getOpportunities(true, this.currentPage, this.pageSize, this.filterSymbol).subscribe({
            next: (page) => {
                this.opportunities = page.content;
                this.totalPages = page.totalPages;
                this.totalElements = page.totalElements;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load signals', err);
                this.isLoading = false;
            }
        });
    }

    loadTrades(): void {
        this.tradeService.getTrades(this.currentPage, this.pageSize, this.filterSymbol).subscribe({
            next: (page) => {
                this.trades = page.content;
                this.totalPages = page.totalPages;
                this.totalElements = page.totalElements;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load trade history', err);
                this.isLoading = false;
            }
        });
    }

    setActiveTab(tab: 'live' | 'predictions' | 'history') {
        this.activeTab = tab;
        this.currentPage = 0; // Reset page on tab switch
        this.filterSymbol = ''; // Reset filter on tab switch? Or keep? Let's reset for now.
        // Actually user might want to keep filter. Let's keep it if possible, but simpler to reset.
        if (tab === 'history') {
            this.triggerSync();
        } else {
            this.loadInitialData();
        }
    }

    triggerSync() {
        setTimeout(() => this.isLoading = true);
        this.tradeService.syncTrades().subscribe({
            next: () => {
                console.log('Trade sync triggered');
                this.loadTrades();
            },
            error: (err) => {
                console.error('Failed to trigger trade sync', err);
                this.loadTrades();
            }
        });
    }

    onFilterChange(symbol: string) {
        this.filterSymbol = symbol;
        this.currentPage = 0; // Reset to first page
        this.loadInitialData();
    }

    onPageChange(page: number) {
        if (page >= 0 && page < this.totalPages) {
            this.currentPage = page;
            this.loadInitialData();
        }
    }

    getBadgeClass(status: string): string {
        if (status === 'APPROVED' || status === 'EXECUTED' || status === 'OPEN') return 'bg-green-500/20 text-green-400 border-green-500/50';
        if (status === 'SL HIT') return 'bg-red-500/20 text-red-400 border-red-500/50';
        if (status === 'TP HIT') return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        if (status === 'CLOSED') return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
        if (status?.includes('REJECTED') || status?.includes('SKIPPED') || status?.includes('RISK')) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        if (status === 'PENDING') return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        if (status === 'FAILED') return 'bg-red-500/20 text-red-400 border-red-500/50';
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
}
