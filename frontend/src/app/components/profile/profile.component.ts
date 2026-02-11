import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="min-h-screen bg-transparent p-6 md:p-10">
      <div class="max-w-4xl mx-auto space-y-8">
        
        <!-- Header -->
        <h1 class="text-3xl font-bold text-white mb-8">Account Settings</h1>

        <!-- Profile Card -->
        <div class="glass-panel p-8 rounded-2xl flex items-start space-x-8">
            <div class="relative">
                <img [src]="user()?.avatarUrl" alt="Avatar" class="w-24 h-24 rounded-full border-2 border-primary shadow-lg shadow-primary/20">
                <div class="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            <div class="flex-1">
                <h2 class="text-2xl font-bold text-white mb-2">{{ user()?.username }}</h2>
                <div class="flex items-center space-x-2 text-gray-400 mb-4">
                    <span class="bg-white/10 px-2 py-0.5 rounded text-xs">ID: {{ user()?.id }}</span>
                    <span>{{ user()?.email }}</span>
                </div>
                <div class="flex space-x-4">
                    <button class="btn-secondary text-sm px-4 py-2">Edit Profile</button>
                    <button class="btn-secondary text-sm px-4 py-2 text-red-400 border-red-500/20 hover:bg-red-500/10" (click)="logout()">Sign Out</button>
                </div>
            </div>
        </div>

        <!-- Wallet Connection -->
        <div class="glass-panel p-8 rounded-2xl">
            <h3 class="text-xl font-bold text-white mb-6 flex items-center">
                <span class="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center mr-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </span>
                Wallet Connection
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Balance -->
                <div class="bg-black/30 p-6 rounded-xl border border-white/5">
                    <div class="text-gray-400 text-sm mb-1">Total Balance</div>
                    <div class="text-3xl font-bold text-white font-mono">$ {{ user()?.walletBalance | number:'1.2-2' }}</div>
                    <div class="mt-2 text-green-400 text-sm flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        +2.4% (24h)
                    </div>
                </div>

                <!-- Status -->
                <div class="bg-black/30 p-6 rounded-xl border border-white/5">
                    <div class="text-gray-400 text-sm mb-1">Connection Status</div>
                    <div class="flex items-center mt-2">
                        <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                        <span class="text-white font-medium">Connected to Quantum Node</span>
                    </div>
                    <div class="mt-2 text-gray-500 text-xs font-mono">
                        Latency: 12ms | Region: US-EAST-1
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  `
})
export class ProfileComponent {
    private authService = inject(AuthService);
    user = this.authService.currentUser;

    logout() {
        this.authService.logout();
    }
}
