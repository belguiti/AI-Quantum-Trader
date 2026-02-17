import { Component, inject, signal, OnInit } from '@angular/core';
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

    ngOnInit() {
        this.fetchStrategies();
    }

    fetchStrategies() {
        this.loading.set(true);
        this.labService.getActiveStrategies().subscribe({
            next: (data: ActiveStrategy[]) => {
                this.strategies.set(data);
                this.loading.set(false);
            },
            error: (err: any) => {
                console.error('Failed to fetch active strategies', err);
                this.loading.set(false);
            }
        });
    }

    stopStrategy(id: number) {
        // TODO: Implement stop endpoint
        console.log('Stopping strategy', id);
    }
}
