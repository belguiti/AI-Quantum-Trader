import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const unauthGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.currentUser()) {
        // User is logged in, redirect to dashboard
        return router.createUrlTree(['/dashboard']);
    }

    // User is NOT logged in, allow access to login/register
    return true;
};
