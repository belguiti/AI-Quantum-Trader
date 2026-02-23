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
    isSwing?: boolean;
    // Trade Outcome
    exitPrice?: number;
    pnl?: number;
    exitTime?: string;
    tradeStatus?: string;

    // Fusion Engine Fields
    primaryCatalyst?: string;
    slPlacementDesc?: string; // e.g. "Below SSL (1.2345)"
    tpPlacementDesc?: string; // e.g. "Next Premium Array (1.2450)"
    assetClass?: 'CRYPTO' | 'FOREX' | 'INDEX' | 'COMMODITY' | 'STOCK';
}

export interface MarketAsset {
    id: number;
    symbol: string;
    brokerSymbol: string;
    assetClass: 'CRYPTO' | 'FOREX' | 'INDEX' | 'COMMODITY' | 'STOCK';
    isActive: boolean;
}
