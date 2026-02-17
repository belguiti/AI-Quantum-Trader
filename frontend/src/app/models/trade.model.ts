export interface Trade {
    id: number;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    pnl?: number;
    entryTime: string;
    exitTime?: string;
    status: 'OPEN' | 'EXECUTED' | 'CLOSED' | 'FAILED';
    strategyBreakdown?: string;
}
