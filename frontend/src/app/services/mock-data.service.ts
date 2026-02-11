import { Injectable, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';

export interface MarketItem {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume24h: number;
    sparkline: number[];
}

export interface Trade {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    amount: number;
    timestamp: number;
    pnl?: number;
}

export interface Portfolio {
    balance: number;
    dailyPnL: number;
    totalPnL: number;
    winRate: number;
    activeBots: number;
    totalTrades: number;
}

@Injectable({
    providedIn: 'root'
})
export class MockDataService {
    // Signals for state management
    readonly portfolio = signal<Portfolio>({
        balance: 100000.00,
        dailyPnL: 1250.50,
        totalPnL: 45000.75,
        winRate: 68.5,
        activeBots: 3,
        totalTrades: 1245
    });

    readonly activeTrades = signal<Trade[]>([]);
    readonly marketData = signal<MarketItem[]>(this.generateInitialMarket());

    // Computed signals
    readonly totalAssetValue = computed(() => {
        return this.activeTrades().reduce((acc, trade) => acc + (trade.price * trade.amount), 0);
    });

    constructor() {
        this.startSimulation();
    }

    private generateInitialMarket(): MarketItem[] {
        const assets = [
            { s: 'BTC', n: 'Bitcoin', p: 64230 },
            { s: 'ETH', n: 'Ethereum', p: 3450 },
            { s: 'SOL', n: 'Solana', p: 145 },
            { s: 'BNB', n: 'Binance Coin', p: 590 },
            { s: 'ADA', n: 'Cardano', p: 0.45 },
            { s: 'XRP', n: 'Ripple', p: 0.62 },
            { s: 'DOGE', n: 'Dogecoin', p: 0.16 },
            { s: 'DOT', n: 'Polkadot', p: 7.20 },
        ];

        return assets.map(a => ({
            symbol: a.s,
            name: a.n,
            price: a.p,
            change24h: (Math.random() * 10) - 5,
            marketCap: a.p * 1000000 * (Math.random() * 10 + 1),
            volume24h: a.p * 50000 * (Math.random() * 10 + 1),
            sparkline: Array.from({ length: 20 }, () => a.p * (1 + (Math.random() * 0.1 - 0.05)))
        }));
    }

    private startSimulation() {
        // Simulate real-time price updates every second
        interval(1000).subscribe(() => {
            this.updateMarketPrices();
            this.updatePortfolio();
            this.simulateTrades();
        });
    }

    private updateMarketPrices() {
        const updated = this.marketData().map(item => {
            const volatility = 0.002; // 0.2% volatility per tick
            const change = 1 + (Math.random() * volatility * 2 - volatility);
            const newPrice = item.price * change;

            // Update sparkline
            const newSparkline = [...item.sparkline.slice(1), newPrice];

            return {
                ...item,
                price: newPrice,
                sparkline: newSparkline,
                change24h: item.change24h + (Math.random() * 0.1 - 0.05)
            };
        });
        this.marketData.set(updated);
    }

    private updatePortfolio() {
        // Simulate PnL changes
        this.portfolio.update(p => ({
            ...p,
            dailyPnL: p.dailyPnL + (Math.random() * 50 - 20),
            balance: p.balance + (Math.random() * 50 - 20)
        }));
    }

    private simulateTrades() {
        if (Math.random() > 0.8) { // 20% chance to execute a trade
            const assets = this.marketData();
            const asset = assets[Math.floor(Math.random() * assets.length)];
            const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
            const amount = Math.random() * 2 + 0.1;

            const newTrade: Trade = {
                id: Math.random().toString(36).substring(7).toUpperCase(),
                symbol: asset.symbol,
                side: side,
                price: asset.price,
                amount: amount,
                timestamp: Date.now(),
                pnl: 0
            };

            this.activeTrades.update(trades => [newTrade, ...trades].slice(0, 50)); // Keep last 50
        }
    }
}
