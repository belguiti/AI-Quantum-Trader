export interface Trade {
    id: number;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    timestamp: string;
    status: 'PENDING' | 'EXECUTED' | 'FAILED';
}
