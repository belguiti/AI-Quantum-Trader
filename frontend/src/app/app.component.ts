import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TradingBackgroundComponent } from './components/shared/trading-background/trading-background.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TradingBackgroundComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  showUserMenu = false;

  ngAfterViewInit() {
    // Background handled by TradingBackgroundComponent
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  logout() {
    this.authService.logout();
    this.showUserMenu = false;
  }
}
