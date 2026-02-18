import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
export class MacroDataComponent implements OnInit, OnDestroy {
    data: MacroDashboardData | null = null;
    loading = true;
    error = '';

    // Timer
    private timerInterval: any;

    // Filters
    startDate: string = '';
    endDate: string = '';

    availableCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];
    selectedCurrencies: { [key: string]: boolean } = { 'USD': true, 'EUR': true, 'GBP': true };

    availableImpacts = ['High', 'Medium', 'Low'];
    selectedImpacts: { [key: string]: boolean } = { 'High': true, 'Medium': true, 'Low': true };

    // Display Data
    upcomingHighImpact: MacroEvent[] = [];
    displayedEvents: MacroEvent[] = [];

    constructor(private macroService: MacroDataService, private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.setToday();
        this.fetchData();

        // Update countdowns every minute
        this.timerInterval = setInterval(() => {
            // Force change detection or just let angular handle it if getter used in template
        }, 60000);
    }

    ngOnDestroy(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    setToday(): void {
        const today = new Date();
        this.startDate = today.toISOString().split('T')[0];
        // Default end date: 7 days from now
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        this.endDate = nextWeek.toISOString().split('T')[0];
    }

    setThisWeek(): void {
        this.setToday();
        this.applyFilter();
    }

    fetchData(): void {
        this.loading = true;
        this.macroService.getDashboardData().subscribe({
            next: (data) => {
                // Fix NG0100: Wrap in setTimeout to update state in next cycle
                setTimeout(() => {
                    this.data = data;
                    this.processData();
                    this.loading = false;
                    this.cdr.detectChanges(); // Force detection
                }, 0);
            },
            error: (err) => {
                console.error('Failed to load macro data', err);
                this.error = 'Failed to load economic data.';
                setTimeout(() => this.loading = false, 0);
            }
        });
    }

    processData(): void {
        if (!this.data) return;

        // Extract "Upcoming High Impact" for top cards
        // Logic: Date >= Today AND Impact = High. Limit to 6.
        const todayStr = new Date().toISOString().split('T')[0];

        this.upcomingHighImpact = this.data.allEvents
            .filter(e => e.date >= todayStr && e.impact === 'High')
            .sort((a, b) => a.date.localeCompare(b.date)) // Ascending for upcoming
            .slice(0, 6);

        this.applyFilter();
    }

    applyFilter(): void {
        if (!this.data) return;

        let events = this.data.allEvents;

        // Date Filter
        if (this.startDate) {
            events = events.filter(e => e.date >= this.startDate);
        }
        if (this.endDate) {
            events = events.filter(e => e.date <= this.endDate);
        }

        // Currency Filter
        const activeCurrencies = Object.keys(this.selectedCurrencies).filter(k => this.selectedCurrencies[k]);
        if (activeCurrencies.length > 0) {
            events = events.filter(e => activeCurrencies.includes(e.currency));
        }

        // Impact Filter
        const activeImpacts = Object.keys(this.selectedImpacts).filter(k => this.selectedImpacts[k]);
        if (activeImpacts.length > 0) {
            events = events.filter(e => activeImpacts.includes(e.impact));
        }

        this.displayedEvents = events;
    }

    toggleCurrency(curr: string): void {
        this.selectedCurrencies[curr] = !this.selectedCurrencies[curr];
        this.applyFilter();
    }

    toggleImpact(impact: string): void {
        this.selectedImpacts[impact] = !this.selectedImpacts[impact];
        this.applyFilter();
    }

    isCurrencySelected(curr: string): boolean { return !!this.selectedCurrencies[curr]; }
    isImpactSelected(imp: string): boolean { return !!this.selectedImpacts[imp]; }

    getCountdown(dateStr: string): string {
        const eventDate = new Date(dateStr); // Assuming dateStr is YYYY-MM-DD. AV usually provides time too but we only parsed date?
        // If date only, we can't do precise countdown. Fallback to "Tomorrow" etc.
        // Let's assume we want "In 2 Days" or "Today".

        const now = new Date();
        // Reset time part of now for day comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Passed';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        return `in ${diffDays} days`;
    }

    getFlag(currency: string): string {
        const param = currency.toUpperCase();
        switch (param) {
            case 'USD': return '🇺🇸';
            case 'EUR': return '🇪🇺';
            case 'GBP': return '🇬🇧';
            case 'JPY': return '🇯🇵';
            case 'AUD': return '🇦🇺';
            case 'CAD': return '🇨🇦';
            case 'CHF': return '🇨🇭';
            case 'CNY': return '🇨🇳';
            case 'NZD': return '🇳🇿';
            default: return '🏳️';
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
}
