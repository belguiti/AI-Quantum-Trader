import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminStats, AdminUser, CrowdSignal } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
    ApexChart, ApexAxisChartSeries, ApexXAxis, ApexStroke,
    ApexFill, ApexTooltip, ApexNonAxisChartSeries, ApexLegend, ApexResponsive
} from 'ng-apexcharts';

export type LineChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    stroke: ApexStroke;
    fill: ApexFill;
    tooltip: ApexTooltip;
};

export type PieChartOptions = {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    legend: ApexLegend;
    responsive: ApexResponsive[];
};

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    template: `
    <div class="min-h-screen bg-gray-950 text-white">

      <!-- Admin Header Bar (Red/Dark theme) -->
      <div class="bg-gradient-to-r from-red-950 via-gray-900 to-red-950 border-b border-red-900/50 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(239,68,68,0.15)]">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">Admin Control Center</h1>
            <p class="text-xs text-red-400/70">Platform-wide oversight & management</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs text-red-400 font-bold uppercase tracking-wider animate-pulse">● LIVE</span>
          <button (click)="loadData()" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-all flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div class="p-6 space-y-6">

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Users -->
          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-red-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-red-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Users</span>
              <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-white">{{ stats()?.totalUsers ?? '—' }}</div>
            <div class="flex items-center space-x-3 mt-2 text-xs">
              <span class="text-green-400">● {{ stats()?.activeUsers ?? 0 }} active</span>
              <span class="text-red-400">● {{ stats()?.bannedUsers ?? 0 }} banned</span>
            </div>
          </div>

          <!-- 24h Trades -->
          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">24h Trades</span>
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-white">{{ stats()?.trades24h ?? '—' }}</div>
            <div class="text-xs text-gray-500 mt-2">Volume in last 24 hours</div>
          </div>

          <!-- Platform Net PnL -->
          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">Platform Net PnL</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div class="text-3xl font-bold" [class.text-emerald-400]="(stats()?.platformNetPnl ?? 0) >= 0" [class.text-red-400]="(stats()?.platformNetPnl ?? 0) < 0">
              {{ (stats()?.platformNetPnl ?? 0) >= 0 ? '+' : '' }}{{ stats()?.platformNetPnl?.toFixed(2) ?? '—' }}
            </div>
            <div class="text-xs text-gray-500 mt-2">Aggregate user P&L</div>
          </div>

          <!-- Subscriptions -->
          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">Subscriptions</span>
              <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-white">{{ stats()?.proSubscriptions ?? '—' }}</div>
            <div class="flex items-center space-x-3 mt-2 text-xs">
              <span class="text-purple-400">PRO</span>
              <span class="text-gray-500">{{ stats()?.freeSubscriptions ?? 0 }} Free</span>
              <span class="text-yellow-500">{{ stats()?.trialSubscriptions ?? 0 }} Trial</span>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- User Growth Chart -->
          <div class="lg:col-span-2 bg-gray-900/80 border border-white/5 rounded-2xl p-6">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
              <span class="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              User Growth (Last 30 Days)
            </h3>
            @if (lineChartOptions()) {
              <apx-chart
                [series]="lineChartOptions()!.series"
                [chart]="lineChartOptions()!.chart"
                [xaxis]="lineChartOptions()!.xaxis"
                [stroke]="lineChartOptions()!.stroke"
                [fill]="lineChartOptions()!.fill"
                [tooltip]="lineChartOptions()!.tooltip">
              </apx-chart>
            } @else {
              <div class="h-48 flex items-center justify-center text-gray-600 text-sm">Loading chart...</div>
            }
          </div>

          <!-- Favorite Pairs Pie Chart -->
          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-6">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
              <span class="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              Favorite Pairs
            </h3>
            @if (pieChartOptions()) {
              <apx-chart
                [series]="pieChartOptions()!.series"
                [chart]="pieChartOptions()!.chart"
                [labels]="pieChartOptions()!.labels"
                [legend]="pieChartOptions()!.legend"
                [responsive]="pieChartOptions()!.responsive">
              </apx-chart>
            } @else {
              <div class="h-48 flex items-center justify-center text-gray-600 text-sm">No trade data yet</div>
            }
          </div>
        </div>

        <!-- Crowd Signals Widget -->
        <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-6">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
            <span class="text-lg mr-2">🔥</span> Top 3 Crowd Signals — Winning Traders
          </h3>
          @if (crowdSignals().length === 0) {
            <div class="text-center py-8 text-gray-600">
              <p class="text-2xl mb-2">📊</p>
              <p class="text-sm">No signals yet — need top traders with open positions</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (signal of crowdSignals(); track signal.symbol) {
                <div class="rounded-xl border p-4 relative overflow-hidden"
                     [class.border-green-500_30]="signal.direction === 'BUY'"
                     [class.bg-green-500_5]="signal.direction === 'BUY'"
                     [class.border-red-500_30]="signal.direction === 'SELL'"
                     [class.bg-red-500_5]="signal.direction === 'SELL'"
                     [ngClass]="signal.direction === 'BUY' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'">
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-bold text-white text-lg font-mono">{{ signal.symbol }}</span>
                    <span class="px-2 py-0.5 rounded text-xs font-bold"
                          [ngClass]="signal.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                      {{ signal.label }}
                    </span>
                  </div>
                  <div class="text-2xl font-bold mb-1"
                       [ngClass]="signal.direction === 'BUY' ? 'text-green-400' : 'text-red-400'">
                    {{ signal.sentiment }}%
                  </div>
                  <p class="text-xs text-gray-400">of winning traders are {{ signal.direction === 'BUY' ? 'buying' : 'selling' }}</p>
                  <div class="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                         [ngClass]="signal.direction === 'BUY' ? 'bg-green-500' : 'bg-red-500'"
                         [style.width.%]="signal.sentiment"></div>
                  </div>
                  <p class="text-[10px] text-gray-600 mt-2">Based on {{ signal.traderCount }} top trader positions</p>
                </div>
              }
            </div>
          }
        </div>

        <!-- User Management Table -->
        <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <span class="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
              User Management
            </h3>
            <div class="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Search users..."
                (input)="filterUsers($any($event.target).value)"
                class="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-red-500/50 outline-none w-48 transition-all">
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/5">
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">User</th>
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">Joined</th>
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">Win Rate</th>
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">Total P&L</th>
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">Plan</th>
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">Status</th>
                  <th class="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">API Usage</th>
                  <th class="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-bold">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-white/2 transition-colors group">
                    <td class="py-3 px-4">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-white">
                          {{ user.username.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ user.username }}</div>
                          <div class="text-xs text-gray-500">{{ user.email }}</div>
                        </div>
                        @if (user.role === 'ADMIN') {
                          <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">ADMIN</span>
                        }
                      </div>
                    </td>
                    <td class="py-3 px-4 text-gray-400 text-xs">{{ user.createdAt | date:'MMM d, y' }}</td>
                    <td class="py-3 px-4">
                      <span class="font-mono font-bold" [class.text-green-400]="user.winRate > 50" [class.text-red-400]="user.winRate <= 50">
                        {{ user.winRate > 0 ? (user.winRate | number:'1.0-1') + '%' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="font-mono" [class.text-green-400]="user.totalProfit > 0" [class.text-red-400]="user.totalProfit < 0" [class.text-gray-500]="user.totalProfit === 0">
                        {{ user.totalProfit !== 0 ? ((user.totalProfit > 0 ? '+' : '') + (user.totalProfit | number:'1.2-2')) : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                            [ngClass]="{
                              'bg-purple-500/20 text-purple-400': user.subscriptionPlan === 'PRO',
                              'bg-gray-500/20 text-gray-400': user.subscriptionPlan === 'FREE',
                              'bg-yellow-500/20 text-yellow-400': user.paymentStatus === 'TRIAL'
                            }">
                        {{ user.paymentStatus === 'TRIAL' ? 'TRIAL' : user.subscriptionPlan }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="flex items-center space-x-1.5">
                        <span class="w-1.5 h-1.5 rounded-full" [class.bg-green-500]="user.isActive" [class.bg-red-500]="!user.isActive"></span>
                        <span class="text-xs" [class.text-green-400]="user.isActive" [class.text-red-400]="!user.isActive">
                          {{ user.isActive ? 'Active' : 'Banned' }}
                        </span>
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center space-x-2">
                        <div class="flex-1 h-1 bg-white/5 rounded-full w-16 overflow-hidden">
                          <div class="h-full bg-blue-500 rounded-full" [style.width.%]="Math.min(100, (user.dataUsage / 10000) * 100)"></div>
                        </div>
                        <span class="text-xs text-gray-500 font-mono">{{ user.dataUsage }}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="relative inline-block" (click)="toggleDropdown(user.id)">
                        <button class="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-all flex items-center space-x-1">
                          <span>Actions</span>
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        @if (openDropdown() === user.id) {
                          <div class="absolute right-0 top-8 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-fade-in-down">
                            <button (click)="banUser(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center space-x-2"
                                    [class.text-red-400]="user.isActive" [class.text-green-400]="!user.isActive">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              <span>{{ user.isActive ? 'Ban User' : 'Unban User' }}</span>
                            </button>
                            <button (click)="upgradeToPro(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2 text-sm text-purple-400 hover:bg-white/5 transition-colors flex items-center space-x-2">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                              <span>Upgrade to PRO</span>
                            </button>
                            <button (click)="resetUsage(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-white/5 transition-colors flex items-center space-x-2">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              <span>Reset API Usage</span>
                            </button>
                            <div class="border-t border-white/5 my-1"></div>
                            <button (click)="markPaymentFailed(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-white/5 transition-colors flex items-center space-x-2">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              <span>Mark Payment Failed</span>
                            </button>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            @if (filteredUsers().length === 0) {
              <div class="text-center py-12 text-gray-600">
                <p class="text-3xl mb-3">👥</p>
                <p class="text-sm">No users found</p>
              </div>
            }
          </div>
        </div>

      </div>
    </div>

    <!-- Backdrop for dropdown close -->
    @if (openDropdown() !== null) {
      <div class="fixed inset-0 z-40" (click)="openDropdown.set(null)"></div>
    }
  `
})
export class AdminDashboardComponent implements OnInit {
    Math = Math;

    stats = signal<AdminStats | null>(null);
    users = signal<AdminUser[]>([]);
    filteredUsers = signal<AdminUser[]>([]);
    crowdSignals = signal<CrowdSignal[]>([]);
    lineChartOptions = signal<LineChartOptions | null>(null);
    pieChartOptions = signal<PieChartOptions | null>(null);
    openDropdown = signal<number | null>(null);

    constructor(
        private adminService: AdminService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.adminService.getStats().subscribe({
            next: (s) => {
                this.stats.set(s);
                this.buildLineChart(s.userGrowth);
                this.buildPieChart(s.symbolBreakdown);
            },
            error: () => this.toastService.show('Failed to load admin stats', 'error')
        });

        this.adminService.getUsers().subscribe({
            next: (u) => { this.users.set(u); this.filteredUsers.set(u); },
            error: () => this.toastService.show('Failed to load users', 'error')
        });

        this.adminService.getCrowdSignals().subscribe({
            next: (s) => this.crowdSignals.set(s),
            error: () => { } // Silent — no top traders yet is fine
        });
    }

    filterUsers(query: string): void {
        const q = query.toLowerCase();
        this.filteredUsers.set(
            this.users().filter(u =>
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
            )
        );
    }

    toggleDropdown(userId: number): void {
        this.openDropdown.set(this.openDropdown() === userId ? null : userId);
    }

    banUser(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.toggleBan(user.id).subscribe({
            next: (updated) => {
                this.updateUserInList(updated);
                this.toastService.show(
                    updated.isActive ? `${user.username} has been unbanned` : `${user.username} has been banned`,
                    updated.isActive ? 'success' : 'error'
                );
            },
            error: () => this.toastService.show('Action failed', 'error')
        });
    }

    upgradeToPro(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.updateSubscription(user.id, 'PRO', 'ACTIVE').subscribe({
            next: (updated) => {
                this.updateUserInList(updated);
                this.toastService.show(`${user.username} upgraded to PRO`, 'success');
            },
            error: () => this.toastService.show('Upgrade failed', 'error')
        });
    }

    markPaymentFailed(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.updateSubscription(user.id, user.subscriptionPlan, 'FAILED').subscribe({
            next: (updated) => {
                this.updateUserInList(updated);
                this.toastService.show(`Payment marked as FAILED for ${user.username}`, 'info');
            },
            error: () => this.toastService.show('Action failed', 'error')
        });
    }

    resetUsage(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.resetDataUsage(user.id).subscribe({
            next: () => {
                const updated = this.users().map(u => u.id === user.id ? { ...u, dataUsage: 0 } : u);
                this.users.set(updated);
                this.filteredUsers.set(updated);
                this.toastService.show(`API usage reset for ${user.username}`, 'success');
            },
            error: () => this.toastService.show('Reset failed', 'error')
        });
    }

    private updateUserInList(updated: AdminUser): void {
        const update = (list: AdminUser[]) => list.map(u => u.id === updated.id ? { ...u, ...updated } : u);
        this.users.update(update);
        this.filteredUsers.update(update);
    }

    private buildLineChart(growth: { date: string; count: number }[]): void {
        if (!growth || growth.length === 0) return;
        this.lineChartOptions.set({
            series: [{ name: 'New Users', data: growth.map(g => g.count) }],
            chart: { type: 'area', height: 200, background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
            xaxis: { categories: growth.map(g => g.date), labels: { style: { colors: '#6b7280', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
            stroke: { curve: 'smooth', width: 2, colors: ['#ef4444'] },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100], colorStops: [{ offset: 0, color: '#ef4444', opacity: 0.3 }, { offset: 100, color: '#ef4444', opacity: 0 }] } },
            tooltip: { theme: 'dark' }
        });
    }

    private buildPieChart(breakdown: { symbol: string; count: number; percentage: number }[]): void {
        if (!breakdown || breakdown.length === 0) return;
        this.pieChartOptions.set({
            series: breakdown.map(b => b.count),
            chart: { type: 'donut', height: 220, background: 'transparent' },
            labels: breakdown.map(b => b.symbol),
            legend: { position: 'bottom', labels: { colors: '#9ca3af' }, fontSize: '11px' },
            responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: 'bottom' } } }]
        });
    }
}
