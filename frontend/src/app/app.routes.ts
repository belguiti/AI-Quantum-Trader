import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { unauthGuard } from './guards/unauth.guard';
import { AppComponent } from './app.component';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
        canActivate: [unauthGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
        canActivate: [unauthGuard]
    },
    {
        path: '',
        loadComponent: () => import('./components/layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
                canActivate: [authGuard]
            },
            {
                path: 'profile',
                loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
                canActivate: [authGuard]
            },
            {
                path: 'strategies',
                loadComponent: () => import('./components/bot-settings/bot-settings.component').then(m => m.BotSettingsComponent),
                canActivate: [authGuard]
            },
            {
                path: 'lab',
                loadComponent: () => import('./components/lab/lab.component').then(m => m.LabComponent),
                canActivate: [authGuard]
            },
            {
                path: 'wallet',
                loadComponent: () => import('./components/dashboard-view/dashboard-view.component').then(m => m.DashboardViewComponent), // Placeholder
                canActivate: [authGuard]
            },
            {
                path: 'settings',
                loadComponent: () => import('./components/bot-settings/bot-settings.component').then(m => m.BotSettingsComponent), // Reusing for now
                canActivate: [authGuard]
            }
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
