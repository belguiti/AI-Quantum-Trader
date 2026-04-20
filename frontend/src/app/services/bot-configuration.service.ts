import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export enum StrategyType {
    NEURAL_LEARNER = 'NEURAL_LEARNER',
    RSI_SCALPER = 'RSI_SCALPER',
    TREND_FOLLOWER = 'TREND_FOLLOWER',
    ENSEMBLE = 'ENSEMBLE'
}

export enum RiskRewardRatio {
    RATIO_1_1_5 = 'RATIO_1_1_5',
    RATIO_1_2 = 'RATIO_1_2',
    RATIO_1_3 = 'RATIO_1_3'
}

export enum Broker {
    BINANCE = 'BINANCE',
    MT4 = 'MT4',
    MT5 = 'MT5'
}

export enum AccountType {
    REAL = 'REAL',
    DEMO = 'DEMO'
}

export interface AiParameters {
    lookbackPeriod: number;
    confidenceThreshold: number;
}

export interface RiskParameters {
    stopLossPercentage: number;
    takeProfitPercentage: number;
    riskRewardRatio: RiskRewardRatio;
    maxDailyLossPct: number;
    riskPerTradePct: number;
}

export interface ExecutionParameters {
    symbols: string[];
    timeframe: string;
    maxOpenTrades: number;
}

export interface ConnectivityParameters {
    mt5ConnectorBaseUrl?: string;
    aiEngineBaseUrl?: string;
    enableAiModel?: boolean;
    broker?: Broker;
    accountType?: AccountType;
    apiKey?: string;
    apiSecret?: string;
    mt5Login?: string;
    mt5Password?: string;
    mt5Server?: string;
    mt5Path?: string;
}

export interface BotConfigurationDTO {
    id?: number;
    configName?: string;
    mode: 'MANUAL' | 'AUTO';
    selectedStrategy: StrategyType;
    aiParameters: AiParameters;
    riskParameters: RiskParameters;
    executionParameters: ExecutionParameters;
    connectivity: ConnectivityParameters;
    active?: boolean;
}

export interface ConnectivityTestResult {
    mt5Connected: boolean;
    mt5AccountInfo: string;
    mt5Message?: string;
    mt5LatencyMs?: number;
    aiEngineConnected: boolean;
    aiHealth: string;
    aiMessage?: string;
}

export interface AiPrediction {
    technical_confidence: number;
    sentiment_score: number;
    aggregate_score: number;
    value?: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    symbol?: string;
    reasoning?: string;
}

export interface ExchangeAccount {
    id?: number;
    name: string;
    broker: string; // e.g. MT5
    accountType: string; // DEMO | REAL
    login: string;
    server: string;
    path: string;
    lastConnectedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BotConfigurationService {
    private apiUrl = 'http://localhost:8081/api/bot';
    private tradeUrl = 'http://localhost:8081/api/trades/manual';
    private connUrl = 'http://localhost:8081/api/connectivity';

    private static readonly CONN_PARAMS_KEY = 'lastConnParams';

    private connectionStatusSubject = new BehaviorSubject<string>(localStorage.getItem('connectionStatus') || 'DISCONNECTED');
    public connectionStatus$ = this.connectionStatusSubject.asObservable();

    private heartbeatInterval: any;
    private lastConnParams: ConnectivityParameters | null = null;
    private isReconnecting = false;

    constructor(private http: HttpClient) {
        // Restore non-sensitive params saved from the last successful connection
        const saved = localStorage.getItem(BotConfigurationService.CONN_PARAMS_KEY);
        if (saved) {
            try { this.lastConnParams = JSON.parse(saved); } catch { }
        }

        // Always start heartbeat if we have params — it will verify or reconnect as needed
        if (this.lastConnParams) {
            this.startHeartbeat();
        }
    }

    setConnectionStatus(status: string) {
        localStorage.setItem('connectionStatus', status);
        this.connectionStatusSubject.next(status);
    }

    /** Called when the user explicitly clicks Disconnect — clears saved params and stops heartbeat. */
    explicitDisconnect() {
        this.stopHeartbeat();
        this.lastConnParams = null;
        localStorage.removeItem(BotConfigurationService.CONN_PARAMS_KEY);
        localStorage.setItem('connectionStatus', 'DISCONNECTED');
        this.connectionStatusSubject.next('DISCONNECTED');
    }

    testConnectivity(config: ConnectivityParameters): Observable<ConnectivityTestResult> {
        return this.http.post<ConnectivityTestResult>(`${this.connUrl}/test`, config).pipe(
            tap(res => {
                if (res.mt5Connected) {
                    this.lastConnParams = config;
                    // Persist non-sensitive params (no password) so auto-reconnect survives page refresh
                    const { mt5Password, ...safeParams } = config;
                    localStorage.setItem(BotConfigurationService.CONN_PARAMS_KEY, JSON.stringify(safeParams));
                    this.connectionStatusSubject.next('CONNECTED');
                    localStorage.setItem('connectionStatus', 'CONNECTED');
                    this.startHeartbeat();
                }
            })
        );
    }

    private startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (!this.lastConnParams || this.isReconnecting) return;
            this.isReconnecting = true;

            this.http.post<ConnectivityTestResult>(`${this.connUrl}/test`, this.lastConnParams).subscribe({
                next: (res) => {
                    this.isReconnecting = false;
                    const current = this.connectionStatusSubject.value;
                    if (res.mt5Connected && current !== 'CONNECTED') {
                        // Was disconnected, now reconnected — update status silently
                        this.connectionStatusSubject.next('CONNECTED');
                        localStorage.setItem('connectionStatus', 'CONNECTED');
                    } else if (!res.mt5Connected && current !== 'DISCONNECTED') {
                        this.connectionStatusSubject.next('DISCONNECTED');
                        localStorage.setItem('connectionStatus', 'DISCONNECTED');
                    }
                },
                error: () => {
                    this.isReconnecting = false;
                    if (this.connectionStatusSubject.value !== 'DISCONNECTED') {
                        this.connectionStatusSubject.next('DISCONNECTED');
                        localStorage.setItem('connectionStatus', 'DISCONNECTED');
                    }
                }
            });
        }, 10000); // Check every 10 seconds — reconnects automatically if MT5 comes back
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    saveConfiguration(config: BotConfigurationDTO): Observable<any> {
        return this.http.post(`${this.apiUrl}/configure`, config);
    }

    getConfiguration(): Observable<BotConfigurationDTO> {
        return this.http.get<BotConfigurationDTO>(`${this.apiUrl}/config/active`);
    }

    listConfigurations(): Observable<BotConfigurationDTO[]> {
        return this.http.get<BotConfigurationDTO[]>(`${this.apiUrl}/config/list`);
    }

    loadConfiguration(id: number): Observable<BotConfigurationDTO> {
        return this.http.get<BotConfigurationDTO>(`${this.apiUrl}/config/${id}`);
    }

    listExchangeAccounts(): Observable<ExchangeAccount[]> {
        return this.http.get<ExchangeAccount[]>('http://localhost:8081/api/exchange-accounts');
    }

    executeManualTrade(tradeRequest: any): Observable<any> {
        return this.http.post(this.tradeUrl, tradeRequest, { responseType: 'text' });
    }

    getAiInsights(symbol?: string): Observable<AiPrediction> {
        let url = `${this.apiUrl.replace('/bot', '/stats')}/ai-insights`;
        if (symbol) {
            url += `?symbol=${symbol}`;
        }
        return this.http.get<AiPrediction>(url);
    }

    predictV1(features: number[], symbol: string): Observable<any> {
        return this.http.post('http://localhost:8000/predict', { features, symbol });
    }

    predictV2(features: number[], symbol: string): Observable<any> {
        return this.http.post('http://localhost:8000/predict/v2', { features, symbol });
    }

    runTargetedScan(symbol: string, timeframe: string = 'H1'): Observable<ScanResult> {
        return this.http.post<ScanResult>('http://localhost:8081/api/scan/targeted', { symbol, timeframe });
    }
}

export interface ScanResult {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    mainIdea: string;
    entryPrice: number;
    sl: number;
    tp: number;
    probabilities?: { [key: string]: number };
    featureImportance?: { [key: string]: number };
}
