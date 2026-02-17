import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
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
            webSocketFactory: () => new SockJS('http://localhost:8080/ws-trade'),
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

    subscribeToTopic(topic: string): Observable<any> {
        return new Observable((observer) => {
            const subscribe = () => {
                if (this.client.connected) {
                    const subscription = this.client.subscribe(topic, (message) => {
                        observer.next(message);
                    });
                    return () => subscription.unsubscribe();
                } else {
                    // Retry or queue? For now, simple retry
                    const interval = setInterval(() => {
                        if (this.client.connected) {
                            clearInterval(interval);
                            const subscription = this.client.subscribe(topic, (message) => {
                                observer.next(message);
                            });
                            // We need to return the unsubscribe logic to the observable, but dealing with async subscription is tricky here.
                            // Better approach: use RXJS filter
                        }
                    }, 500);
                    return () => clearInterval(interval);
                }
            };

            // Clean implementation
            // If connected, subscribe immediately
            let subscription: any;

            const checkAndSub = () => {
                if (this.client.connected) {
                    subscription = this.client.subscribe(topic, (msg) => observer.next(msg));
                } else {
                    setTimeout(checkAndSub, 500);
                }
            };

            checkAndSub();

            return () => {
                if (subscription) subscription.unsubscribe();
            };
        });
    }
}
