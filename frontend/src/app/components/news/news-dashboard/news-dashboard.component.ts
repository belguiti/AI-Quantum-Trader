import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsService } from '../../../services/news.service';
import { NewsCardComponent } from '../news-card/news-card.component';

@Component({
  selector: 'app-news-dashboard',
  standalone: true,
  imports: [CommonModule, NewsCardComponent],
  templateUrl: './news-dashboard.component.html'
})
export class NewsDashboardComponent {
  newsService = inject(NewsService);

  // Local state for tabs
  activeTab = signal('ALL');

  tabs = ['ALL', 'FINANCE', 'CRYPTO', 'MARKET', 'REAL_ESTATE'];

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  get filteredNews() {
    return this.newsService.getNewsByCategory(this.activeTab());
  }
}
