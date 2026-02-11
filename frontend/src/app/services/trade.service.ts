import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Trade } from '../models/trade.model';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    last: boolean;
    size: number;
    number: number;
    // Add other Page fields if needed
}

@Injectable({
    providedIn: 'root'
})
export class TradeService {
    private apiUrl = 'http://localhost:8080/api/trades';
    private stompClient!: Client;
    private tradeUpdatesSubject = new Subject<Trade>();
    private marketPricesSubject = new Subject<any>();

    tradeUpdates$ = this.tradeUpdatesSubject.asObservable();
    marketPrices$ = this.marketPricesSubject.asObservable();

    constructor(private http: HttpClient) {
        this.initializeWebSocket();
    }

    private initializeWebSocket() {
        // Use SockJS for compatibility
        this.stompClient = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws-trade'),
            onConnect: (frame) => {
                console.log('Connected to WebSocket: ' + frame);

                // Subscribe to Trades
                this.stompClient.subscribe('/topic/trades', (message) => {
                    if (message.body) {
                        const trade: Trade = JSON.parse(message.body);
                        this.tradeUpdatesSubject.next(trade);
                    }
                });

                // Subscribe to Market Prices
                this.stompClient.subscribe('/topic/prices', (message) => {
                    if (message.body) {
                        const priceUpdate = JSON.parse(message.body);
                        this.marketPricesSubject.next(priceUpdate);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        });

        this.stompClient.activate();
    }

    getTrades(page: number = 0, size: number = 20): Observable<Page<Trade>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<Page<Trade>>(this.apiUrl, { params });
    }
}
