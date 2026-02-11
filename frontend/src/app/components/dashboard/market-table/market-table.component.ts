import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketDataService, MarketItem } from '../../../services/market-data.service';
import { DecimalPipe, NgIf } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-market-table',
  standalone: true,
  imports: [CommonModule, DecimalPipe, NgIf],
  template: `
    <div class="glass-panel p-6 rounded-2xl animate-fade-in-up">
      
      <!-- Header & Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 class="text-xl font-bold text-white">Market Overview</h2>
          <p class="text-xs text-gray-500">Real-time global market data</p>
        </div>
        
        <div class="flex space-x-1 bg-black/40 p-1 rounded-lg">
          @for (tab of tabs; track tab) {
            <button 
              (click)="changeTab(tab)"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              [class.bg-primary]="activeTab() === tab"
              [class.text-black]="activeTab() === tab"
              [class.text-gray-400]="activeTab() !== tab"
              [class.hover:text-white]="activeTab() !== tab">
              {{ tab }}
            </button>
          }
        </div>
      </div>

      <!-- Table Section -->
      <div class="overflow-x-auto min-h-[400px]">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider">
              <th class="py-3 pl-4 cursor-pointer hover:text-white transition-colors" (click)="toggleSort('asset')">
                  Asset 
                  <span *ngIf="sortColumn() === 'asset'">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 text-right cursor-pointer hover:text-white transition-colors" (click)="toggleSort('price')">
                  Price
                  <span *ngIf="sortColumn() === 'price'">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 text-right cursor-pointer hover:text-white transition-colors" (click)="toggleSort('change')">
                  24h Change
                  <span *ngIf="sortColumn() === 'change'">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 text-right hidden md:table-cell cursor-pointer hover:text-white transition-colors" (click)="toggleSort('cap')">
                  Market Cap
                  <span *ngIf="sortColumn() === 'cap'">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
              </th>
               <th class="py-3 text-right hidden lg:table-cell cursor-pointer hover:text-white transition-colors" (click)="toggleSort('volume')">
                  Volume (24h)
                  <span *ngIf="sortColumn() === 'volume'">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="py-3 text-center">Chart</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            @for (item of displayedItems(); track item.symbol) {
              <tr class="hover:bg-white/5 transition-colors group">
                
                <!-- Asset -->
                <td class="py-3 pl-4">
                  <div class="flex items-center">
                    <img 
                      [src]="'https://ui-avatars.com/api/?name=' + item.symbol + '&background=random&color=fff&size=32&font-size=0.4'" 
                      class="w-8 h-8 rounded-full mr-3 ring-1 ring-white/10 group-hover:ring-primary/30 transition-all"
                      alt="icon"
                    >
                    <div>
                      <div class="font-medium text-white">{{ item.name }}</div>
                      <div class="text-xs text-gray-500">{{ item.symbol }}</div>
                    </div>
                  </div>
                </td>

                <!-- Price -->
                <td class="py-3 text-right font-mono font-medium text-white transition-colors duration-300"
                    [class.text-green-400]="item.price > (item.prevPrice || 0)"
                    [class.text-red-400]="item.price < (item.prevPrice || 0)">
                  {{ formatPrice(item) }}
                </td>

                <!-- 24h Change -->
                <td class="py-3 text-right">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    [class.bg-green-500_10]="item.change24h >= 0"
                    [class.text-green-400]="item.change24h >= 0"
                    [class.bg-red-500_10]="item.change24h < 0"
                    [class.text-red-400]="item.change24h < 0">
                    {{ item.change24h > 0 ? '+' : '' }}{{ item.change24h | number:'1.2-2' }}%
                  </span>
                </td>

                <!-- Market Cap -->
                <td class="py-3 text-right hidden md:table-cell text-gray-300 font-mono text-sm">
                   @if (item.marketCap > 0) {
                     \${{ item.marketCap | number:'1.0-0' }}
                   } @else {
                     -
                   }
                </td>

                <!-- Volume -->
                <td class="py-3 text-right hidden lg:table-cell text-gray-400 font-mono text-sm">
                  {{ item.volume | number:'1.0-0' }}
                </td>

                <!-- Action -->
                <td class="py-3 text-center">
                   <button class="text-gray-500 hover:text-primary transition-colors p-1" title="View Chart" (click)="openChart(item)">
                     <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                     </svg>
                   </button>
                </td>

              </tr>
            }
            @if (displayedItems().length === 0) {
                <tr><td colspan="6" class="py-8 text-center text-gray-500">Loading market data...</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls (Fixed Visibility) -->
      @if (filteredData().length > 0) {
        <div class="flex items-center justify-between mt-6 pt-4 border-t border-white/5 px-2">
            <div class="text-xs sm:text-sm text-gray-500">
                Page <span class="text-white">{{ currentPage() + 1 }}</span> of <span class="text-white">{{ totalPages() || 1 }}</span> 
                <span class="ml-2 hidden sm:inline">({{ filteredData().length }} assets)</span>
            </div>
            <div class="flex space-x-2">
                <button (click)="prevPage()" [disabled]="currentPage() === 0" 
                    class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Previous
                </button>
                <button (click)="nextPage()" [disabled]="currentPage() >= totalPages() - 1"
                    class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Next
                </button>
            </div>
        </div>
      }

    <!-- Chart Modal -->
    @if (selectedSymbol()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" (click)="closeChart()">
        <div class="glass-panel w-full max-w-5xl h-[600px] relative flex flex-col" (click)="$event.stopPropagation()">
            
            <div class="flex items-center justify-between p-4 border-b border-white/10">
                <div class="flex items-center gap-3">
                    <h3 class="text-xl font-bold text-white">{{ selectedItem()?.name }}</h3>
                    <span class="text-sm text-gray-400 font-mono">{{ selectedSymbol() }}</span>
                </div>
                <button class="p-2 hover:bg-white/10 rounded-full transition-colors" (click)="closeChart()">
                    <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="flex-1 bg-black/50 relative">
                @if (chartUrl(); as url) {
                    <iframe [src]="url" class="absolute inset-0 w-full h-full" frameborder="0" allowfullscreen></iframe>
                }
            </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .bg-green-500_10 { background-color: rgba(34, 197, 94, 0.1); }
    .bg-red-500_10 { background-color: rgba(239, 68, 68, 0.1); }
  `]
})
export class MarketTableComponent {
  marketService = inject(MarketDataService);
  sanitizer = inject(DomSanitizer);

  tabs = ['All', 'Crypto', 'Forex', 'Stocks', 'Indices'];
  activeTab = signal('All');

  // Pagination
  currentPage = signal(0);
  pageSize = 10;

  // Sorting
  sortColumn = signal<'asset' | 'price' | 'change' | 'volume' | 'cap'>('cap');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Filtered & Sorted data
  filteredData = computed(() => {
    const tab = this.activeTab();
    let data: MarketItem[] = [];
    if (tab === 'All') data = this.marketService.marketData();
    else if (tab === 'Crypto') data = this.marketService.cryptoDaTa();
    else if (tab === 'Forex') data = this.marketService.forexData();
    else if (tab === 'Stocks') data = this.marketService.stockData();
    else if (tab === 'Indices') data = this.marketService.indexData();

    // Sorting
    const col = this.sortColumn();
    const dir = this.sortDirection();

    return data.sort((a, b) => {
      let valA: number | string = '';
      let valB: number | string = '';

      if (col === 'asset') { valA = a.symbol; valB = b.symbol; }
      else if (col === 'price') { valA = a.price; valB = b.price; }
      else if (col === 'change') { valA = a.change24h; valB = b.change24h; }
      else if (col === 'volume') { valA = a.volume; valB = b.volume; }
      else if (col === 'cap') { valA = a.marketCap; valB = b.marketCap; }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  totalPages = computed(() => Math.ceil(this.filteredData().length / this.pageSize));

  // Displayed data slice
  displayedItems = computed(() => {
    const start = this.currentPage() * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData().slice(start, end);
  });

  changeTab(tab: string) {
    this.activeTab.set(tab);
    this.currentPage.set(0);
  }

  toggleSort(column: 'asset' | 'price' | 'change' | 'volume' | 'cap') {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  selectedSymbol = signal<string | null>(null);
  selectedItem = signal<MarketItem | null>(null);
  chartUrl = signal<SafeResourceUrl | null>(null);

  formatPrice(item: MarketItem): string {
    if (item.type === 'CRYPTO' && item.price < 1) return item.price.toFixed(4);
    if (item.type === 'FOREX') return item.price.toFixed(4);
    return item.price.toFixed(2);
  }

  openChart(item: MarketItem) {
    this.selectedSymbol.set(item.symbol);
    this.selectedItem.set(item);

    // Construct TradingView Widget URL
    let symbol = item.symbol;
    if (item.type === 'CRYPTO') {
      symbol = 'BINANCE:' + item.symbol;
    } else if (item.type === 'FOREX') {
      symbol = 'FX:' + item.symbol.replace('/', '');
      if (symbol.includes('JPY')) symbol = 'FX_IDC:' + item.symbol.replace('/', ''); // JPY pairs often FX_IDC
    } else if (item.type === 'STOCK') {
      symbol = 'NASDAQ:' + item.symbol; // Default to NASDAQ for tech stocks in mock
    } else if (item.type === 'INDEX') {
      if (item.symbol === 'SPX') symbol = 'SP:SPX';
      if (item.symbol === 'NDX') symbol = 'NASDAQ:NDX';
    }

    const url = `https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=D&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC`;
    this.chartUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  closeChart() {
    this.selectedSymbol.set(null);
    this.selectedItem.set(null);
    this.chartUrl.set(null);
  }
}
