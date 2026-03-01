import { Component, HostListener, inject, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MarketDataService, MarketItem } from '../../services/market-data.service';

// Symbols shown in the top ticker (order matters)
const TICKER_CRYPTO = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];
const TICKER_FOREX  = ['USD/EUR', 'USD/GBP', 'USD/JPY', 'USD/CHF', 'USD/AUD'];
const TICKER_INDEX  = ['SPX', 'NDX', 'DJI'];

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, DecimalPipe],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css']
})
export class LandingComponent {

    private authService        = inject(AuthService);
    private marketDataService  = inject(MarketDataService);
    private router             = inject(Router);

    currentUser   = this.authService.currentUser;
    isScrolled    = false;
    mobileMenuOpen = false;
    currentYear   = new Date().getFullYear();

    // ── Live ticker data (computed from Binance WS + mock) ──────
    tickerData = computed<MarketItem[]>(() => {
        const all = this.marketDataService.marketData();
        const pick = (symbols: string[]) =>
            symbols.map(s => all.find(i => i.symbol === s)).filter(Boolean) as MarketItem[];
        return [
            ...pick(TICKER_CRYPTO),
            ...pick(TICKER_FOREX),
            ...pick(TICKER_INDEX),
        ];
    });

    // ── Pricing feature lists ────────────────────────────────────
    freePlanFeatures = [
        { label: 'AI signal dashboard (read-only)',  included: true  },
        { label: 'Real-time news intelligence feed', included: true  },
        { label: 'Backtest Lab (5 runs / day)',       included: true  },
        { label: 'Swing trade scanner',              included: true  },
        { label: 'Live MT5 order execution',         included: false },
        { label: 'Auto-trade with risk engine',      included: false },
        { label: 'Save & deploy trained models',     included: false },
    ];

    proPlanFeatures = [
        'Everything in Free',
        'Live MT5 order execution',
        'Auto-trade with risk circuit breaker',
        'Unlimited backtest runs',
        'Save & deploy trained models',
        'Macro data dashboard',
        'Priority support',
    ];

    // ── Navbar helpers ───────────────────────────────────────────
    @HostListener('window:scroll')
    onScroll(): void {
        this.isScrolled = window.scrollY > 24;
    }

    toggleMobileMenu(): void { this.mobileMenuOpen = !this.mobileMenuOpen; }
    closeMobileMenu(): void  { this.mobileMenuOpen = false; }
    scrollToTop(): void      { window.scrollTo({ top: 0, behavior: 'smooth' }); }

    // ── Navigation ───────────────────────────────────────────────
    navigateToLogin():    void { this.router.navigate(['/login']);     this.closeMobileMenu(); }
    navigateToRegister(): void { this.router.navigate(['/register']);  this.closeMobileMenu(); }
    navigateToDashboard():void { this.router.navigate(['/dashboard']); }

    // ── Ticker display helpers ───────────────────────────────────
    tickerLabel(item: MarketItem): string {
        if (item.type === 'CRYPTO') return item.symbol.replace('USDT', '/USD');
        // USD/EUR → EUR/USD  (standard FX notation)
        if (item.type === 'FOREX' && item.symbol.startsWith('USD/')) {
            const [, quote] = item.symbol.split('/');
            return `${quote}/USD`;
        }
        return item.symbol;
    }

    tickerPrice(item: MarketItem): string {
        if (item.type === 'CRYPTO') {
            return item.price >= 1000
                ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : item.price.toFixed(4);
        }
        if (item.type === 'FOREX')  return item.price.toFixed(5);
        if (item.type === 'INDEX')  return item.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return item.price.toFixed(2);
    }

    tickerTypeIcon(item: MarketItem): string {
        const map: Record<string, string> = {
            CRYPTO: '◈', FOREX: '⇄', INDEX: '▲', STOCK: '◉', COMMODITY: '◆'
        };
        return map[item.type] ?? '•';
    }
}
