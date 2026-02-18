import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ValuePoint {
    date: string;
    value: string;
}

export interface MacroIndicatorData {
    name: string;
    interval: string;
    unit: string;
    data: ValuePoint[];
}

export interface MacroEvent {
    date: string;
    currency: string;
    event: string;
    actual: string;
    forecast: string;
    previous: string;
    impact: string;
}

export interface MacroDashboardData {
    allEvents: MacroEvent[];
    interestRate: ValuePoint;
    inflation: ValuePoint;
    unemployment: ValuePoint;
}

@Injectable({
    providedIn: 'root'
})
export class MacroDataService {
    private apiUrl = 'http://localhost:8081/api/macro';

    constructor(private http: HttpClient) { }

    getDashboardData(): Observable<MacroDashboardData> {
        return this.http.get<MacroDashboardData>(`${this.apiUrl}/dashboard`);
    }
}
