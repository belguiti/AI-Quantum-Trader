import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    isLoginMode = true;
    isLoading = false;
    errorMessage = '';

    authForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        username: [''] // Only for registration
    });

    get f() { return this.authForm.controls; }

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        this.errorMessage = '';
        this.authForm.reset();

        // Toggle validator for username
        if (!this.isLoginMode) {
            this.f.username.setValidators([Validators.required, Validators.minLength(3)]);
        } else {
            this.f.username.clearValidators();
        }
        this.f.username.updateValueAndValidity();
    }

    onSubmit() {
        if (this.authForm.invalid) return;

        this.isLoading = true;
        this.errorMessage = '';
        const val = this.authForm.value;

        if (this.isLoginMode) {
            this.authService.login({ email: val.email, password: val.password }).subscribe({
                next: () => {
                    this.isLoading = false;
                    // Router navigation handled in service
                },
                error: (err) => {
                    console.error(err);
                    this.isLoading = false;
                    this.errorMessage = 'Invalid credentials. Please try again.';
                }
            });
        } else {
            this.authService.register({
                username: val.username,
                email: val.email,
                password: val.password
            }).subscribe({
                next: () => {
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error(err);
                    this.isLoading = false;
                    this.errorMessage = 'Registration failed. Email might be taken.';
                }
            });
        }
    }

    goBack() {
        this.router.navigate(['/']);
    }
}
