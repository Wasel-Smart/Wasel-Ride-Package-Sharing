import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sanitizeLanguage,
  detectBrowserLanguage,
  getInitialLanguage,
  persistLanguage,
  getLocaleConfig,
  getLocaleForLanguage,
  getDirectionForLanguage,
  formatLocaleNumber,
  formatLocaleDate,
  formatLocaleTime,
  LANGUAGE_STORAGE_KEY,
} from '@/utils/locale';

describe('sanitizeLanguage', () => {
  it('returns "ar" for "ar"', () => {
    expect(sanitizeLanguage('ar')).toBe('ar');
  });

  it('returns "en" for "en"', () => {
    expect(sanitizeLanguage('en')).toBe('en');
  });

  it('returns "en" for unknown value', () => {
    expect(sanitizeLanguage('fr')).toBe('en');
  });

  it('returns "en" for null', () => {
    expect(sanitizeLanguage(null)).toBe('en');
  });

  it('returns "en" for undefined', () => {
    expect(sanitizeLanguage(undefined)).toBe('en');
  });

  it('returns "en" for empty string', () => {
    expect(sanitizeLanguage('')).toBe('en');
  });
});

describe('detectBrowserLanguage', () => {
  it('returns "ar" when navigator.language is Arabic', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'ar-JO', languages: ['ar-JO'] });
    expect(detectBrowserLanguage()).toBe('ar');
    vi.unstubAllGlobals();
  });

  it('returns "en" when navigator.language is English', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'en-US', languages: ['en-US'] });
    expect(detectBrowserLanguage()).toBe('en');
    vi.unstubAllGlobals();
  });

  it('returns "en" when languages contains a JO locale', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'en-JO', languages: ['en-JO'] });
    expect(detectBrowserLanguage()).toBe('en');
    vi.unstubAllGlobals();
  });

  it('returns "ar" when languages array contains Arabic', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'en', languages: ['en', 'ar'] });
    expect(detectBrowserLanguage()).toBe('ar');
    vi.unstubAllGlobals();
  });
});

describe('getInitialLanguage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns stored language if valid', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');
    expect(getInitialLanguage()).toBe('ar');
  });

  it('falls back to browser detection if nothing stored', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'ar-SA', languages: ['ar-SA'] });
    const lang = getInitialLanguage();
    expect(lang).toBe('ar');
    vi.unstubAllGlobals();
  });

  it('returns "en" if stored value is invalid', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xyz');
    vi.stubGlobal('navigator', { ...navigator, language: 'en', languages: ['en'] });
    const lang = getInitialLanguage();
    expect(lang).toBe('en');
    vi.unstubAllGlobals();
  });

  it('handles localStorage failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => getInitialLanguage()).not.toThrow();
    spy.mockRestore();
  });
});

describe('persistLanguage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('saves language to localStorage', () => {
    persistLanguage('ar');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
  });

  it('handles setItem failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => persistLanguage('ar')).not.toThrow();
    spy.mockRestore();
  });
});

describe('getLocaleConfig', () => {
  it('returns English config for "en"', () => {
    const config = getLocaleConfig('en');
    expect(config.locale).toBe('en-JO');
    expect(config.direction).toBe('ltr');
    expect(config.currency).toBe('JOD');
    expect(config.numberingSystem).toBe('latn');
  });

  it('returns Arabic config for "ar"', () => {
    const config = getLocaleConfig('ar');
    expect(config.locale).toBe('ar-JO');
    expect(config.direction).toBe('rtl');
    expect(config.numberingSystem).toBe('arab');
  });

  it('both configs use Jordan timezone', () => {
    expect(getLocaleConfig('en').timezone).toBe('Asia/Amman');
    expect(getLocaleConfig('ar').timezone).toBe('Asia/Amman');
  });
});

describe('getLocaleForLanguage', () => {
  it('returns "en-JO" for "en"', () => {
    expect(getLocaleForLanguage('en')).toBe('en-JO');
  });

  it('returns "ar-JO" for "ar"', () => {
    expect(getLocaleForLanguage('ar')).toBe('ar-JO');
  });
});

describe('getDirectionForLanguage', () => {
  it('returns "ltr" for "en"', () => {
    expect(getDirectionForLanguage('en')).toBe('ltr');
  });

  it('returns "rtl" for "ar"', () => {
    expect(getDirectionForLanguage('ar')).toBe('rtl');
  });
});

describe('formatLocaleNumber', () => {
  it('formats a number in English', () => {
    const result = formatLocaleNumber('en', 1234.5);
    expect(result).toMatch(/1,234/);
  });

  it('formats a number as currency', () => {
    const result = formatLocaleNumber('en', 10, {
      style: 'currency',
      currency: 'JOD',
    });
    expect(result).toContain('10');
  });

  it('formats zero correctly', () => {
    expect(formatLocaleNumber('en', 0)).toContain('0');
  });
});

describe('formatLocaleDate', () => {
  const testDate = new Date('2025-06-15T12:00:00Z');

  it('formats a date in English', () => {
    const result = formatLocaleDate('en', testDate);
    expect(result).toMatch(/2025/);
  });

  it('accepts a timestamp number', () => {
    expect(() => formatLocaleDate('en', testDate.getTime())).not.toThrow();
  });

  it('accepts an ISO string', () => {
    expect(() => formatLocaleDate('en', '2025-06-15')).not.toThrow();
  });
});

describe('formatLocaleTime', () => {
  const testDate = new Date('2025-06-15T14:30:00Z');

  it('formats time without throwing', () => {
    expect(() => formatLocaleTime('en', testDate)).not.toThrow();
  });

  it('accepts a timestamp number', () => {
    expect(() => formatLocaleTime('ar', testDate.getTime())).not.toThrow();
  });
});
