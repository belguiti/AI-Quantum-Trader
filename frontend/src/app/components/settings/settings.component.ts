import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="min-h-screen bg-transparent p-6 md:p-10">
      <div class="max-w-4xl mx-auto space-y-8">
        
        <h1 class="text-3xl font-bold text-white mb-8">Settings</h1>

        <!-- Tabs -->
        <div class="flex space-x-1 bg-white/5 p-1 rounded-xl w-fit">
            <button 
                *ngFor="let tab of tabs" 
                (click)="activeTab.set(tab.id)"
                [class.bg-primary]="activeTab() === tab.id"
                [class.text-white]="activeTab() === tab.id"
                [class.text-gray-400]="activeTab() !== tab.id"
                class="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                {{ tab.label }}
            </button>
        </div>

        <!-- Profile Tab -->
        <div *ngIf="activeTab() === 'profile'" class="glass-panel p-8 rounded-2xl animate-fade-in">
            <h3 class="text-xl font-bold text-white mb-6">Profile Information</h3>
            
            <div class="grid gap-6 max-w-xl">
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Username</label>
                    <input [(ngModel)]="profileData.username" type="text" class="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors">
                </div>
                
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Email</label>
                    <input [value]="currentUser()?.email" type="email" disabled class="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed">
                    <p class="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
                </div>

                <div>
                    <label class="block text-sm text-gray-400 mb-2">New Password (Optional)</label>
                    <input [(ngModel)]="profileData.password" type="password" placeholder="Leave blank to keep current" class="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors">
                </div>

                <div class="pt-4">
                    <button (click)="saveProfile()" [disabled]="isLoading()" class="btn-primary px-8 py-3 w-full sm:w-auto flex items-center justify-center">
                        <span *ngIf="isLoading()" class="animate-spin mr-2">⟳</span>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>

        <!-- Wallet Tab -->
        <div *ngIf="activeTab() === 'wallet'" class="glass-panel p-8 rounded-2xl animate-fade-in">
            <h3 class="text-xl font-bold text-white mb-6">Wallet Connection</h3>

            <div class="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
                <div class="flex items-start space-x-4">
                    <div class="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <div>
                        <h4 class="text-white font-medium mb-1">Quantum Node Connection</h4>
                        <p class="text-sm text-gray-400">Link your wallet to receive payouts and pay for subscriptions directly via smart contract.</p>
                    </div>
                </div>
            </div>

            <div class="max-w-xl space-y-6">
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Wallet Address (USDT TRC20 / ERC20)</label>
                    <input [(ngModel)]="profileData.walletAddress" type="text" placeholder="0x..." class="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-primary transition-colors">
                </div>

                <div class="flex items-center justify-between bg-black/30 p-4 rounded-lg border border-white/5" *ngIf="currentUser()?.walletAddress">
                    <div class="flex items-center space-x-3">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-sm text-gray-300">Wallet Linked</span>
                    </div>
                    <button class="text-xs text-red-400 hover:text-red-300" (click)="profileData.walletAddress = ''; saveProfile()">Unlink</button>
                </div>

                <button (click)="saveProfile()" [disabled]="isLoading()" class="btn-primary px-8 py-3 w-full sm:w-auto flex items-center justify-center">
                    <span *ngIf="isLoading()" class="animate-spin mr-2">⟳</span>
                    {{ currentUser()?.walletAddress ? 'Update Wallet' : 'Link Wallet' }}
                </button>
            </div>
        </div>

        <!-- Account Tab -->
        <div *ngIf="activeTab() === 'account'" class="glass-panel p-8 rounded-2xl animate-fade-in">
            <h3 class="text-xl font-bold text-white mb-6">Subscription & Limits</h3>

            <div class="grid md:grid-cols-2 gap-6">
                <!-- Current Plan -->
                <div class="bg-black/30 p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg class="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"></path></svg>
                    </div>
                    <div class="text-sm text-gray-400 mb-1">Current Plan</div>
                    <div class="text-2xl font-bold text-white mb-4">{{ currentUser()?.subscriptionPlan || 'FREE' }}</div>
                    <ul class="space-y-2 text-sm text-gray-400 mb-6">
                        <li class="flex items-center"><span class="text-green-400 mr-2">✓</span> Basic AI Signals</li>
                        <li class="flex items-center"><span class="text-green-400 mr-2">✓</span> 1 Active Strategy</li>
                        <li class="flex items-center"><span class="text-gray-600 mr-2">×</span> Advanced ML Models</li>
                    </ul>
                    <button class="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10">Upgrade to Pro</button>
                </div>

                <!-- Usage Specs -->
                <div class="space-y-4">
                    <div class="bg-black/30 p-4 rounded-xl border border-white/5">
                        <div class="flex justify-between mb-2">
                            <span class="text-sm text-gray-400">Data Usage</span>
                            <span class="text-sm text-white">45%</span>
                        </div>
                        <div class="w-full bg-white/5 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: 45%"></div>
                        </div>
                    </div>
                    <div class="bg-black/30 p-4 rounded-xl border border-white/5">
                        <div class="flex justify-between mb-2">
                            <span class="text-sm text-gray-400">API Calls</span>
                            <span class="text-sm text-white">1,240 / 5,000</span>
                        </div>
                        <div class="w-full bg-white/5 rounded-full h-2">
                            <div class="bg-purple-500 h-2 rounded-full" style="width: 25%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
    `,
    styles: [`
        .glass-panel {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class SettingsComponent {
    authService = inject(AuthService);
    toastService = inject(ToastService);

    currentUser = this.authService.currentUser;
    activeTab = signal<'profile' | 'wallet' | 'account'>('profile');
    isLoading = signal(false);

    tabs: { id: 'profile' | 'wallet' | 'account'; label: string }[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'wallet', label: 'Wallet' },
        { id: 'account', label: 'Account' }
    ];

    profileData = {
        username: '',
        walletAddress: '',
        password: ''
    };

    constructor() {
        effect(() => {
            const user = this.currentUser();
            if (user) {
                this.profileData.username = user.username;
                // Add walletAddress to user model if it's missing in frontend model interface yet
                this.profileData.walletAddress = (user as any).walletAddress || '';
            }
        });
    }

    saveProfile() {
        this.isLoading.set(true);
        this.authService.updateProfile(this.profileData).subscribe({
            next: (response) => {
                this.toastService.show('Settings updated successfully', 'success');
                this.isLoading.set(false);
                this.profileData.password = ''; // Clear password field
            },
            error: (err) => {
                this.toastService.show('Failed to update settings', 'error');
                this.isLoading.set(false);
                console.error(err);
            }
        });
    }
}
