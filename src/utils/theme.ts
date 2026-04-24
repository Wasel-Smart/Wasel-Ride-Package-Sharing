export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wasel-theme';
export const LEGACY_DISPLAY_STORAGE_KEY = 'wasel.settings.display';
export const THEME_READY_ATTRIBUTE = 'data-theme-ready';

const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  light: '#F7F0E6',
  dark: '#0F141B',
};

export function sanitizeThemePreference(value: string | null | undefined): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return 'light';
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
    return sanitizeThemePreference(parsed?.theme);
  } catch {
    return null;
  }
}

function readLegacyThemeFallback(): ThemePreference | null {
  const legacyTheme = readLegacyDisplayTheme();
  return legacyTheme === 'light' ? 'light' : null;
}

export function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      return sanitizeThemePreference(stored);
    }
  } catch {
    return readLegacyThemeFallback() ?? 'light';
  }

  return readLegacyThemeFallback() ?? 'light';
}

export function resolveThemePreference(theme: ThemePreference): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }

  if (theme === 'light') {
    return 'light';
  }

  return 'dark';
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
    themeMeta.setAttribute('content', THEME_META_COLORS[resolvedTheme]);
  }

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', 'light dark');
  }
}

export function setThemeTransitionState(enabled: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute(THEME_READY_ATTRIBUTE, enabled ? 'true' : 'false');
}

export function initializeThemeFromStorage(): ThemePreference {
  const preference = getStoredThemePreference();
  setThemeTransitionState(false);
  applyThemeToDocument(resolveThemePreference(preference), preference);
  return preference;
}
