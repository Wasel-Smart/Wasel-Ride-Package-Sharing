import type { Language } from '../locales/translations';

export const LANGUAGE_STORAGE_KEY = 'wasel-language';
export const DEFAULT_REGION = 'JO';
export const DEFAULT_TIMEZONE = 'Asia/Amman';

export type AppDirection = 'ltr' | 'rtl';

export interface JordanLocaleConfig {
  language: Language;
  locale: 'en-JO' | 'ar-JO';
  direction: AppDirection;
  region: typeof DEFAULT_REGION;
  currency: 'JOD';
  timezone: typeof DEFAULT_TIMEZONE;
  numberingSystem: 'latn' | 'arab';
}

const LOCALE_CONFIG: Record<Language, JordanLocaleConfig> = {
  en: {
    language: 'en',
    locale: 'en-JO',
    direction: 'ltr',
    region: DEFAULT_REGION,
    currency: 'JOD',
    timezone: DEFAULT_TIMEZONE,
    numberingSystem: 'latn',
  },
  ar: {
    language: 'ar',
    locale: 'ar-JO',
    direction: 'rtl',
    region: DEFAULT_REGION,
    currency: 'JOD',
    timezone: DEFAULT_TIMEZONE,
    numberingSystem: 'arab',
  },
};

export function sanitizeLanguage(value: string | null | undefined): Language {
  return value === 'ar' ? 'ar' : 'en';
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const candidates = [
    navigator.language,
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (candidates.some((value) => value.startsWith('ar'))) {
    return 'ar';
  }

  if (candidates.some((value) => value.includes('-jo'))) {
    return 'en';
  }

  return 'en';
}

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en';
  }

  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved) {
      return sanitizeLanguage(saved);
    }
  } catch (error) {
    console.error('Failed to load language from localStorage:', error);
  }

  return detectBrowserLanguage();
}

export function persistLanguage(language: Language): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Failed to save language to localStorage:', error);
  }
}

export function getLocaleConfig(language: Language): JordanLocaleConfig {
  return LOCALE_CONFIG[language];
}

export function getLocaleForLanguage(language: Language): JordanLocaleConfig['locale'] {
  return getLocaleConfig(language).locale;
}

export function getDirectionForLanguage(language: Language): AppDirection {
  return getLocaleConfig(language).direction;
}

export function formatLocaleNumber(
  language: Language,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocaleForLanguage(language), options).format(value);
}

export function formatLocaleDate(
  language: Language,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getLocaleForLanguage(language), {
    dateStyle: 'medium',
    ...options,
  }).format(date);
}

export function formatLocaleTime(
  language: Language,
  value: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getLocaleForLanguage(language), {
    timeStyle: 'short',
    ...options,
  }).format(date);
}

