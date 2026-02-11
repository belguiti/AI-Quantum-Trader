import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: Date;
    category: 'FINANCE' | 'REAL_ESTATE' | 'MARKET' | 'GOLD' | 'CRYPTO' | 'FOREX';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    url: string;
}

@Injectable({
    providedIn: 'root'
})
export class NewsService {

    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8086/api/news';

    // State
    newsFeed = signal<NewsItem[]>([]);
    currentPage = signal(0);
    pageSize = signal(10);
    hasMore = signal(true);
    isLoading = signal(false);

    categories: string[] = ['FINANCE', 'REAL_ESTATE', 'MARKET', 'GOLD', 'CRYPTO', 'FOREX'];

    constructor() {
        this.startLiveUpdates();
    }

    private startLiveUpdates() {
        // Initial fetch
        this.fetchNews(0, true);

        // Poll every 60 seconds (refresh top)
        interval(60000).subscribe(() => {
            this.fetchNews(0, true);
        });
    }

    fetchNews(page: number, refresh: boolean = false) {
        this.isLoading.set(true);
        this.http.get<any[]>(`${this.apiUrl}?page=${page}&size=${this.pageSize()}`).pipe(
            map(items => items.map(item => ({
                ...item,
                publishedAt: new Date(item.publishedAt)
            }))),
            catchError(err => {
                console.error('Error fetching news:', err);
                return of([]);
            })
        ).subscribe(items => {
            this.isLoading.set(false);
            if (refresh) {
                this.newsFeed.set(items);
                this.currentPage.set(0);
                this.hasMore.set(true);
            } else {
                // Append if load more
                if (items.length > 0) {
                    this.newsFeed.update(current => [...current, ...items]);
                }

                if (items.length < this.pageSize()) {
                    this.hasMore.set(false);
                }
            }
        });
    }

    loadMore() {
        if (this.hasMore() && !this.isLoading()) {
            this.currentPage.update(p => p + 1);
            this.fetchNews(this.currentPage());
        }
    }

    getNewsByCategory(category: string) {
        if (category === 'ALL') return this.newsFeed();
        return this.newsFeed().filter(n => n.category === category);
    }
}
