import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="min-h-screen text-gray-100 font-sans relative">
      
      <!-- Mobile Backdrop -->
      <div *ngIf="isMobileMenuOpen()" 
           class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
           (click)="isMobileMenuOpen.set(false)">
      </div>

      <!-- Layout Structure -->
      <app-sidebar [isOpen]="isMobileMenuOpen()" (close)="isMobileMenuOpen.set(false)"></app-sidebar>
      <app-topbar (toggleMenu)="toggleMobileMenu()"></app-topbar>

      <!-- Main Content Area -->
      <main class="ml-0 md:ml-64 pt-16 min-h-screen relative z-10 p-4 md:p-6 transition-[margin] duration-300">
        <div class="max-w-7xl mx-auto animate-fade-in-up">
          <router-outlet></router-outlet>
        </div>
      </main>

    </div>
  `,
  styles: [`
    @keyframes pulse-slow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.1); }
    }
    .animate-pulse-slow {
      animation: pulse-slow 8s infinite ease-in-out;
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-out forwards;
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class DashboardLayoutComponent {
  isMobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }
}
