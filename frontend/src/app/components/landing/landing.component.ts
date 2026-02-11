import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css']
})
export class LandingComponent {
    authService = inject(AuthService);
    currentUser = this.authService.currentUser;

    constructor(private router: Router) { }

    navigateToLogin() {
        this.router.navigate(['/login']);
    }

    navigateToDashboard() {
        this.router.navigate(['/dashboard']);
    }
}
