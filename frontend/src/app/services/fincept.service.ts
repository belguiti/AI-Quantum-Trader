import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AssetHealthRule { rule: string; action: string; severity: 'high' | 'medium' | 'info'; }
export interface AssetHealth {
  symbol: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendation: 'TRADE' | 'CAUTION' | 'REDUCE' | 'AVOID';
  dynamic_risk_pct: number;
  metrics: { var_95: number; volatility: number; sharpe: number; sortino: number; max_drawdown: number; };
  rules: AssetHealthRule[];
  data_points: number;
  as_of: string;
}

export interface MetricsResult {
  symbol: string; var_95: number; var_99: number; sharpe: number;
  sortino: number; calmar: number; max_drawdown: number; volatility: number;
  total_return: number; dcf_score: number; data_points: number;
}

export interface MacroIndicator {
  key: string; label: string; value: number; change: number;
  unit: string; category: string; trend: 'up' | 'down' | 'flat';
}

export interface SentimentPost { source: string; text: string; score: number; upvotes: number; }
export interface SentimentResult {
  symbol: string; score: number; label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  posts: SentimentPost[]; post_count: number;
}

export interface PersonaMeta { key: string; name: string; avatar: string; color: string; }
export interface AgentExplanation {
  persona: string; persona_key: string; avatar: string; color: string;
  symbol: string; signal: string; rationale: string; confidence: number;
}

export interface BrokerStatus {
  name: string; type: string; connected: boolean; latency_ms: number;
  note: string; active: boolean; last_checked: string;
}

@Injectable({ providedIn: 'root' })
export class FinceptService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8006';

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.base}/health`)
      .pipe(catchError(() => of({ status: 'offline' })));
  }

  // Asset Health
  getAssetHealth(symbol: string, lookbackDays = 365): Observable<AssetHealth> {
    return this.http.get<AssetHealth>(`${this.base}/asset-health/${symbol}?lookback_days=${lookbackDays}`);
  }

  // Phase 1
  computeMetrics(symbol: string, startDate: string, endDate: string): Observable<MetricsResult> {
    return this.http.post<MetricsResult>(`${this.base}/analytics/metrics`,
      { symbol, start_date: startDate, end_date: endDate });
  }

  // Phase 2
  getMacroIndicators(): Observable<MacroIndicator[]> {
    return this.http.get<MacroIndicator[]>(`${this.base}/macro/indicators`);
  }

  // Phase 3
  getSentiment(symbol: string): Observable<SentimentResult> {
    return this.http.get<SentimentResult>(`${this.base}/sentiment/${symbol}`);
  }

  // Phase 4
  getPersonas(): Observable<PersonaMeta[]> {
    return this.http.get<PersonaMeta[]>(`${this.base}/agents/personas`);
  }
  explainSignal(persona: string, symbol: string, signal: string): Observable<AgentExplanation> {
    return this.http.post<AgentExplanation>(`${this.base}/agents/explain`, { persona, symbol, signal });
  }

  getLiveFeatures(symbol: string): Observable<{
    symbol: string; rsi: number; macd: number; volume: number; change: number;
    volatility: number; price: number; prev_close: number; is_live: boolean; as_of: string;
  }> {
    return this.http.get<any>(`${this.base}/features/${symbol}`);
  }

  getMacroRegime(): Observable<{ regime: string; score: number; confidence: number; filter_enabled: boolean }> {
    return this.http.get<any>(`${this.base}/macro/regime`);
  }

  // Macro Filter
  getMacroFilterStatus(): Observable<{ enabled: boolean; regime: { regime: string; confidence: number } | null; redis_available: boolean }> {
    return this.http.get<any>(`${this.base}/macro/filter/status`);
  }
  toggleMacroFilter(enabled: boolean): Observable<{ enabled: boolean }> {
    return this.http.post<{ enabled: boolean }>(`${this.base}/macro/filter/toggle`, { enabled });
  }

  // Phase 5
  getBrokerStatuses(): Observable<BrokerStatus[]> {
    return this.http.get<BrokerStatus[]>(`${this.base}/brokers/status`);
  }
  testBroker(broker: string): Observable<BrokerStatus> {
    return this.http.post<BrokerStatus>(`${this.base}/brokers/test`, { broker });
  }
  activateBroker(broker: string): Observable<{ success: boolean; active_broker: string }> {
    return this.http.post<any>(`${this.base}/brokers/activate`, { broker });
  }
}
