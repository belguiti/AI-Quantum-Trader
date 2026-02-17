export interface Opportunity {
    id: number;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    entryPrice: number;
    sl: number;
    tp: number;
    predictedWinProbability: number;
    confidence: number;
    strategyBreakdown: string;
    source: string;
    sentimentScore: number;
    createdAt: string;
    status: string;
    // Trade Outcome
    exitPrice?: number;
    pnl?: number;
    exitTime?: string;
    tradeStatus?: string;
}
