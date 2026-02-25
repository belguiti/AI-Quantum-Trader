import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    currentLanguage = 'en';

    constructor(private translateService: TranslateService) {
        this.initLanguage();
    }

    private initLanguage() {
        this.translateService.addLangs(['en', 'fr']);
        this.translateService.setDefaultLang('en');

        const savedLang = localStorage.getItem('language');
        if (savedLang && ['en', 'fr'].includes(savedLang)) {
            this.currentLanguage = savedLang;
        } else {
            this.currentLanguage = 'en';
            localStorage.setItem('language', 'en');
        }

        this.translateService.use(this.currentLanguage);
    }

    switchLanguage(lang: string) {
        if (['en', 'fr'].includes(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.translateService.use(lang);
        }
    }
}
