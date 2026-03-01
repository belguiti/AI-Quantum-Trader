import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService, WalletMetrics, MarketAssetOverview, LivePosition } from '../../services/wallet.service';
import { interval, Subscription, switchMap, forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import 'apexcharts';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationModalComponent } from '../modal/confirmation-modal.component';

@Component({
    selector: 'app-wallet',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule, ConfirmationModalComponent],
    templateUrl: './wallet.component.html',
    styleUrls: ['./wallet.component.css']
})
export class WalletComponent implements OnInit, OnDestroy {
    private walletService = inject(WalletService);
    private modalService = inject(ModalService);
    private toastService = inject(ToastService);

    // State Signals
    metrics = signal<WalletMetrics | null>(null);
    marketOverview = signal<MarketAssetOverview[]>([]);
    livePositions = signal<LivePosition[]>([]);
    loading = signal<boolean>(true);
    closingTickets = signal<Set<number>>(new Set());

    // Polling Subscription
    private pollSub?: Subscription;

    // ApexCharts generic options
    chartOptions = {
        chart: {
            type: 'line' as const,
            sparkline: { enabled: true },
            animations: { enabled: false }
        },
        stroke: {
            curve: 'smooth' as const,
            width: 2
        },
        tooltip: {
            fixed: { enabled: false },
            x: { show: false },
            y: {
                title: { formatter: () => '' }
            },
            marker: { show: false }
        }
    };

    ngOnInit(): void {
        // Initial fetch
        this.fetchData();

        // Poll every 3 seconds for metrics and live positions
        this.pollSub = interval(3000).pipe(
            switchMap(() => forkJoin({
                metrics: this.walletService.getMetrics(),
                positions: this.walletService.getLivePositions()
            }))
        ).subscribe({
            next: (data) => {
                this.metrics.set(data.metrics);
                // Filter out positions we are currently closing on the UI optimistically
                const activeTickets = this.closingTickets();
                this.livePositions.set(data.positions.filter(p => !activeTickets.has(p.ticket)));
            },
            error: (err) => console.error('Error polling wallet updates', err)
        });
    }

    ngOnDestroy(): void {
        if (this.pollSub) {
            this.pollSub.unsubscribe();
        }
    }

    private fetchData() {
        this.loading.set(true);
        forkJoin({
            metrics: this.walletService.getMetrics(),
            overview: this.walletService.getMarketOverview(),
            positions: this.walletService.getLivePositions()
        }).subscribe({
            next: (data) => {
                this.metrics.set(data.metrics);
                this.marketOverview.set(data.overview);
                this.livePositions.set(data.positions);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to fetch initial wallet data', err);
                this.loading.set(false);
            }
        });
    }

    async closePosition(ticket: number) {
        if (this.closingTickets().has(ticket)) return;

        const confirmed = await this.modalService.confirm({
            title: 'Close Position',
            message: `Are you sure you want to close position #${ticket}? This action cannot be undone.`,
            confirmLabel: 'Close Position',
            cancelLabel: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        // Optimistically add to closing set and update local array
        const newClosing = new Set(this.closingTickets()).add(ticket);
        this.closingTickets.set(newClosing);
        this.livePositions.update(positions => positions.filter(p => p.ticket !== ticket));

        this.walletService.closeTrade(ticket).subscribe({
            next: (res) => {
                if (res.success) {
                    this.toastService.show(`Position #${ticket} closed successfully.`, 'success');
                } else {
                    this.toastService.show(`Failed to close position: ${res.message}`, 'error');
                    // Rollback optimism
                    const rollbackClosing = new Set(this.closingTickets());
                    rollbackClosing.delete(ticket);
                    this.closingTickets.set(rollbackClosing);
                }
            },
            error: () => {
                this.toastService.show('Error occurred while closing position.', 'error');
                const rollbackClosing = new Set(this.closingTickets());
                rollbackClosing.delete(ticket);
                this.closingTickets.set(rollbackClosing);
            }
        });
    }

    getSparklineOptions(data: number[], isPositive: boolean) {
        return {
            series: [{ data: data }],
            chart: { ...this.chartOptions.chart },
            stroke: { ...this.chartOptions.stroke },
            tooltip: { ...this.chartOptions.tooltip },
            colors: [isPositive ? '#10b981' : '#f43f5e'] // emerald-400 or rose-400
        };
    }
}
