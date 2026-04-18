import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sanitizeThemePreference,
  getSystemTheme,
  getStoredThemePreference,
  resolveThemePreference,
  persistThemePreference,
  applyThemeToDocument,
  setThemeTransitionState,
  initializeThemeFromStorage,
  THEME_STORAGE_KEY,
  LEGACY_DISPLAY_STORAGE_KEY,
  THEME_READY_ATTRIBUTE,
} from '@/utils/theme';

describe('sanitizeThemePreference', () => {
  it('accepts "light"', () => expect(sanitizeThemePreference('light')).toBe('light'));
  it('accepts "dark"', () => expect(sanitizeThemePreference('dark')).toBe('dark'));
  it('accepts "system"', () => expect(sanitizeThemePreference('system')).toBe('system'));
  it('falls back to "light" for unknown value', () => expect(sanitizeThemePreference('auto')).toBe('light'));
  it('falls back for null', () => expect(sanitizeThemePreference(null)).toBe('light'));
  it('falls back for undefined', () => expect(sanitizeThemePreference(undefined)).toBe('light'));
  it('falls back for empty string', () => expect(sanitizeThemePreference('')).toBe('light'));
});

describe('resolveThemePreference', () => {
  it('resolves "light" → "light"', () => expect(resolveThemePreference('light')).toBe('light'));
  it('resolves "dark" → "dark"', () => expect(resolveThemePreference('dark')).toBe('dark'));
  it('resolves "system" using window.matchMedia', () => {
    // matchMedia is mocked to return matches:false in setup.ts → light
    expect(resolveThemePreference('system')).toBe('light');
  });
});

describe('getSystemTheme', () => {
  it('returns "light" when matchMedia does not match dark', () => {
    expect(getSystemTheme()).toBe('light');
  });

  it('returns "dark" when matchMedia matches dark', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getSystemTheme()).toBe('dark');
    window.matchMedia = original;
  });
});

describe('getStoredThemePreference', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns stored value when valid', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getStoredThemePreference()).toBe('dark');
  });

  it('falls back to legacy key when primary key is absent', () => {
    localStorage.setItem(LEGACY_DISPLAY_STORAGE_KEY, JSON.stringify({ theme: 'light' }));
    expect(getStoredThemePreference()).toBe('light');
  });

  it('returns "light" when nothing stored', () => {
    expect(getStoredThemePreference()).toBe('light');
  });

  it('handles corrupted legacy key gracefully', () => {
    localStorage.setItem(LEGACY_DISPLAY_STORAGE_KEY, 'not-json{{{');
    expect(() => getStoredThemePreference()).not.toThrow();
  });

  it('handles localStorage getItem failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getStoredThemePreference()).toBe('light');
    spy.mockRestore();
  });
});

describe('persistThemePreference', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('writes theme to canonical key', () => {
    persistThemePreference('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('also syncs to legacy display key', () => {
    persistThemePreference('dark');
    const raw = localStorage.getItem(LEGACY_DISPLAY_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).theme).toBe('dark');
  });

  it('handles setItem failure gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => persistThemePreference('dark')).not.toThrow();
    spy.mockRestore();
  });
});

describe('applyThemeToDocument', () => {
  it('sets data-theme on documentElement', () => {
    applyThemeToDocument('dark', 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('sets colorScheme style', () => {
    applyThemeToDocument('light', 'light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('toggles "dark" class on html element', () => {
    applyThemeToDocument('dark', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('toggles "light" class on html element', () => {
    applyThemeToDocument('light', 'light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('sets data-theme-preference attribute', () => {
    applyThemeToDocument('light', 'system');
    expect(document.documentElement.dataset.themePreference).toBe('system');
  });
});

describe('setThemeTransitionState', () => {
  it('sets data-theme-ready to "true"', () => {
    setThemeTransitionState(true);
    expect(document.documentElement.getAttribute(THEME_READY_ATTRIBUTE)).toBe('true');
  });

  it('sets data-theme-ready to "false"', () => {
    setThemeTransitionState(false);
    expect(document.documentElement.getAttribute(THEME_READY_ATTRIBUTE)).toBe('false');
  });
});

describe('initializeThemeFromStorage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns the stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const pref = initializeThemeFromStorage();
    expect(pref).toBe('dark');
  });

  it('applies the theme to the document', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    initializeThemeFromStorage();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('returns "light" when nothing stored', () => {
    expect(initializeThemeFromStorage()).toBe('light');
  });
});
