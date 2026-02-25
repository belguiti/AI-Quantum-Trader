import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <aside 
      class="w-64 h-screen bg-surf-baseLight dark:bg-surf-baseDark text-slate-900 dark:text-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none"
      [class.-translate-x-full]="!isOpen">
      
      <!-- Logo -->
      <div class="h-24 flex items-center px-6 justify-between pt-4">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center mr-3 shadow-sm">
            <span class="font-bold text-white dark:text-slate-900 text-lg">Q</span>
          </div>
          <span class="text-xl font-bold tracking-tight">Quantum<span class="text-primary">Forge</span></span>
        </div>
        <!-- Close button for mobile -->
        <button class="md:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white" (click)="close.emit()">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 min-h-0 overflow-y-auto py-6 px-3 space-y-2">
        
        <div class="px-3 mb-2 mt-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">{{ 'NAVBAR.PLATFORM' | translate }}</div>
        
        <a routerLink="/dashboard" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm" 
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
          <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {{ 'NAVBAR.DASHBOARD' | translate }}
        </a>

        <a routerLink="/strategies" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
          <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {{ 'NAVBAR.TRADE' | translate }}
        </a>

        <a routerLink="/active-strategies" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
          <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ 'NAVBAR.ACTIVE_STRATEGIES' | translate }}
        </a>

        <a routerLink="/ai-signals" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
          <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {{ 'NAVBAR.AI_SIGNALS' | translate }}
        </a>

          <a routerLink="/lab" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          {{ 'NAVBAR.BACKTEST_LAB' | translate }}
        </a>

        <a routerLink="/swing-signals" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {{ 'NAVBAR.SWING_SIGNALS' | translate }}
        </a>

        <a routerLink="/macro-data" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ 'NAVBAR.MACRO_DATA' | translate }}
        </a>

        <a routerLink="/news" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          {{ 'NAVBAR.NEWS' | translate }}
        </a>

        <div class="px-3 mt-8 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">{{ 'NAVBAR.ACCOUNT' | translate }}</div>

        <a routerLink="/wallet" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {{ 'NAVBAR.WALLET' | translate }}
        </a>

        <a routerLink="/settings" routerLinkActive="!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ 'NAVBAR.SETTINGS' | translate }}
        </a>

        @if (currentUser()?.role === 'ADMIN') {
        <div class="px-3 mt-8 mb-2 text-xs font-semibold text-rose-500 uppercase tracking-widest">{{ 'NAVBAR.ADMIN' | translate }}</div>

        <a routerLink="/admin" routerLinkActive="!bg-rose-500 !text-white font-semibold shadow-sm"
           (click)="close.emit()"
           class="flex items-center px-4 py-3 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surf-mutedDark transition-all group font-medium">
           <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {{ 'NAVBAR.ADMIN_PANEL' | translate }}
        </a>
        }
      </nav>

      <!-- User Profile Mini -->
      <div class="p-6 pb-8">
        @if (currentUser(); as user) {
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <img class="h-10 w-10 rounded-full border-2 border-white dark:border-surf-cardDark shadow-sm" [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=Trader&background=random'" [alt]="user.username">
                    <div class="ml-3">
                        <p class="text-sm font-bold text-slate-900 dark:text-white">{{ user.displayName || user.username || 'Trader' }}</p>
                        <p class="text-xs text-slate-500">{{ 'NAVBAR.PRO_PLAN' | translate }}</p>
                    </div>
                </div>
            </div>
        } @else {
            <div class="space-y-2">
                <a routerLink="/login" (click)="close.emit()" class="block w-full text-center py-3 rounded-full bg-white dark:bg-surf-mutedDark hover:shadow-sm text-sm text-slate-900 dark:text-white transition-all font-semibold border-2 border-transparent">{{ 'NAVBAR.LOG_IN' | translate }}</a>
                <a routerLink="/register" (click)="close.emit()" class="block w-full text-center py-3 rounded-full bg-slate-900 dark:bg-white hover:scale-[1.02] active:scale-95 text-sm text-white dark:text-slate-900 transition-all font-semibold shadow-md">{{ 'NAVBAR.SIGN_UP' | translate }}</a>
            </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    :host ::ng-deep nav {
      scrollbar-width: none;           /* Firefox */
      -ms-overflow-style: none;        /* IE/Edge */
    }
    :host ::ng-deep nav::-webkit-scrollbar {
      display: none;                   /* Chrome/Safari */
    }
  `]
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
