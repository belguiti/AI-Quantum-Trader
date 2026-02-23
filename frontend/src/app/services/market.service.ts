import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketAsset } from '../models/opportunity.model';

@Injectable({
    providedIn: 'root'
})
export class MarketService {
    private apiUrl = 'http://localhost:8080/api/market-assets';

    constructor(private http: HttpClient) { }

    getMarketAssets(): Observable<MarketAsset[]> {
        return this.http.get<MarketAsset[]>(this.apiUrl);
    }

    createAsset(asset: MarketAsset): Observable<MarketAsset> {
        return this.http.post<MarketAsset>(this.apiUrl, asset);
    }

    toggleAsset(id: number): Observable<MarketAsset> {
        return this.http.put<MarketAsset>(`${this.apiUrl}/${id}/toggle`, {});
    }

    deleteAsset(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
