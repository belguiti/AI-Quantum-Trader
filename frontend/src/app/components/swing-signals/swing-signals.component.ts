import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';
import { Opportunity } from '../../models/opportunity.model';

@Component({
    selector: 'app-swing-signals',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './swing-signals.component.html',
    styleUrls: ['./swing-signals.component.css']
})
export class SwingSignalsComponent implements OnInit {
    opportunities: Opportunity[] = [];
    loading = false;
    error = '';

    constructor(private tradeService: TradeService) { }

    ngOnInit(): void {
        this.refresh();
    }

    refresh(): void {
        this.loading = true;
        this.tradeService.getSwingOpportunities().subscribe({
            next: (data) => {
                this.opportunities = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load swing signals', err);
                this.error = 'Could not load swing opportunities.';
                this.loading = false;
            }
        });
    }

    getProfitPotential(opp: Opportunity): number {
        if (opp.tp && opp.entryPrice) {
            // approx
            return ((opp.tp - opp.entryPrice) / opp.entryPrice) * 100 * (opp.side === 'SELL' ? -1 : 1);
        }
        return 0;
    }
}
