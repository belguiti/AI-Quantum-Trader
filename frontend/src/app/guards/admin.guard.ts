import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (user && user.role === 'ADMIN') {
        return true;
    }

    // Redirect non-admins to dashboard
    return router.createUrlTree(['/dashboard']);
};
