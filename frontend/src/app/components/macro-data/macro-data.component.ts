import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MacroDataService, MacroDashboardData, MacroEvent } from '../../services/macro-data.service';

@Component({
    selector: 'app-macro-data',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './macro-data.component.html',
    styleUrls: ['./macro-data.component.css']
})
export class MacroDataComponent implements OnInit {
    data: MacroDashboardData | null = null;
    loading = true;
    error = '';

    // Filter state
    showOnlyHighImpact = true;
    startDate: string = '';
    endDate: string = '';

    displayedEvents: MacroEvent[] = [];

    constructor(private macroService: MacroDataService) { }

    ngOnInit(): void {
        // Default to last 3 months
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        this.endDate = today.toISOString().split('T')[0];
        this.startDate = threeMonthsAgo.toISOString().split('T')[0];

        this.fetchData();
    }

    fetchData(): void {
        this.loading = true;
        this.macroService.getDashboardData().subscribe({
            next: (data) => {
                this.data = data;
                this.applyFilter();
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to fetch macro data', err);
                this.error = 'Failed to load economic data.';
                this.loading = false;
            }
        });
    }

    toggleFilter(): void {
        this.showOnlyHighImpact = !this.showOnlyHighImpact;
        this.applyFilter();
    }

    onDateChange(): void {
        this.applyFilter();
    }

    applyFilter(): void {
        if (!this.data) return;

        let allEvents = [...this.data.upcomingEvents, ...this.data.recentEvents];

        // Date Filter
        if (this.startDate && this.endDate) {
            allEvents = allEvents.filter(e => e.date >= this.startDate && e.date <= this.endDate);
        }

        if (this.showOnlyHighImpact) {
            this.displayedEvents = allEvents.filter(e => e.impact === 'High');
        } else {
            this.displayedEvents = allEvents;
        }
    }

    getImpactClass(impact: string): string {
        switch (impact.toLowerCase()) {
            case 'high': return 'badge-high';
            case 'medium': return 'badge-medium';
            case 'low': return 'badge-low';
            default: return '';
        }
    }

    getFlag(currency: string): string {
        switch (currency) {
            case 'USD': return '🇺🇸';
            case 'EUR': return '🇪🇺';
            case 'GBP': return '🇬🇧';
            case 'JPY': return '🇯🇵';
            default: return '🏳️';
        }
    }

    isBetter(actual: string, forecast: string): boolean {
        // Simplified logic: High actual is usually "green" for currency strength but depends on event.
        // For Unemployment, Low is better (Green).
        // For CPI, Low is usually better for market sentiment (Green).
        // Since we don't know the event type per row easily without mapping, 
        // we'll stick to a simple diff visual: 
        // If Actual != Forecast, highlight it.
        // Or just color Green if Actual > Forecast? 
        // Prompt says: "Actual > Forecast => Green".
        try {
            const act = parseFloat(actual.replace(/[^0-9.-]/g, ''));
            const fcast = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
            return act > fcast;
        } catch (e) {
            return false;
        }
    }

    isWorse(actual: string, forecast: string): boolean {
        try {
            const act = parseFloat(actual.replace(/[^0-9.-]/g, ''));
            const fcast = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
            return act < fcast;
        } catch (e) {
            return false;
        }
    }
}
