import { Injectable, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { NewsItem } from './news.service';
import SockJS from 'sockjs-client';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private client: Client;
    latestNews = signal<NewsItem | null>(null);

    constructor() {
        this.client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8086/ws-news'),
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = (frame) => {
            console.log('Connected to WebSocket: ' + frame);

            this.client.subscribe('/topic/news', (message) => {
                if (message.body) {
                    const newsItem: NewsItem = JSON.parse(message.body);
                    // Standardize date
                    newsItem.publishedAt = new Date(newsItem.publishedAt);
                    this.latestNews.set(newsItem);
                }
            });
        };

        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        this.client.activate();
    }
}
