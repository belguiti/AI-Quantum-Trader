import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WalletMetrics {
    totalBalance: number;
    totalPnl: number;
    dailyPnl: number;
    winRate: number;
    activeBots: number;
}

export interface MarketAssetOverview {
    symbol: string;
    currentPrice: number;
    dailyChangePercent: number;
    sparklineData: number[];
}

export interface LivePosition {
    ticket: number;
    symbol: string;
    type: string;
    volume: number;
    openPrice: number;
    currentPrice: number;
    sl: number;
    tp: number;
    profit: number;
    swap: number;
    commission: number;
    comment: string;
}

export interface OrderResponse {
    success: boolean;
    orderId: string | null;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class WalletService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8081/api/wallet';

    getMetrics(): Observable<WalletMetrics> {
        return this.http.get<WalletMetrics>(`${this.apiUrl}/metrics`);
    }

    getMarketOverview(): Observable<MarketAssetOverview[]> {
        return this.http.get<MarketAssetOverview[]>(`${this.apiUrl}/market/overview`);
    }

    getLivePositions(): Observable<LivePosition[]> {
        return this.http.get<LivePosition[]>(`${this.apiUrl}/trade/live-positions`);
    }

    closeTrade(ticket: number): Observable<OrderResponse> {
        return this.http.post<OrderResponse>(`${this.apiUrl}/trade/close/${ticket}`, {});
    }
}
