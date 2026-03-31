import { Injectable, signal, effect, computed, type WritableSignal, type Signal, inject, PLATFORM_ID, APP_INITIALIZER } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export type Language = 'en' | 'zh' | 'ja';

export interface Translations {
  [key: string]: string;
}

// Preload all translations at startup
export function preloadTranslations(http: HttpClient): () => Promise<void> {
  return async () => {
    const langs: Language[] = ['en', 'zh', 'ja'];
    for (const lang of langs) {
      try {
        const translations = await firstValueFrom(
          http.get<Translations>(`/assets/i18n/${lang}.json`)
        );
        translationsCache[lang] = translations;
        loadedLanguages.add(lang);
      } catch (error) {
        console.error(`Failed to preload translations for ${lang}:`, error);
      }
    }
  };
}

const translationsCache: Record<Language, Translations> = {
  en: {},
  zh: {},
  ja: {}
};
const loadedLanguages = new Set<Language>();

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  readonly currentLanguage: WritableSignal<Language> = signal<Language>(this.getStoredLanguage());

  // Computed signal that returns current translations - this is reactive!
  readonly translations: Signal<Translations> = computed(() => {
    const lang = this.currentLanguage();
    return translationsCache[lang] || {};
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize translations - already preloaded via APP_INITIALIZER
      const lang = this.currentLanguage();
      this.updatePageTranslations(lang);

      // React to language changes
      effect(() => {
        const lang = this.currentLanguage();
        this.updatePageTranslations(lang);
        localStorage.setItem('language', lang);
      });
    }
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
  }

  t(key: string): string {
    const lang = this.currentLanguage();
    const translations = translationsCache[lang];
    if (translations && translations[key]) {
      return translations[key];
    }
    // Fallback to English
    const fallback = translationsCache['en'];
    return fallback?.[key] || key;
  }

  private updatePageTranslations(lang: Language): void {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && el instanceof HTMLInputElement) {
        el.placeholder = this.t(key);
      }
    });
  }

  private getStoredLanguage(): Language {
    if (!isPlatformBrowser(this.platformId)) {
      return 'en';
    }
    const stored = localStorage.getItem('language') as Language;
    if (stored && this.isValidLanguage(stored)) {
      return stored;
    }
    const browserLang = navigator.language.split('-')[0] as Language;
    if (this.isValidLanguage(browserLang)) {
      return browserLang;
    }
    return 'en';
  }

  private isValidLanguage(lang: string): lang is Language {
    return ['en', 'zh', 'ja'].includes(lang);
  }

  getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' }
    ];
  }
}
