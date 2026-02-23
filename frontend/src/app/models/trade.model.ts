export interface Trade {
    id: number;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    sl?: number;
    tp?: number;
    pnl?: number;
    entryTime: string;
    exitTime?: string;
    status: string;
    strategyBreakdown?: string;
}
