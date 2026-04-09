export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wasel-theme';
export const LEGACY_DISPLAY_STORAGE_KEY = 'wasel.settings.display';

export function sanitizeThemePreference(value: string | null | undefined): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return 'system';
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readLegacyDisplayTheme(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_DISPLAY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { theme?: string } | null;
    return sanitizeThemePreference(parsed?.theme ?? null);
  } catch (error) {
    console.error('Failed to read legacy display theme:', error);
    return null;
  }
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      return sanitizeThemePreference(saved);
    }
  } catch (error) {
    console.error('Failed to read theme preference:', error);
  }

  return readLegacyDisplayTheme() ?? 'system';
}

export function resolveThemePreference(theme: ThemePreference): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function mergeThemeIntoLegacyDisplay(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_DISPLAY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    window.localStorage.setItem(
      LEGACY_DISPLAY_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        theme,
      }),
    );
  } catch (error) {
    console.error('Failed to sync legacy display theme:', error);
  }
}

export function persistThemePreference(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    mergeThemeIntoLegacyDisplay(theme);
  } catch (error) {
    console.error('Failed to persist theme preference:', error);
  }
}

export function applyThemeToDocument(
  resolvedTheme: ResolvedTheme,
  preference: ThemePreference,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  const isLight = resolvedTheme === 'light';
  const isDark = resolvedTheme === 'dark';

  root.classList.toggle('light', isLight);
  root.classList.toggle('dark', isDark);
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;

  if (body) {
    body.classList.toggle('light', isLight);
    body.classList.toggle('dark', isDark);
    body.dataset.theme = resolvedTheme;
    body.dataset.themePreference = preference;
    body.style.colorScheme = resolvedTheme;
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', isLight ? '#ffffff' : '#061726');
  }
}

export function initializeThemeFromStorage(): ThemePreference {
  const preference = getStoredThemePreference();
  applyThemeToDocument(resolveThemePreference(preference), preference);
  return preference;
}

