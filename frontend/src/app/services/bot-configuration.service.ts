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

    private connectionStatusSubject = new BehaviorSubject<string>(localStorage.getItem('connectionStatus') || 'DISCONNECTED');
    public connectionStatus$ = this.connectionStatusSubject.asObservable();

    private heartbeatInterval: any;
    private lastConnParams: ConnectivityParameters | null = null;
    private isReconnecting = false;

    constructor(private http: HttpClient) {
        // If we think we are connected on load, start heartbeat immediately
        if (this.connectionStatusSubject.value === 'CONNECTED') {
            // We need params to heartbeat. If we don't have them in memory (reload),
            // we might need to fetch active config first? 
            // Or we can just fetch config on init.
            this.initializeSession();
        }
    }

    private initializeSession() {
        this.getConfiguration().subscribe(config => {
            if (config && config.connectivity) {
                this.lastConnParams = config.connectivity;
                if (this.connectionStatusSubject.value === 'CONNECTED') {
                    this.startHeartbeat();
                }
            }
        });
    }

    setConnectionStatus(status: string) {
        localStorage.setItem('connectionStatus', status);
        this.connectionStatusSubject.next(status);

        if (status === 'CONNECTED') {
            this.startHeartbeat();
        } else {
            this.stopHeartbeat();
        }
    }

    // Capture params when testing successfully
    testConnectivity(config: ConnectivityParameters): Observable<ConnectivityTestResult> {
        return this.http.post<ConnectivityTestResult>(`${this.connUrl}/test`, config).pipe(
            tap(res => {
                if (res.mt5Connected) {
                    this.lastConnParams = config;
                    this.setConnectionStatus('CONNECTED'); // Ensure heartbeat starts
                }
            })
        );
    }

    private startHeartbeat() {
        this.stopHeartbeat(); // Clear existing
        console.log('Starting MT5 Connection Heartbeat...');

        this.heartbeatInterval = setInterval(() => {
            if (!this.lastConnParams) return;

            // We pass the params. If password is empty/masked, backend handles it (as fixed previously).
            if (this.isReconnecting) return;

            this.http.post<ConnectivityTestResult>(`${this.connUrl}/test`, this.lastConnParams).subscribe({
                next: (res) => {
                    if (!res.mt5Connected) {
                        console.warn('Heartbeat: Connection lost. Auto-reconnecting...');
                        this.handleDisconnection();
                    } else {
                        // All good
                        // console.log('Heartbeat: OK'); 
                    }
                },
                error: (err) => {
                    console.error('Heartbeat: Error', err);
                    this.handleDisconnection();
                }
            });
        }, 15000); // Check every 15 seconds
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private handleDisconnection() {
        // Attempt one immediate retry or just mark disconnected?
        // Let's try to verify once more or just mark disconnected if critical.
        // Actually, if backend says disconnected, we are disconnected.
        // We can try to "auto-reconnect" by just calling test again? 
        // If the heartbeat failed, calling it again with same params might fail again if MT5 is down.
        // But if it was a transient network issue, next heartbeat might pick it up.
        // For now, let's NOT flip state to DISCONNECTED immediately to avoid UI flickering, 
        // unless it fails X times. But simple approach:

        // If we want "auto-reconnect", we largely just keep trying. 
        // If we want to notify user, we set DISCONNECTED.

        // Let's set to DISCONNECTED so user knows, BUT maybe we auto-retry in background?
        // User asked to "handle session", usually implies "keep me connected".

        // Implementation: Do nothing on first fail? 
        // Let's just update status. The user will see red.
        // But if they navigation, we want it to ideally be connected.

        this.setConnectionStatus('DISCONNECTED');
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
}
