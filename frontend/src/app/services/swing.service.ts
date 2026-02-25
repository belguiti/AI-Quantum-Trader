import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SwingSignalDTO {
    id: number;
    symbol: string;
    side: string;
    entryPrice: number;
    sl: number;
    tp: number;
    confidence: number;
    strategyBreakdown: string;
    createdAt: string;
    status: string;
    exitPrice?: number;
    pnl?: number;
    exitTime?: string;
    tradeStatus?: string;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
    last: boolean;
    first: boolean;
}

@Injectable({ providedIn: 'root' })
export class SwingService {

    private baseUrl = 'http://localhost:8080/api/opportunities';

    constructor(private http: HttpClient) { }

    /** Fetch today's ACTIVE swing setups */
    getTodaySetups(): Observable<SwingSignalDTO[]> {
        return this.http.get<SwingSignalDTO[]>(`${this.baseUrl}/swing/today`);
    }

    /** Fetch paginated swing history (server-side) */
    getHistory(page: number, size: number = 10): Observable<PageResponse<SwingSignalDTO>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<PageResponse<SwingSignalDTO>>(`${this.baseUrl}/swing/history`, { params });
    }

    /** Execute (confirm) a swing trade — Human-in-the-loop */
    executeSwingTrade(id: number): Observable<any> {
        return this.http.post(`${this.baseUrl}/${id}/confirm`, {}, { responseType: 'text' });
    }

    /** Trigger a manual swing scan */
    triggerScan(): Observable<any> {
        return this.http.post(`${this.baseUrl}/swing/scan`, {}, { responseType: 'text' });
    }
}
