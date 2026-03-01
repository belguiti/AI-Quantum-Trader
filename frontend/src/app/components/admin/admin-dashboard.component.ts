import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminStats, AdminUser, CrowdSignal } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import 'apexcharts';
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

      <!-- ── Header ──────────────────────────────────────────────────── -->
      <div class="bg-gradient-to-r from-red-950 via-gray-900 to-red-950 border-b border-red-900/50 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(239,68,68,0.15)]">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">Admin Control Center</h1>
            <p class="text-xs text-red-400/70">Platform-wide oversight &amp; management</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs text-red-400 font-bold uppercase tracking-wider animate-pulse">● LIVE</span>
          <button (click)="loadData()" [disabled]="loading()"
                  class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-all flex items-center space-x-2 disabled:opacity-50">
            <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ loading() ? 'Loading…' : 'Refresh' }}</span>
          </button>
        </div>
      </div>

      <div class="p-6 space-y-6">

        <!-- ── KPI Cards ────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden hover:border-red-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-red-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Users</span>
              <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-white">{{ stats()?.totalUsers ?? '—' }}</div>
            <div class="flex items-center space-x-3 mt-2 text-xs">
              <span class="text-green-400">● {{ stats()?.activeUsers ?? 0 }} active</span>
              <span class="text-red-400">● {{ stats()?.bannedUsers ?? 0 }} banned</span>
            </div>
          </div>

          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden hover:border-blue-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">24h Trades</span>
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-white">{{ stats()?.trades24h ?? '—' }}</div>
            <div class="text-xs text-gray-500 mt-2">Executions in last 24 hours</div>
          </div>

          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden hover:border-emerald-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">Platform Net PnL</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold"
                 [class.text-emerald-400]="(stats()?.platformNetPnl ?? 0) >= 0"
                 [class.text-red-400]="(stats()?.platformNetPnl ?? 0) < 0">
              {{ (stats()?.platformNetPnl ?? 0) >= 0 ? '+' : '' }}{{ stats()?.platformNetPnl?.toFixed(2) ?? '—' }}
            </div>
            <div class="text-xs text-gray-500 mt-2">Aggregate closed-trade P&amp;L</div>
          </div>

          <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-5 relative overflow-hidden hover:border-purple-500/30 transition-all">
            <div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-2xl rounded-full -mr-5 -mt-5"></div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-gray-500 uppercase tracking-wider font-bold">Subscriptions</span>
              <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-bold text-white">{{ stats()?.proSubscriptions ?? '—' }}</div>
            <div class="flex items-center space-x-3 mt-2 text-xs">
              <span class="text-purple-400">{{ stats()?.proSubscriptions ?? 0 }} PRO</span>
              <span class="text-gray-500">{{ stats()?.freeSubscriptions ?? 0 }} Free</span>
              <span class="text-yellow-500">{{ stats()?.trialSubscriptions ?? 0 }} Trial</span>
            </div>
          </div>
        </div>

        <!-- ── Charts Row ───────────────────────────────────────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

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
              <div class="h-48 flex items-center justify-center text-gray-600 text-sm">
                {{ loading() ? 'Loading chart…' : 'No growth data yet' }}
              </div>
            }
          </div>

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
              <div class="h-48 flex items-center justify-center text-gray-600 text-sm">
                No trade data yet
              </div>
            }
          </div>
        </div>

        <!-- ── Crowd Signals ────────────────────────────────────────── -->
        <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-6">
          <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span class="text-lg">🔥</span> Top 3 Crowd Signals — Winning Traders
          </h3>
          @if (crowdSignals().length === 0) {
            <div class="text-center py-8 text-gray-600">
              <p class="text-2xl mb-2">📊</p>
              <p class="text-sm">No signals yet — need top traders with open positions (min 50 trades, 60% win rate)</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (sig of crowdSignals(); track sig.symbol) {
                <div class="rounded-xl border p-4 relative overflow-hidden"
                     [ngClass]="sig.direction === 'BUY'
                       ? 'border-green-500/30 bg-green-500/5'
                       : 'border-red-500/30 bg-red-500/5'">
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-bold text-white text-lg font-mono">{{ sig.symbol }}</span>
                    <span class="px-2 py-0.5 rounded text-xs font-bold"
                          [ngClass]="sig.direction === 'BUY'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'">
                      {{ sig.label }}
                    </span>
                  </div>
                  <div class="text-2xl font-bold mb-1"
                       [ngClass]="sig.direction === 'BUY' ? 'text-green-400' : 'text-red-400'">
                    {{ sig.sentiment }}%
                  </div>
                  <p class="text-xs text-gray-400">
                    of winning traders are {{ sig.direction === 'BUY' ? 'buying' : 'selling' }}
                  </p>
                  <div class="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                         [ngClass]="sig.direction === 'BUY' ? 'bg-green-500' : 'bg-red-500'"
                         [style.width.%]="sig.sentiment"></div>
                  </div>
                  <p class="text-[10px] text-gray-600 mt-2">
                    Based on {{ sig.traderCount }} top-trader positions
                  </p>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── User Management Table ────────────────────────────────── -->
        <div class="bg-gray-900/80 border border-white/5 rounded-2xl p-6">

          <!-- Table header / search / page-size -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <span class="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
              User Management
              <span class="ml-2 px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-xs font-normal normal-case tracking-normal">
                {{ filteredUsers().length }} users
              </span>
            </h3>
            <div class="flex items-center gap-3">
              <!-- Search -->
              <input type="text"
                     placeholder="Search users…"
                     (input)="onSearch($any($event.target).value)"
                     class="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-red-500/50 outline-none w-44 transition-all">
              <!-- Page size -->
              <select (change)="setPageSize(+$any($event.target).value)"
                      class="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-gray-400 outline-none focus:border-red-500/50 transition-all">
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/5">
                  <th class="text-left py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">User</th>
                  <th class="text-left py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Joined</th>
                  <th class="text-right py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Trades</th>
                  <th class="text-right py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Win Rate</th>
                  <th class="text-right py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Total P&amp;L</th>
                  <th class="text-left py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Plan</th>
                  <th class="text-left py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Status</th>
                  <th class="text-left py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">API Usage</th>
                  <th class="text-right py-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-bold">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (user of paginatedUsers(); track user.id) {
                  <tr class="hover:bg-white/[0.02] transition-colors">

                    <!-- User -->
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {{ user.username.charAt(0).toUpperCase() }}
                        </div>
                        <div class="min-w-0">
                          <div class="font-medium text-white flex items-center gap-1.5">
                            {{ user.username }}
                            @if (user.role === 'ADMIN') {
                              <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded uppercase">ADMIN</span>
                            }
                          </div>
                          <div class="text-xs text-gray-500 truncate max-w-[140px]">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>

                    <!-- Joined -->
                    <td class="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                      {{ user.createdAt | date:'MMM d, y' }}
                    </td>

                    <!-- Trades -->
                    <td class="py-3 px-3 text-right">
                      <span class="font-mono text-gray-300 text-sm">
                        {{ user.totalTrades > 0 ? user.totalTrades : '—' }}
                      </span>
                    </td>

                    <!-- Win Rate -->
                    <td class="py-3 px-3 text-right">
                      <span class="font-mono font-semibold text-sm"
                            [class.text-green-400]="user.winRate > 50"
                            [class.text-red-400]="user.winRate > 0 && user.winRate <= 50"
                            [class.text-gray-500]="user.winRate === 0">
                        {{ user.winRate > 0 ? (user.winRate | number:'1.1-1') + '%' : '—' }}
                      </span>
                    </td>

                    <!-- P&L -->
                    <td class="py-3 px-3 text-right">
                      <span class="font-mono text-sm"
                            [class.text-green-400]="user.totalProfit > 0"
                            [class.text-red-400]="user.totalProfit < 0"
                            [class.text-gray-500]="user.totalProfit === 0">
                        {{ user.totalProfit !== 0
                            ? (user.totalProfit > 0 ? '+' : '') + (user.totalProfit | number:'1.2-2')
                            : '—' }}
                      </span>
                    </td>

                    <!-- Plan -->
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                            [ngClass]="{
                              'bg-purple-500/20 text-purple-400': user.subscriptionPlan === 'PRO' && user.paymentStatus !== 'TRIAL',
                              'bg-gray-500/20 text-gray-400':    user.subscriptionPlan === 'FREE',
                              'bg-yellow-500/20 text-yellow-400': user.paymentStatus === 'TRIAL',
                              'bg-orange-500/20 text-orange-400': user.paymentStatus === 'FAILED'
                            }">
                        {{ user.paymentStatus === 'TRIAL' ? 'TRIAL'
                           : user.paymentStatus === 'FAILED' ? 'FAILED'
                           : user.subscriptionPlan }}
                      </span>
                    </td>

                    <!-- Status -->
                    <td class="py-3 px-3">
                      <span class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full"
                              [class.bg-green-500]="user.isActive"
                              [class.bg-red-500]="!user.isActive"></span>
                        <span class="text-xs"
                              [class.text-green-400]="user.isActive"
                              [class.text-red-400]="!user.isActive">
                          {{ user.isActive ? 'Active' : 'Banned' }}
                        </span>
                      </span>
                    </td>

                    <!-- API Usage -->
                    <td class="py-3 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-14 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                               [ngClass]="getUsageColor(user.dataUsage)"
                               [style.width.%]="Math.min(100, (user.dataUsage / 10000) * 100)"></div>
                        </div>
                        <span class="text-xs text-gray-500 font-mono">{{ user.dataUsage | number }}</span>
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-3 text-right">
                      <div class="relative inline-block">
                        <button (click)="toggleDropdown(user.id); $event.stopPropagation()"
                                class="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-all flex items-center gap-1">
                          <span>Actions</span>
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        @if (openDropdown() === user.id) {
                          <div class="absolute right-0 top-8 w-52 bg-gray-800 border border-white/10 rounded-xl shadow-2xl py-1 z-50">

                            <!-- Ban / Unban -->
                            <button (click)="banUser(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
                                    [class.text-red-400]="user.isActive"
                                    [class.text-green-400]="!user.isActive">
                              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              {{ user.isActive ? 'Ban User' : 'Unban User' }}
                            </button>

                            <div class="border-t border-white/5 my-1"></div>

                            <!-- Upgrade to PRO (only if not already PRO) -->
                            @if (user.subscriptionPlan !== 'PRO' || user.paymentStatus === 'TRIAL') {
                              <button (click)="upgradeToPro(user); $event.stopPropagation()"
                                      class="w-full text-left px-4 py-2.5 text-sm text-purple-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Upgrade to PRO
                              </button>
                            }

                            <!-- Downgrade to FREE (only if PRO) -->
                            @if (user.subscriptionPlan === 'PRO') {
                              <button (click)="downgradeToFree(user); $event.stopPropagation()"
                                      class="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                Downgrade to FREE
                              </button>
                            }

                            <!-- Mark Payment Failed -->
                            @if (user.paymentStatus !== 'FAILED') {
                              <button (click)="markPaymentFailed(user); $event.stopPropagation()"
                                      class="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Mark Payment Failed
                              </button>
                            }

                            <!-- Reset API Usage -->
                            <button (click)="resetUsage(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2.5 text-sm text-blue-400 hover:bg-white/5 transition-colors flex items-center gap-2">
                              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Reset API Usage
                            </button>

                            <div class="border-t border-white/5 my-1"></div>

                            <!-- Toggle Admin role -->
                            <button (click)="changeRole(user); $event.stopPropagation()"
                                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
                                    [class.text-red-400]="user.role !== 'ADMIN'"
                                    [class.text-gray-400]="user.role === 'ADMIN'">
                              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              {{ user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin' }}
                            </button>

                          </div>
                        }
                      </div>
                    </td>

                  </tr>
                }
              </tbody>
            </table>

            @if (filteredUsers().length === 0 && !loading()) {
              <div class="text-center py-12 text-gray-600">
                <p class="text-3xl mb-3">👥</p>
                <p class="text-sm">No users found</p>
              </div>
            }
          </div>

          <!-- ── Pagination Controls ──────────────────────────────── -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between mt-5 pt-4 border-t border-white/5">

              <!-- Info -->
              <span class="text-xs text-gray-500">
                Showing {{ pageStart() }}–{{ pageEnd() }} of {{ filteredUsers().length }} users
              </span>

              <!-- Page buttons -->
              <div class="flex items-center gap-1">
                <!-- First -->
                <button (click)="goToPage(1)" [disabled]="currentPage() === 1"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  «
                </button>
                <!-- Prev -->
                <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  ‹
                </button>

                @for (p of pageNumbers(); track p) {
                  @if (p === -1) {
                    <span class="w-8 h-8 flex items-center justify-center text-gray-600 text-xs">…</span>
                  } @else {
                    <button (click)="goToPage(p)"
                            class="w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all"
                            [class.bg-red-500]="p === currentPage()"
                            [class.text-white]="p === currentPage()"
                            [class.font-bold]="p === currentPage()"
                            [class.text-gray-400]="p !== currentPage()"
                            [class.hover:bg-white_10]="p !== currentPage()">
                      {{ p }}
                    </button>
                  }
                }

                <!-- Next -->
                <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  ›
                </button>
                <!-- Last -->
                <button (click)="goToPage(totalPages())" [disabled]="currentPage() === totalPages()"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  »
                </button>
              </div>

            </div>
          }
        </div>

      </div>
    </div>

    <!-- Backdrop for dropdown -->
    @if (openDropdown() !== null) {
      <div class="fixed inset-0 z-40" (click)="openDropdown.set(null)"></div>
    }
  `
})
export class AdminDashboardComponent implements OnInit {
    Math = Math;

    // ── State ────────────────────────────────────────────────────────
    stats          = signal<AdminStats | null>(null);
    users          = signal<AdminUser[]>([]);
    filteredUsers  = signal<AdminUser[]>([]);
    crowdSignals   = signal<CrowdSignal[]>([]);
    lineChartOptions = signal<LineChartOptions | null>(null);
    pieChartOptions  = signal<PieChartOptions | null>(null);
    openDropdown   = signal<number | null>(null);
    loading        = signal(false);

    // ── Pagination ───────────────────────────────────────────────────
    currentPage = signal(1);
    pageSize    = signal(10);

    totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.pageSize()) || 1);
    pageStart  = computed(() => (this.currentPage() - 1) * this.pageSize() + 1);
    pageEnd    = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredUsers().length));

    paginatedUsers = computed(() => {
        const start = (this.currentPage() - 1) * this.pageSize();
        return this.filteredUsers().slice(start, start + this.pageSize());
    });

    /** Build a compact window of page numbers with ellipsis. */
    pageNumbers = computed((): number[] => {
        const total = this.totalPages();
        const cur   = this.currentPage();
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

        const pages: number[] = [1];
        if (cur > 3)           pages.push(-1);           // left ellipsis
        for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
        if (cur < total - 2)   pages.push(-1);           // right ellipsis
        pages.push(total);
        return pages;
    });

    constructor(
        private adminService: AdminService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void { this.loadData(); }

    // ── Data loading ─────────────────────────────────────────────────
    loadData(): void {
        this.loading.set(true);

        this.adminService.getStats().subscribe({
            next: (s) => {
                this.stats.set(s);
                this.buildLineChart(s.userGrowth);
                this.buildPieChart(s.symbolBreakdown);
            },
            error: () => this.toastService.show('Failed to load admin stats', 'error')
        });

        this.adminService.getUsers().subscribe({
            next: (u) => {
                this.users.set(u);
                this.filteredUsers.set(u);
                this.currentPage.set(1);
                this.loading.set(false);
            },
            error: () => {
                this.toastService.show('Failed to load users', 'error');
                this.loading.set(false);
            }
        });

        this.adminService.getCrowdSignals().subscribe({
            next: (s) => this.crowdSignals.set(s),
            error: () => { }  // Silent — no top traders yet is fine
        });
    }

    // ── Search ───────────────────────────────────────────────────────
    onSearch(query: string): void {
        const q = query.toLowerCase().trim();
        this.filteredUsers.set(
            q ? this.users().filter(u =>
                    u.username.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q))
              : [...this.users()]
        );
        this.currentPage.set(1);
    }

    // ── Pagination helpers ───────────────────────────────────────────
    setPageSize(size: number): void {
        this.pageSize.set(size);
        this.currentPage.set(1);
    }

    goToPage(page: number): void {
        const clamped = Math.max(1, Math.min(page, this.totalPages()));
        this.currentPage.set(clamped);
    }

    // ── Dropdown ─────────────────────────────────────────────────────
    toggleDropdown(userId: number): void {
        this.openDropdown.set(this.openDropdown() === userId ? null : userId);
    }

    // ── User actions ─────────────────────────────────────────────────
    banUser(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.toggleBan(user.id).subscribe({
            next: (updated) => {
                this.patchUser(updated);
                this.toastService.show(
                    updated.isActive ? `${user.username} unbanned` : `${user.username} banned`,
                    updated.isActive ? 'success' : 'info'
                );
            },
            error: () => this.toastService.show('Action failed', 'error')
        });
    }

    upgradeToPro(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.updateSubscription(user.id, 'PRO', 'ACTIVE').subscribe({
            next: (updated) => {
                this.patchUser(updated);
                this.toastService.show(`${user.username} upgraded to PRO`, 'success');
            },
            error: () => this.toastService.show('Upgrade failed', 'error')
        });
    }

    downgradeToFree(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.downgradeToFree(user.id).subscribe({
            next: (updated) => {
                this.patchUser(updated);
                this.toastService.show(`${user.username} downgraded to FREE`, 'info');
            },
            error: () => this.toastService.show('Downgrade failed', 'error')
        });
    }

    markPaymentFailed(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.updateSubscription(user.id, user.subscriptionPlan, 'FAILED').subscribe({
            next: (updated) => {
                this.patchUser(updated);
                this.toastService.show(`Payment marked FAILED for ${user.username}`, 'info');
            },
            error: () => this.toastService.show('Action failed', 'error')
        });
    }

    resetUsage(user: AdminUser): void {
        this.openDropdown.set(null);
        this.adminService.resetDataUsage(user.id).subscribe({
            next: () => {
                this.patchUser({ ...user, dataUsage: 0 });
                this.toastService.show(`API usage reset for ${user.username}`, 'success');
            },
            error: () => this.toastService.show('Reset failed', 'error')
        });
    }

    changeRole(user: AdminUser): void {
        this.openDropdown.set(null);
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
        this.adminService.updateRole(user.id, newRole).subscribe({
            next: (updated) => {
                this.patchUser(updated);
                this.toastService.show(
                    newRole === 'ADMIN'
                        ? `${user.username} is now an Admin`
                        : `${user.username} admin role removed`,
                    'success'
                );
            },
            error: () => this.toastService.show('Role update failed', 'error')
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────
    getUsageColor(usage: number): string {
        const pct = (usage / 10000) * 100;
        if (pct >= 90) return 'bg-red-500';
        if (pct >= 60) return 'bg-yellow-500';
        return 'bg-blue-500';
    }

    private patchUser(updated: Partial<AdminUser> & { id: number }): void {
        const patch = (list: AdminUser[]) =>
            list.map(u => u.id === updated.id ? { ...u, ...updated } : u);
        this.users.update(patch);
        this.filteredUsers.update(patch);
    }

    // ── Charts ───────────────────────────────────────────────────────
    private buildLineChart(growth: { date: string; count: number }[]): void {
        if (!growth?.length) return;
        this.lineChartOptions.set({
            series: [{ name: 'New Users', data: growth.map(g => g.count) }],
            chart: {
                type: 'area', height: 200, background: 'transparent',
                toolbar: { show: false }
            },
            xaxis: {
                categories: growth.map(g => g.date),
                labels: { style: { colors: '#6b7280', fontSize: '10px' } },
                axisBorder: { show: false }, axisTicks: { show: false }
            },
            stroke: { curve: 'smooth', width: 2, colors: ['#ef4444'] },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0, stops: [0, 100],
                    colorStops: [
                        { offset: 0, color: '#ef4444', opacity: 0.3 },
                        { offset: 100, color: '#ef4444', opacity: 0 }
                    ]
                }
            },
            tooltip: { theme: 'dark' }
        });
    }

    private buildPieChart(breakdown: { symbol: string; count: number; percentage: number }[]): void {
        if (!breakdown?.length) return;
        this.pieChartOptions.set({
            series: breakdown.map(b => b.count),
            chart: { type: 'donut', height: 220, background: 'transparent' },
            labels: breakdown.map(b => b.symbol),
            legend: { position: 'bottom', labels: { colors: '#9ca3af' }, fontSize: '11px' },
            responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: 'bottom' } } }]
        });
    }
}
