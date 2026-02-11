import { Component, inject, effect, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from './services/websocket.service';
import { ToastService } from './services/toast.service';
import { NewsService } from './services/news.service';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/shared/toast/toast.component';
import { TradingBackgroundComponent } from './components/shared/trading-background/trading-background.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastComponent,
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
            news.title,
            '🚨 MARKET ALERT: ' + news.category,
            'error'
          );
        } else if (news.priority === 'MEDIUM') {
          this.toastService.show(
            news.title,
            '📢 ' + news.category,
            'warning'
          );
        }
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
