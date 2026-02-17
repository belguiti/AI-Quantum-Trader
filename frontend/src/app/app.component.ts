import { Component, inject, effect, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from './services/websocket.service';
import { ToastService } from './services/toast.service';
import { NewsService } from './services/news.service';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmationModalComponent } from './components/modal/confirmation-modal.component';
import { TradingBackgroundComponent } from './components/shared/trading-background/trading-background.component';
import { TradeService } from './services/trade.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastComponent,
    ConfirmationModalComponent,
    TradingBackgroundComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';

  // Services
  wsService = inject(WebSocketService);
  toastService = inject(ToastService);
  newsService = inject(NewsService);
  authService = inject(AuthService);
  tradeService = inject(TradeService);

  // State
  currentUser = this.authService.currentUser;
  showUserMenu = false;

  constructor() {
    // React to new WebSocket messages
    effect(() => {
      const news = this.wsService.latestNews();
      if (news) {
        console.log('Real-Time News Received:', news.title);

        // 1. Add to News Feed (Prepend)
        this.newsService.newsFeed.update(current => [news, ...current]);

        // 2. Show Toast if High Priority
        if (news.priority === 'HIGH') {
          this.toastService.show(
            `🚨 ${news.category}: ${news.title}`,
            'error'
          );
        } else if (news.priority === 'MEDIUM') {
          this.toastService.show(
            `📢 ${news.category}: ${news.title}`,
            'info'
          );
        }
      }
    });

    // React to Trade Updates (Failures)
    this.tradeService.tradeUpdates$.subscribe(trade => {
      if (trade.status === 'FAILED') {
        if (trade.strategyBreakdown?.includes('10027') || trade.strategyBreakdown?.includes('Algo Trading')) {
          this.toastService.show(
            `❌ ACTION REQUIRED: ${trade.strategyBreakdown}`,
            'error'
          );
        } else {
          this.toastService.show(
            `⚠️ Trade Failed: ${trade.symbol} - ${trade.strategyBreakdown || 'Unknown error'}`,
            'error'
          );
        }
      } else if (trade.status === 'OPEN') {
        this.toastService.show(
          `✅ Trade Opened: ${trade.symbol} ${trade.side} @ ${trade.entryPrice}`,
          'success'
        );
      }
    });
  }

  // Auth UI Methods
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  logout() {
    this.authService.logout();
    this.closeUserMenu();
  }
}
