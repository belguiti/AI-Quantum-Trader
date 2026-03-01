import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    proSubscriptions: number;
    freeSubscriptions: number;
    trialSubscriptions: number;
    trades24h: number;
    platformNetPnl: number;
    userGrowth: { date: string; count: number }[];
    symbolBreakdown: { symbol: string; count: number; percentage: number }[];
}

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    createdAt: string;
    isActive: boolean;
    subscriptionPlan: string;
    paymentStatus: string;
    dataUsage: number;
    role: string;
    totalTrades: number;
    winRate: number;
    totalProfit: number;
}

export interface CrowdSignal {
    symbol: string;
    direction: 'BUY' | 'SELL';
    sentiment: number;
    label: string;
    traderCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private baseUrl = 'http://localhost:8080/api/admin';

    constructor(private http: HttpClient) { }

    getStats(): Observable<AdminStats> {
        return this.http.get<AdminStats>(`${this.baseUrl}/stats`);
    }

    getUsers(): Observable<AdminUser[]> {
        return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
    }

    toggleBan(userId: number): Observable<AdminUser> {
        return this.http.put<AdminUser>(`${this.baseUrl}/users/${userId}/ban`, {});
    }

    updateSubscription(userId: number, subscriptionPlan: string, paymentStatus: string): Observable<AdminUser> {
        return this.http.put<AdminUser>(`${this.baseUrl}/users/${userId}/subscription`, { subscriptionPlan, paymentStatus });
    }

    resetDataUsage(userId: number): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/users/${userId}/reset-usage`, {});
    }

    getCrowdSignals(): Observable<CrowdSignal[]> {
        return this.http.get<CrowdSignal[]>(`${this.baseUrl}/crowd-signals`);
    }

    updateRole(userId: number, role: string): Observable<AdminUser> {
        return this.http.put<AdminUser>(`${this.baseUrl}/users/${userId}/role`, { role });
    }

    downgradeToFree(userId: number): Observable<AdminUser> {
        return this.http.put<AdminUser>(`${this.baseUrl}/users/${userId}/subscription`, {
            subscriptionPlan: 'FREE',
            paymentStatus: 'ACTIVE'
        });
    }
}
