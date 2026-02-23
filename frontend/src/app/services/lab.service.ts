import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TrainingRequest {
    symbol: string;
    startDate: string;
    endDate: string;
    indicators: string[];
    targetWinRate: number;
    trials: number;
    engineType: string;
    param_ranges?: {
        rsi_buy_min?: number;
        rsi_buy_max?: number;
        rsi_sell_min?: number;
        rsi_sell_max?: number;
        sl_min?: number;
        sl_max?: number;
        tp_min?: number;
        tp_max?: number;
    };
}

export interface TrainingResult {
    jobId: string; // Initially returned
    status: string;
}

export interface ActiveStrategy {
    modelId: number;
    symbol: string;
    name: string;
    totalSignals: number;
    winRate: number;
    expectedReturn: number;
    status: string;
    deployedAt: string;
    lastSignalReasoning?: string;
    lastSignalSentiment?: number;
}

@Injectable({
    providedIn: 'root'
})
export class LabService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8080/api/lab';

    startTraining(request: TrainingRequest): Observable<TrainingResult> {
        return this.http.post<TrainingResult>(`${this.apiUrl}/start-training`, request);
    }

    saveModel(result: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/save-model`, result);
    }

    getActiveStrategies(): Observable<ActiveStrategy[]> {
        return this.http.get<ActiveStrategy[]>(`${this.apiUrl}/active-strategies`);
    }

    getModels(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/models`);
    }
}
