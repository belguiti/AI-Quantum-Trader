import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketTableComponent } from './market-table/market-table.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, MarketTableComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
    // Logic moved to MarketTableComponent for now
    // Future: Dashboard could have multiple widgets
}
