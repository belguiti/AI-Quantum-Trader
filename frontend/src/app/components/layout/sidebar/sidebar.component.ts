import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside 
      class="w-64 h-screen bg-black/90 backdrop-blur-xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0"
      [class.-translate-x-full]="!isOpen">
      
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-white/5 justify-between">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded bg-gradient-to-tr from-primary to-accent flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
            <span class="font-bold text-black text-lg">Q</span>
          </div>
          <span class="text-xl font-bold tracking-tight">Quantum<span class="text-primary">Forge</span></span>
        </div>
        <!-- Close button for mobile -->
        <button class="md:hidden text-gray-400 hover:text-white" (click)="close.emit()">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        
        <div class="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</div>
        
        <a routerLink="/dashboard" routerLinkActive="bg-primary/10 text-primary border-r-2 border-primary" 
           (click)="close.emit()"
           class="flex items-center px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all group">
          <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
        </a>

        <a routerLink="/strategies" routerLinkActive="bg-primary/10 text-primary border-r-2 border-primary"
           (click)="close.emit()"
           class="flex items-center px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all group">
          <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Active Strategies
        </a>

        <a routerLink="/lab" routerLinkActive="bg-primary/10 text-primary border-r-2 border-primary"
           (click)="close.emit()"
           class="flex items-center px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all group">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Backtest Lab
        </a>

        <div class="px-3 mt-8 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</div>

        <a routerLink="/wallet" routerLinkActive="bg-primary/10 text-primary border-r-2 border-primary"
           (click)="close.emit()"
           class="flex items-center px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all group">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Wallet & API
        </a>

        <a routerLink="/settings" routerLinkActive="bg-primary/10 text-primary border-r-2 border-primary"
           (click)="close.emit()"
           class="flex items-center px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all group">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </a>
      </nav>

      <!-- User Profile Mini -->
      <div class="p-4 border-t border-white/5">
        @if (currentUser(); as user) {
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <img class="h-9 w-9 rounded-full ring-2 ring-primary/20" [src]="user.avatarUrl" [alt]="user.username">
                    <div class="ml-3">
                        <p class="text-sm font-medium text-white">{{ user.username }}</p>
                        <p class="text-xs text-gray-500">Pro Plan</p>
                    </div>
                </div>
                <button (click)="logout()" class="text-gray-400 hover:text-red-400 transition-colors p-2" title="Logout">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        } @else {
            <div class="space-y-2">
                <a routerLink="/login" (click)="close.emit()" class="block w-full text-center py-2 rounded bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors">Login</a>
                <a routerLink="/register" (click)="close.emit()" class="block w-full text-center py-2 rounded bg-primary/10 hover:bg-primary/20 text-sm text-primary transition-colors">Register</a>
            </div>
        }
      </div>
    </aside>
  `
})
export class SidebarComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  logout() {
    this.authService.logout();
    this.close.emit();
  }
}
