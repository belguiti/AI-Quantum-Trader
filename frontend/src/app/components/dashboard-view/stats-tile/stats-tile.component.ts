import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-stats-tile',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="glass-card p-5 relative overflow-hidden group">
      <!-- Glow Effect -->
      <div class="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/5 to-white/0 rounded-full blur-xl group-hover:bg-primary/10 transition-colors duration-500"></div>

      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-gray-400 text-sm font-medium uppercase tracking-wider">{{ title }}</h3>
        </div>
        <div [class]="'p-2 rounded-lg ' + iconBgClass">
          <ng-content select="[icon]"></ng-content>
        </div>
      </div>

      <div class="flex items-baseline">
        <span class="text-2xl font-bold text-white tracking-tight">{{ value }}</span>
        <span *ngIf="change" [class]="'ml-2 text-sm font-medium ' + (isPositive ? 'text-green-400' : 'text-red-400')">
          {{ isPositive ? '+' : ''}}{{ change }}%
        </span>
      </div>

      <!-- Mini Chart Placeholder -->
      <div class="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full" [style.width]="progress + '%'"></div>
      </div>
    </div>
  `
})
export class StatsTileComponent {
    @Input() title: string = '';
    @Input() value: string | number = '';
    @Input() change?: number;
    @Input() iconBgClass: string = 'bg-primary/10 text-primary';
    @Input() progress: number = 0;

    get isPositive(): boolean {
        return (this.change || 0) >= 0;
    }
}
