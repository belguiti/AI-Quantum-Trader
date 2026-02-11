export interface User {
    id: number;
    username: string;
    email: string;
    walletBalance: number;
    avatarUrl: string;
    role: 'USER' | 'ADMIN';
    token?: string; // Optional, mainly for internal use if needed
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user_id: number;
    username: string;
    email: string;
    wallet_balance: string;
}
