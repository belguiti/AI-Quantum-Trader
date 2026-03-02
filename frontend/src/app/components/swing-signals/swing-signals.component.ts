import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwingService, SwingSignalDTO, PageResponse } from '../../services/swing.service';

@Component({
    selector: 'app-swing-signals',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './swing-signals.component.html',
    styleUrls: ['./swing-signals.component.css']
})
export class SwingSignalsComponent implements OnInit {
    private swingService = inject(SwingService);

    // ── Tab State ──
    activeTab = signal<'today' | 'history'>('today');

    // ── Today's Setups ──
    todaySetups = signal<SwingSignalDTO[]>([]);
    todayLoading = signal(false);

    // ── History (Paginated) ──
    historyPage = signal<SwingSignalDTO[]>([]);
    historyLoading = signal(false);
    currentPage = signal(0);
    totalPages = signal(0);
    totalElements = signal(0);
    pageSize = signal(10);

    // ── Computed ──
    pages = computed(() => {
        const total = this.totalPages();
        const current = this.currentPage();
        const pages: number[] = [];
        const start = Math.max(0, current - 2);
        const end = Math.min(total, current + 3);
        for (let i = start; i < end; i++) {
            pages.push(i);
        }
        return pages;
    });

    // ── Executing ──
    executingId = signal<number | null>(null);
    isScanning  = signal(false);

    ngOnInit(): void {
        this.loadTodaySetups();
        this.loadHistory(0);
    }

    switchTab(tab: 'today' | 'history') {
        this.activeTab.set(tab);
    }

    loadTodaySetups() {
        this.todayLoading.set(true);
        this.swingService.getTodaySetups().subscribe({
            next: (data) => {
                this.todaySetups.set(data);
                this.todayLoading.set(false);
            },
            error: () => this.todayLoading.set(false)
        });
    }

    loadHistory(page: number) {
        this.historyLoading.set(true);
        this.swingService.getHistory(page, this.pageSize()).subscribe({
            next: (data: PageResponse<SwingSignalDTO>) => {
                this.historyPage.set(data.content);
                this.currentPage.set(data.number);
                this.totalPages.set(data.totalPages);
                this.totalElements.set(data.totalElements);
                this.historyLoading.set(false);
            },
            error: () => this.historyLoading.set(false)
        });
    }

    goToPage(page: number) {
        if (page >= 0 && page < this.totalPages()) {
            this.loadHistory(page);
        }
    }

    executeTrade(id: number) {
        this.executingId.set(id);
        this.swingService.executeSwingTrade(id).subscribe({
            next: () => {
                this.executingId.set(null);
                // Refresh both tabs
                this.loadTodaySetups();
                this.loadHistory(this.currentPage());
            },
            error: () => this.executingId.set(null)
        });
    }

    triggerScan() {
        this.isScanning.set(true);
        this.swingService.triggerScan().subscribe({
            next: () => {
                // Scan is now synchronous server-side — reload immediately
                this.loadTodaySetups();
                this.isScanning.set(false);
            },
            error: () => this.isScanning.set(false)
        });
    }

    getDirectionIcon(side: string): string {
        return side === 'BUY' ? '🟢' : '🔴';
    }

    getResultBadgeClass(status: string): string {
        if (!status) return 'badge-default';
        switch (status) {
            case 'TP HIT': return 'badge-win';
            case 'SL HIT': return 'badge-loss';
            case 'CLOSED': return 'badge-closed';
            case 'EXPIRED': return 'badge-expired';
            case 'EXECUTED': return 'badge-executed';
            case 'APPROVED': return 'badge-executed';
            case 'PENDING': return 'badge-default';
            default: return 'badge-default';
        }
    }

    getResultLabel(status: string): string {
        if (!status) return '—';
        switch (status) {
            case 'TP HIT': return '✅ TP Hit';
            case 'SL HIT': return '❌ SL Hit';
            case 'CLOSED': return '🔒 Closed';
            case 'EXPIRED': return '⏰ Expired';
            case 'EXECUTED': return '⚡ Open';
            case 'APPROVED': return '✔ Approved';
            case 'PENDING': return '⏳ Pending';
            case 'REJECTED': return '🚫 Rejected';
            case 'SKIPPED_RISK_CONTROL': return '⚠ Risk Skip';
            default: return status;
        }
    }
}
