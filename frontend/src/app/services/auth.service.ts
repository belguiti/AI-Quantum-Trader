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

        const user: User = {
            id: response.user_id,
            username: response.username,
            email: response.email,
            walletBalance: parseFloat(response.wallet_balance),
            avatarUrl: `https://ui-avatars.com/api/?name=${response.username}&background=0D8ABC&color=fff`, // Fallback/Default
            role: 'USER'
        };

        localStorage.setItem('user_data', JSON.stringify(user));
        this.currentUser.set(user);
        this.router.navigate(['/dashboard']);
    }

    private getUserFromStorage(): User | null {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    getToken(): string | null {
        return localStorage.getItem('jwt_token');
    }
}
