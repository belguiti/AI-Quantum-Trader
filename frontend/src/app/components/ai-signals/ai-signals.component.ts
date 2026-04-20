import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeService, Mt5Position } from '../../services/trade.service';
import { BotConfigurationService } from '../../services/bot-configuration.service';
import { FinceptService } from '../../services/fincept.service';
import { Opportunity } from '../../models/opportunity.model';
import { Trade } from '../../models/trade.model';
import { Subscription, interval } from 'rxjs';

@Component({
    selector: 'app-ai-signals',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ai-signals.component.html',
    styleUrls: ['./ai-signals.component.css']
})
export class AiSignalsComponent implements OnInit, OnDestroy {
    livePositions: Mt5Position[] = [];
    opportunities: Opportunity[] = [];
    trades: Trade[] = [];

    isLoading = true;
    activeTab: 'live' | 'predictions' | 'history' | 'live-predict' = 'live';

    // Live Predict tab state
    predictSymbol  = 'BTC-USD';
    useV2          = false;
    predictLoading = false;
    predictError   = '';
    predictResult: any = null;

    // Feature inputs: [RSI, MACD, Volume, Change, Volatility]
    features = { rsi: 50, macd: 0, volume: 100, change: 0, volatility: 20 };
    featuresLoading = false;
    featuresPrice   = '';
    featuresAsOf    = '';
    featuresIsLive  = false;

    assetGroups = [
        { label: 'Crypto',      assets: [{ t: 'BTC-USD', l: 'BTC' }, { t: 'ETH-USD', l: 'ETH' }, { t: 'SOL-USD', l: 'SOL' }, { t: 'BNB-USD', l: 'BNB' }] },
        { label: 'Commodities', assets: [{ t: 'GC=F', l: 'Gold' }, { t: 'SI=F', l: 'Silver' }, { t: 'CL=F', l: 'Oil' }] },
        { label: 'Indices',     assets: [{ t: '^GSPC', l: 'S&P' }, { t: '^NDX', l: 'Nasdaq' }, { t: '^VIX', l: 'VIX' }] },
        { label: 'Stocks',      assets: [{ t: 'AAPL', l: 'AAPL' }, { t: 'NVDA', l: 'NVDA' }, { t: 'TSLA', l: 'TSLA' }, { t: 'MSFT', l: 'MSFT' }] },
        { label: 'Forex',       assets: [{ t: 'EURUSD=X', l: 'EUR/USD' }, { t: 'DX-Y.NYB', l: 'DXY' }] },
    ];

    // Pagination & Filter
    currentPage = 0;
    pageSize = 10;
    totalPages = 0;
    totalElements = 0;
    filterSymbol = '';

    private pollingSubscription!: Subscription;

    constructor(
        private tradeService: TradeService,
        private botService: BotConfigurationService,
        private finceptService: FinceptService
    ) { }

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

    setActiveTab(tab: 'live' | 'predictions' | 'history' | 'live-predict') {
        this.activeTab = tab;
        this.currentPage = 0;
        this.filterSymbol = '';
        if (tab === 'history') {
            this.triggerSync();
        } else if (tab !== 'live-predict') {
            this.loadInitialData();
        }
    }

    pickAsset(ticker: string) {
        this.predictSymbol = ticker;
        this.fetchLiveFeatures();
    }

    fetchLiveFeatures() {
        if (!this.predictSymbol) return;
        this.featuresLoading = true;
        this.predictResult   = null;
        this.predictError    = '';
        this.finceptService.getLiveFeatures(this.predictSymbol.trim().toUpperCase()).subscribe({
            next: f => {
                this.features        = { rsi: f.rsi, macd: f.macd, volume: f.volume, change: f.change, volatility: f.volatility };
                this.featuresPrice   = f.price.toString();
                this.featuresAsOf    = f.as_of;
                this.featuresIsLive  = f.is_live;
                this.featuresLoading = false;
            },
            error: () => { this.featuresLoading = false; }
        });
    }

    runPredict() {
        if (!this.predictSymbol) return;
        this.predictLoading = true;
        this.predictError   = '';
        this.predictResult  = null;

        const featureArr = [
            this.features.rsi,
            this.features.macd,
            this.features.volume,
            this.features.change,
            this.features.volatility,
        ];

        const call = this.useV2
            ? this.botService.predictV2(featureArr, this.predictSymbol.trim().toUpperCase())
            : this.botService.predictV1(featureArr, this.predictSymbol.trim().toUpperCase());

        call.subscribe({
            next: r  => { this.predictResult = r; this.predictLoading = false; },
            error: e => {
                this.predictError   = e?.error?.detail || 'Failed — is AI Engine running on port 8000?';
                this.predictLoading = false;
            }
        });
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

    get pages(): number[] {
        const arr: number[] = [];
        for (let i = 0; i < this.totalPages; i++) arr.push(i);
        return arr;
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
