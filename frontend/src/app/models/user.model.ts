export interface User {
    id: number;
    username: string;
    email: string;
    displayName?: string; // For UI display (e.g. stripped email)
    walletBalance: number;
    avatarUrl: string;
    role: 'USER' | 'ADMIN';
    token?: string;
    mt5Connected?: boolean;
    mt5BaseUrl?: string;
    walletAddress?: string;
    subscriptionPlan?: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user_id: number;
    username: string;
    email: string;
    wallet_balance: string;
    mt5_connected: boolean;
    mt5_base_url: string;
    wallet_address?: string;
    role?: string;
}
