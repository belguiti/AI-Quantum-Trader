import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsService } from '../../../services/news.service';
import { NewsCardComponent } from '../news-card/news-card.component';

@Component({
  selector: 'app-news-dashboard',
  standalone: true,
  imports: [CommonModule, NewsCardComponent],
  templateUrl: './news-dashboard.component.html',
  styleUrls: ['./news-dashboard.component.css']
})
export class NewsDashboardComponent {
  newsService = inject(NewsService);

  // Local state for tabs
  activeTab = signal('ALL');

  tabs = ['ALL', 'FINANCE', 'CRYPTO', 'GOLD', 'MARKET', 'REAL_ESTATE'];

  // Pagination (0-based internally)
  currentPage = signal(0);
  pageSize = 12;

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(0); // reset page on tab change
  }

  get filteredNews() {
    return this.newsService.getNewsByCategory(this.activeTab());
  }

  get totalPages() {
    return Math.ceil(this.filteredNews.length / this.pageSize) || 1;
  }

  get paginatedNews() {
    const start = this.currentPage() * this.pageSize;
    return this.filteredNews.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    const arr: number[] = [];
    for (let i = 0; i < this.totalPages; i++) arr.push(i);
    return arr;
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
