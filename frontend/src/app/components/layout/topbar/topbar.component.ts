import { Component, inject, Output, EventEmitter, OnInit, OnDestroy, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { BotConfigurationService } from '../../../services/bot-configuration.service';
import { TradeService } from '../../../services/trade.service';
import { NewsService, NewsItem } from '../../../services/news.service';
import { LanguageService } from '../../../services/language.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <header class="h-16 bg-[#0a0a14]/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30 flex items-center justify-between px-6 fixed top-0 right-0 left-0 md:left-64 z-40 transition-[left] duration-300">
      
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        <button class="md:hidden text-gray-400 hover:text-white" (click)="toggleMenu.emit()">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>

        <!-- Left: Dynamic Breadcrumbs -->
        <div class="flex items-center text-gray-400 text-sm">
            <span class="hover:text-white cursor-pointer transition-colors hidden sm:block">Platform</span>
            <svg class="w-4 h-4 mx-2 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="text-white font-medium">{{ pageTitle() }}</span>
        </div>
      </div>

      <!-- Right: Stats & Actions -->
      <div class="flex items-center space-x-6">
        
        <!-- Exchange Status -->
        <div class="hidden sm:flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5" 
             *ngIf="botService.connectionStatus$ | async as status">
          <div class="flex relative">
            <span *ngIf="status === 'CONNECTED'" class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2" 
                  [class.bg-green-500]="status === 'CONNECTED'" 
                  [class.bg-red-500]="status !== 'CONNECTED'"></span>
          </div>
          <span class="text-xs font-medium" 
                [class.text-green-400]="status === 'CONNECTED'" 
                [class.text-red-400]="status !== 'CONNECTED'">
            {{ status === 'CONNECTED' ? ('TOPBAR.EXCHANGE_CONNECTED' | translate) : ('TOPBAR.DISCONNECTED' | translate) }}
          </span>
        </div>

        <!-- Wallet Balance (Live MT5) -->
        <div class="flex items-center space-x-3 pl-6 border-l border-white/10">
          <div class="text-right">
            <div class="text-[0.65rem] text-gray-400 uppercase tracking-widest">{{ 'TOPBAR.TOTAL_BALANCE' | translate }}</div>
            <div class="text-lg font-bold text-white tracking-tight">
              \${{ accountBalance() | number:'1.2-2' }}
              <span class="text-xs font-medium ml-1"
                    [class.text-green-400]="dailyPnL() >= 0"
                    [class.text-red-400]="dailyPnL() < 0">
                <span *ngIf="dailyPnL() >= 0">+</span>{{ dailyPnL() | number:'1.2-2' }}
              </span>
            </div>
          </div>
          <div class="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-primary/50 transition-colors cursor-pointer" routerLink="/wallet">
            <svg class="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <!-- Language, Notifications & Profile -->
        <div class="flex items-center space-x-3 pl-6 border-l border-white/10">

            <!-- Language Toggle -->
            <button (click)="toggleLanguage()" 
                    class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    [title]="langService.currentLanguage === 'en' ? 'Passer en Francais' : 'Switch to English'">
                <svg *ngIf="langService.currentLanguage === 'en'" class="w-5 h-3.5 rounded-[2px] shadow-sm" viewBox="0 0 30 20">
                    <rect width="10" height="20" fill="#002395"/>
                    <rect x="10" width="10" height="20" fill="#FFFFFF"/>
                    <rect x="20" width="10" height="20" fill="#ED2939"/>
                </svg>
                <svg *ngIf="langService.currentLanguage !== 'en'" class="w-5 h-3.5 rounded-[2px] shadow-sm" viewBox="0 0 30 20">
                    <rect width="30" height="20" fill="#B22234"/>
                    <rect y="1.54" width="30" height="1.54" fill="white"/>
                    <rect y="4.62" width="30" height="1.54" fill="white"/>
                    <rect y="7.69" width="30" height="1.54" fill="white"/>
                    <rect y="10.77" width="30" height="1.54" fill="white"/>
                    <rect y="13.85" width="30" height="1.54" fill="white"/>
                    <rect y="16.92" width="30" height="1.54" fill="white"/>
                    <rect width="12" height="10.77" fill="#3C3B6E"/>
                </svg>
                <span class="uppercase tracking-wider">{{ langService.currentLanguage === 'en' ? 'FR' : 'EN' }}</span>
            </button>

            <!-- Notification Bell -->
            <div class="relative">
                <button (click)="toggleNotifications($event)" class="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <span *ngIf="unreadCount() > 0" class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse"></span>
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </button>

                <!-- Notification Dropdown -->
                <div *ngIf="showNotifications" class="absolute right-0 mt-2 w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div class="p-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <p class="text-sm font-bold text-white">{{ 'TOPBAR.NOTIFICATIONS' | translate }}</p>
                        <button (click)="markAllRead()" class="text-xs text-primary hover:underline">{{ 'TOPBAR.MARK_ALL_READ' | translate }}</button>
                    </div>
                    <div class="max-h-80 overflow-y-auto">
                        <div *ngFor="let item of recentAlerts()" 
                             class="p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                             (click)="onAlertClick(item)">
                            <div class="flex items-start gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                     [ngClass]="{
                                        'bg-red-500/20 text-red-400': item.type === 'HIGH_NEWS' || item.type === 'SL_HIT',
                                        'bg-green-500/20 text-green-400': item.type === 'TP_HIT',
                                        'bg-blue-500/20 text-blue-400': item.type === 'MACRO',
                                        'bg-yellow-500/20 text-yellow-400': item.type === 'NEWS'
                                     }">
                                    <span class="text-xs font-bold">{{ item.icon }}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-medium text-gray-200 line-clamp-2">{{ item.title }}</p>
                                    <p class="text-[0.65rem] text-gray-500 mt-1">{{ item.time }}</p>
                                </div>
                            </div>
                        </div>
                        <div *ngIf="recentAlerts().length === 0" class="p-6 text-center text-sm text-gray-500">
                            {{ 'TOPBAR.NO_NOTIFICATIONS' | translate }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- User Profile Dropdown -->
            @if (currentUser(); as user) {
                <div class="relative">
                    <div class="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                         (click)="toggleProfile($event)">
                        <div class="text-right hidden md:block">
                            <div class="text-sm font-bold text-white leading-none">{{ user.displayName || user.username }}</div>
                            <div class="text-[0.65rem] text-primary uppercase tracking-wider font-bold">{{ 'TOPBAR.PRO_TRADER' | translate }}</div>
                        </div>
                        <img [src]="user.avatarUrl" [alt]="user.username" class="w-8 h-8 rounded-lg ring-2 ring-white/10">
                    </div>

                    <!-- Profile Dropdown Menu -->
                    <div *ngIf="showProfile" class="absolute right-0 top-full mt-2 w-56 bg-[#0a0a12] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                        <div class="p-4 border-b border-white/5">
                            <p class="text-xs text-gray-500 uppercase tracking-wider">Signed in as</p>
                            <p class="text-sm font-bold text-white truncate">{{ user.displayName || user.username }}</p>
                            <p class="text-xs text-gray-500 truncate mt-0.5">{{ user.email }}</p>
                        </div>
                        <div class="py-1">
                            <a routerLink="/profile" (click)="showProfile = false"
                               class="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                                <svg class="w-4 h-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {{ 'TOPBAR.MY_PROFILE' | translate }}
                            </a>
                            <a routerLink="/settings" (click)="showProfile = false"
                               class="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                                <svg class="w-4 h-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {{ 'NAVBAR.SETTINGS' | translate }}
                            </a>
                            <a routerLink="/wallet" (click)="showProfile = false"
                               class="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                                <svg class="w-4 h-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {{ 'TOPBAR.WALLET_BILLING' | translate }}
                            </a>
                        </div>
                        <div class="border-t border-white/5 p-2">
                            <button (click)="logout()" class="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                <svg class="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {{ 'TOPBAR.SIGN_OUT' | translate }}
                            </button>
                        </div>
                    </div>
                </div>
            }
        </div>

      </div>
    </header>
  `
})
export class TopbarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  botService = inject(BotConfigurationService);
  tradeService = inject(TradeService);
  newsService = inject(NewsService);
  langService = inject(LanguageService);
  router = inject(Router);

  currentUser = this.authService.currentUser;
  @Output() toggleMenu = new EventEmitter<void>();

  // Dynamic page title
  pageTitle = signal('Dashboard');

  // Live MT5 account data
  accountBalance = signal(0);
  dailyPnL = signal(0);

  // Dropdowns
  showProfile = false;
  showNotifications = false;

  // Notifications
  unreadCount = signal(0);
  recentAlerts = signal<Alert[]>([]);

  private refreshInterval: any;
  private routerSub: any;

  // Route-to-title mapping
  private routeMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/strategies': 'Strategies',
    '/active-strategies': 'Active Strategies',
    '/lab': 'Lab',
    '/news': 'News',
    '/wallet': 'Wallet',
    '/settings': 'Settings',
    '/market-assets': 'Market Assets',
    '/ai-signals': 'AI Signals',
    '/swing-signals': 'Swing Signals',
    '/macro-data': 'Macro Data',
    '/profile': 'Profile',
    '/admin': 'Admin',
  };

  ngOnInit() {
    // 1. Dynamic breadcrumbs: listen to route changes
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects.split('?')[0];
        this.pageTitle.set(this.routeMap[url] || 'Dashboard');
        // Close dropdowns on navigate
        this.showProfile = false;
        this.showNotifications = false;
      }
    });
    // Set initial title
    const currentUrl = this.router.url.split('?')[0];
    this.pageTitle.set(this.routeMap[currentUrl] || 'Dashboard');

    // 2. Fetch live MT5 account balance
    this.fetchAccountSummary();
    this.refreshInterval = setInterval(() => this.fetchAccountSummary(), 10000);

    // 3. Build notifications from news feed
    effect(() => {
      const feed = this.newsService.newsFeed();
      const alerts: Alert[] = [];

      // High-priority news
      feed.filter(n => n.priority === 'HIGH').slice(0, 3).forEach(n => {
        alerts.push({
          type: 'HIGH_NEWS',
          icon: '🔴',
          title: n.title,
          time: this.timeAgo(n.publishedAt),
          url: n.url
        });
      });

      // Macro / market news
      feed.filter(n => n.category === 'MARKET' || n.category === 'FOREX').slice(0, 2).forEach(n => {
        alerts.push({
          type: 'MACRO',
          icon: '📊',
          title: n.title,
          time: this.timeAgo(n.publishedAt),
          url: n.url
        });
      });

      this.recentAlerts.set(alerts.slice(0, 5));
      this.unreadCount.set(alerts.length);
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.routerSub) this.routerSub.unsubscribe();
  }

  private fetchAccountSummary() {
    if (localStorage.getItem('connectionStatus') === 'CONNECTED') {
      this.tradeService.getAccountSummary().subscribe({
        next: (summary) => {
          if (summary) {
            this.accountBalance.set(summary.balance || 0);
            const equity = summary.equity || summary.balance || 0;
            this.dailyPnL.set(equity - (summary.balance || 0));
          }
        },
        error: () => {
          this.accountBalance.set(this.authService.walletBalance());
          this.dailyPnL.set(0);
        }
      });
    } else {
      this.accountBalance.set(this.authService.walletBalance());
      this.dailyPnL.set(0);
    }
  }

  toggleProfile(event: Event) {
    event.stopPropagation();
    this.showProfile = !this.showProfile;
    this.showNotifications = false;
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfile = false;
  }

  toggleLanguage() {
    const newLang = this.langService.currentLanguage === 'en' ? 'fr' : 'en';
    this.langService.switchLanguage(newLang);
  }

  markAllRead() {
    this.unreadCount.set(0);
  }

  logout() {
    this.showProfile = false;
    this.authService.logout();
  }

  onAlertClick(alert: Alert) {
    if (alert.url) {
      window.open(alert.url, '_blank', 'noopener,noreferrer');
    }
    this.showNotifications = false;
  }

  // Close dropdowns on outside click
  @HostListener('document:click')
  onDocumentClick() {
    this.showProfile = false;
    this.showNotifications = false;
  }

  private timeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }
}

interface Alert {
  type: 'HIGH_NEWS' | 'TP_HIT' | 'SL_HIT' | 'MACRO' | 'NEWS';
  icon: string;
  title: string;
  time: string;
  url?: string;
}
