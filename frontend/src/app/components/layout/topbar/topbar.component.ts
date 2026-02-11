import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../services/mock-data.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="h-16 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 fixed top-0 right-0 left-0 md:left-64 z-40 transition-[left] duration-300">
      
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        <button class="md:hidden text-gray-400 hover:text-white" (click)="toggleMenu.emit()">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>

        <!-- Left: Breadcrumbs / Page Title -->
        <div class="flex items-center text-gray-400 text-sm">
            <span class="hover:text-white cursor-pointer transition-colors hidden sm:block">Platform</span>
            <svg class="w-4 h-4 mx-2 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="text-white font-medium">Dashboard</span>
        </div>
      </div>

      <!-- Right: Stats & Actions -->
      <div class="flex items-center space-x-6">
        
        <!-- System Status -->
        <div class="hidden sm:flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <div class="flex relative">
            <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <span class="text-xs font-medium text-green-400">Systems Online</span>
        </div>

        <!-- Wallet Balance -->
        <div class="flex items-center space-x-3 pl-6 border-l border-white/10">
          <div class="text-right">
            <div class="text-[0.65rem] text-gray-400 uppercase tracking-widest">Total Balance</div>
            <div class="text-lg font-bold text-white tracking-tight">
              \${{ authService.walletBalance() | number:'1.2-2' }}
              <span class="text-xs text-green-400 font-medium ml-1">
                +{{ mockData.portfolio().dailyPnL | number:'1.2-2' }}
              </span>
            </div>
          </div>
          <div class="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-primary/50 transition-colors cursor-pointer" routerLink="/wallet">
            <svg class="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <!-- Notifications & Profile -->
        <div class="flex items-center space-x-4 pl-6 border-l border-white/10">
            <button class="relative p-2 text-gray-400 hover:text-white transition-colors">
            <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-black"></span>
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            </button>

            @if (currentUser(); as user) {
                <div class="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors" routerLink="/settings">
                    <div class="text-right hidden md:block">
                        <div class="text-sm font-bold text-white leading-none">{{ user.displayName || user.username }}</div>
                        <div class="text-[0.65rem] text-primary uppercase tracking-wider font-bold">Pro Trader</div>
                    </div>
                    <img [src]="user.avatarUrl" [alt]="user.username" class="w-8 h-8 rounded-lg ring-2 ring-white/10">
                </div>
            }
        </div>

      </div>
    </header>
  `
})
export class TopbarComponent {
  mockData = inject(MockDataService);
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;
  @Output() toggleMenu = new EventEmitter<void>();
}
