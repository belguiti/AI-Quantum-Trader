import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:8080/api/auth'; // Gateway URL

    // Signal for current user state
    currentUser = signal<User | null>(this.getUserFromStorage());

    // Computed signals
    isAuthenticated = computed(() => !!this.currentUser());
    walletBalance = computed(() => this.currentUser()?.walletBalance || 0);

    constructor(private http: HttpClient, private router: Router) { }

    login(credentials: any): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => this.handleAuthResponse(response))
        );
    }

    register(data: any): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
            tap(response => this.handleAuthResponse(response))
        );
    }

    logout() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_data');
        this.currentUser.set(null);
        this.router.navigate(['/']);
    }

    private handleAuthResponse(response: AuthResponse) {
        localStorage.setItem('jwt_token', response.access_token);

        // Calculate display name (strip email domain if username is email)
        const rawUsername = response.username;
        const displayName = rawUsername.includes('@') ? rawUsername.split('@')[0] : rawUsername;

        const user: User = {
            id: response.user_id,
            username: rawUsername,
            email: response.email,
            displayName: displayName,
            walletBalance: parseFloat(response.wallet_balance),
            avatarUrl: `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`,
            role: 'USER'
        };

        localStorage.setItem('user_data', JSON.stringify(user));
        this.currentUser.set(user);
        this.router.navigate(['/dashboard']);
    }

    private getUserFromStorage(): User | null {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            const user = JSON.parse(userData) as User;
            // Backfill displayName if missing
            if (!user.displayName) {
                user.displayName = user.username.includes('@') ? user.username.split('@')[0] : user.username;
            }
            return user;
        }
        return null;
    }

    getToken(): string | null {
        return localStorage.getItem('jwt_token');
    }
}
