import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LabService, ActiveStrategy } from '../../../services/lab.service';

@Component({
    selector: 'app-active-strategies',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './active-strategies.component.html',
    styleUrls: ['./active-strategies.component.css']
})
export class ActiveStrategiesComponent implements OnInit {
    private labService = inject(LabService);

    strategies = signal<ActiveStrategy[]>([]);
    loading = signal(true);

    // Pagination (0-based internally, displayed as 1-based)
    currentPage = signal(0);
    pageSize = 6;

    totalPages = computed(() => Math.ceil(this.strategies().length / this.pageSize) || 1);

    paginatedStrategies = computed(() => {
        const start = this.currentPage() * this.pageSize;
        return this.strategies().slice(start, start + this.pageSize);
    });

    pages = computed(() => {
        const arr: number[] = [];
        for (let i = 0; i < this.totalPages(); i++) arr.push(i);
        return arr;
    });

    ngOnInit() {
        this.fetchStrategies();
    }

    fetchStrategies() {
        this.loading.set(true);
        this.labService.getActiveStrategies().subscribe({
            next: (data: ActiveStrategy[]) => {
                this.strategies.set(data);
                this.loading.set(false);
                this.currentPage.set(0);
            },
            error: (err: any) => {
                console.error('Failed to fetch active strategies', err);
                this.loading.set(false);
            }
        });
    }

    goToPage(page: number) {
        if (page >= 0 && page < this.totalPages()) {
            this.currentPage.set(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    stopStrategy(id: number) {
        console.log('Stopping strategy', id);
    }
}
