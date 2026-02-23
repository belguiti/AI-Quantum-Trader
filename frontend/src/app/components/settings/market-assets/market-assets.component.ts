import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketService } from '../../../services/market.service';
import { MarketAsset } from '../../../models/opportunity.model';

@Component({
    selector: 'app-market-assets',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './market-assets.component.html',
    styleUrls: ['./market-assets.component.css']
})
export class MarketAssetsComponent implements OnInit {
    assets: MarketAsset[] = [];
    isLoading = true;
    showAddModal = false;

    newAsset: Partial<MarketAsset> = {
        symbol: '',
        brokerSymbol: '',
        assetClass: 'FOREX',
        isActive: true
    };

    assetClasses = ['CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'STOCK'];

    constructor(private marketService: MarketService) { }

    ngOnInit() {
        this.loadAssets();
    }

    loadAssets() {
        this.isLoading = true;
        this.marketService.getMarketAssets().subscribe({
            next: (data: MarketAsset[]) => {
                this.assets = data;
                this.isLoading = false;
            },
            error: (err: any) => {
                console.error('Failed to load assets', err);
                this.isLoading = false;
            }
        });
    }

    toggleAsset(asset: MarketAsset) {
        this.marketService.toggleAsset(asset.id!).subscribe({
            next: (updated: MarketAsset) => {
                asset.isActive = updated.isActive;
            },
            error: (err: any) => console.error('Failed to toggle asset', err)
        });
    }

    addAsset() {
        if (!this.newAsset.symbol || !this.newAsset.brokerSymbol) return;

        this.marketService.createAsset(this.newAsset as MarketAsset).subscribe({
            next: (created: MarketAsset) => {
                this.assets.push(created);
                this.showAddModal = false;
                this.resetForm();
            },
            error: (err: any) => console.error('Failed to create asset', err)
        });
    }

    deleteAsset(id: number) {
        if (confirm('Are you sure you want to delete this asset?')) {
            this.marketService.deleteAsset(id).subscribe({
                next: () => {
                    this.assets = this.assets.filter(a => a.id !== id);
                },
                error: (err: any) => console.error('Failed to delete asset', err)
            });
        }
    }

    resetForm() {
        this.newAsset = {
            symbol: '',
            brokerSymbol: '',
            assetClass: 'FOREX',
            isActive: true
        };
    }
}
