import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY } from 'rxjs';

/**
 * Silently swallows HTTP errors for specific endpoints so they
 * don't appear as red errors in the browser console.
 * The component's own error() callback still fires normally.
 */
const SILENT_ERROR_URLS = [
    '/api/connectivity/test'
];

export const silentErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const isSilent = SILENT_ERROR_URLS.some(url => req.url.includes(url));

    if (!isSilent) {
        return next(req);
    }

    return next(req).pipe(
        catchError((err: HttpErrorResponse) => {
            // Re-throw as a plain (non-HttpErrorResponse) error so Angular's
            // HttpClient does NOT log the red network error to the console,
            // but the component's error() handler still receives it.
            throw { status: err.status, error: err.error, message: err.message };
        })
    );
};
