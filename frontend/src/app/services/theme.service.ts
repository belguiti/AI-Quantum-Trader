import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    isDarkMode = true;

    constructor() {
        // Always dark mode — light mode disabled
        document.documentElement.classList.add('dark');
    }
}
