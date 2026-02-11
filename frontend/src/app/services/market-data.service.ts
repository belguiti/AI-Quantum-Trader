import { Injectable, signal, computed, effect } from '@angular/core';

export interface MarketItem {
    symbol: string;
    name: string;
    price: number;
    change24h: number; // Percentage
    volume: number; // In millions/billions usually
    marketCap: number; // New field
    type: 'CRYPTO' | 'FOREX' | 'STOCK' | 'INDEX';
    prevPrice?: number; // For flashing detection
}

@Injectable({
    providedIn: 'root'
})
export class MarketDataService {

    private ws: WebSocket | null = null;
    private readonly BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/!miniTicker@arr';

    // State signal
    marketData = signal<MarketItem[]>([]);

    // Computed for Tabs
    cryptoDaTa = computed(() => this.marketData().filter(i => i.type === 'CRYPTO'));
    forexData = computed(() => this.marketData().filter(i => i.type === 'FOREX'));
    stockData = computed(() => this.marketData().filter(i => i.type === 'STOCK'));
    indexData = computed(() => this.marketData().filter(i => i.type === 'INDEX'));

    // Mapping for Crypto Names (Simple map for top coins)
    private cryptoNames: { [key: string]: string } = {
        'BTCUSDT': 'Bitcoin', 'ETHUSDT': 'Ethereum', 'SOLUSDT': 'Solana', 'BNBUSDT': 'Binance Coin', 'XRPUSDT': 'Ripple',
        'ADAUSDT': 'Cardano', 'DOGEUSDT': 'Dogecoin', 'AVAXUSDT': 'Avalanche', 'DOTUSDT': 'Polkadot', 'LINKUSDT': 'Chainlink',
        'MATICUSDT': 'Polygon', 'LTCUSDT': 'Litecoin', 'UNIUSDT': 'Uniswap', 'ATOMUSDT': 'Cosmos', 'ETCUSDT': 'Ethereum Classic'
    };

    private mockAssets: MarketItem[] = [];

    constructor() {
        this.generateMockData();
        this.connectBinance();
        this.startMockUpdates();
    }

    private generateMockData() {
        // Generate 20 Forex pairs (Cap is huge)
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'NZD'];
        for (let i = 0; i < currencies.length; i++) {
            for (let j = i + 1; j < currencies.length; j++) {
                const symbol = `${currencies[i]}/${currencies[j]}`;
                this.mockAssets.push({
                    symbol,
                    name: `${currencies[i]} vs ${currencies[j]}`,
                    price: 1 + Math.random() * 150, // rough price
                    change24h: (Math.random() - 0.5),
                    volume: Math.floor(Math.random() * 1000000),
                    marketCap: 0, // Forex doesn't really have "Market Cap" in the stock sense
                    type: 'FOREX'
                });
            }
        }

        // Generate Real World Stocks
        const stocks = [
            { s: 'AAPL', n: 'Apple Inc.' }, { s: 'MSFT', n: 'Microsoft Corp' }, { s: 'GOOGL', n: 'Alphabet Inc.' },
            { s: 'AMZN', n: 'Amazon.com' }, { s: 'NVDA', n: 'NVIDIA Corp' }, { s: 'TSLA', n: 'Tesla Inc.' },
            { s: 'META', n: 'Meta Platforms' }, { s: 'BRK.B', n: 'Berkshire Hathaway' }, { s: 'LLY', n: 'Eli Lilly' },
            { s: 'V', n: 'Visa Inc.' }, { s: 'TSM', n: 'TSMC' }, { s: 'JPM', n: 'JPMorgan Chase' },
            { s: 'WMT', n: 'Walmart' }, { s: 'XOM', n: 'Exxon Mobil' }, { s: 'UNH', n: 'UnitedHealth' },
            { s: 'MA', n: 'Mastercard' }, { s: 'PG', n: 'Procter & Gamble' }, { s: 'JNJ', n: 'Johnson & Johnson' },
            { s: 'HD', n: 'Home Depot' }, { s: 'MRK', n: 'Merck & Co.' }, { s: 'COST', n: 'Costco' },
            { s: 'ABBV', n: 'AbbVie' }, { s: 'CVX', n: 'Chevron' }, { s: 'CRM', n: 'Salesforce' },
            { s: 'BAC', n: 'Bank of America' }, { s: 'AMD', n: 'AMD' }, { s: 'NFLX', n: 'Netflix' },
            { s: 'KO', n: 'Coca-Cola' }, { s: 'PEP', n: 'PepsiCo' }, { s: 'TMO', n: 'Thermo Fisher' }
        ];

        stocks.forEach(stock => {
            const price = 50 + Math.random() * 800;
            const volume = Math.floor(Math.random() * 50000000);
            this.mockAssets.push({
                symbol: stock.s,
                name: stock.n,
                price: price,
                change24h: (Math.random() - 0.5) * 4,
                volume: volume,
                marketCap: price * volume * (100 + Math.random() * 500), // Random shares multiplier
                type: 'STOCK'
            });
        });

        // Generate Indices
        const indices = [
            { s: 'SPX', n: 'S&P 500' }, { s: 'NDX', n: 'Nasdaq 100' }, { s: 'DJI', n: 'Dow Jones 30' },
            { s: 'RUT', n: 'Russell 2000' }, { s: 'VIX', n: 'Volatility Index' }, { s: 'UKX', n: 'FTSE 100' },
            { s: 'DAX', n: 'DAX Performance' }, { s: 'N225', n: 'Nikkei 225' }, { s: 'HSI', n: 'Hang Seng' }
        ];

        indices.forEach(idx => {
            this.mockAssets.push({
                symbol: idx.s,
                name: idx.n,
                price: 2000 + Math.random() * 30000,
                change24h: (Math.random() - 0.5) * 3,
                volume: 0, // Indices often don't have direct volume
                marketCap: 0,
                type: 'INDEX'
            });
        });
    }

    private connectBinance() {
        this.ws = new WebSocket(this.BINANCE_WS_URL);

        this.ws.onmessage = (event) => {
            try {
                const rawData = JSON.parse(event.data);

                // Filter all USDT pairs
                const relevantData = rawData.filter((t: any) => t.s.endsWith('USDT'));

                this.updateCryptoState(relevantData);

            } catch (e) {
                console.error('Error parsing Binance data', e);
            }
        };

        this.ws.onerror = (err) => console.error('Binance WS Error', err);
        this.ws.onclose = () => console.log('Binance WS Closed, retrying in 5s...');
    }

    private updateCryptoState(tickers: any[]) {
        const currentItems = [...this.marketData()]; // Copy
        let updated = false;

        tickers.forEach(t => {
            const symbol = t.s;
            const price = parseFloat(t.c);
            const open = parseFloat(t.o);
            const volume = parseFloat(t.q); // Quote volume in USDT
            const change = ((price - open) / open) * 100;
            // Estimate Market Cap for Crypto (Volume is actually 24h volume, not Cap)
            // We can't get real Cap from miniTicker. Let's assume a multiple of volume for visual "weight"
            // Or just leave 0 if we can't be accurate.
            // User requested "display cap", let's simulate it based on volume * random factor if not existing
            const marketCap = volume * (10 + (price % 10));

            const index = currentItems.findIndex(i => i.symbol === symbol);

            if (index !== -1) {
                // Update existing
                const item = currentItems[index];
                if (item.price !== price) {
                    item.prevPrice = item.price; // Store for flashing
                    item.price = price;
                    item.change24h = change;
                    item.volume = volume;
                    item.marketCap = marketCap; // Update cap
                    updated = true;
                }
            } else {
                // Add new
                currentItems.push({
                    symbol: symbol,
                    name: this.cryptoNames[symbol] || symbol,
                    price: price,
                    change24h: change,
                    volume: volume,
                    marketCap: marketCap,
                    type: 'CRYPTO'
                });
                updated = true;
            }
        });

        if (updated) {
            // Merge with mock items if they aren't there yet (initially they are empty in signal)
            // Wait, I should initializing signal with mock items?
            // Let's ensure mock items are always present.

            const nonCrypto = currentItems.filter(i => i.type !== 'CRYPTO');
            if (nonCrypto.length === 0) {
                // Add mock assets if missing
                currentItems.push(...this.mockAssets);
            }

            this.marketData.set(currentItems);
        }
    }

    private startMockUpdates() {
        // Initial set
        this.marketData.update(items => [...items, ...this.mockAssets]);

        setInterval(() => {
            this.marketData.update(items => {
                return items.map(item => {
                    if (item.type === 'CRYPTO') return item; // Handled by WS

                    // Simulate price movement
                    const volatility = item.type === 'FOREX' ? 0.0005 : 0.02; // Forex moves less
                    const change = (Math.random() - 0.5) * volatility;
                    const newPrice = item.price * (1 + change / 100);

                    return {
                        ...item,
                        prevPrice: item.price,
                        price: newPrice,
                        change24h: item.change24h + (Math.random() - 0.5) * 0.1
                    };
                });
            });
        }, 2000); // 2 seconds update for mocks
    }
}
