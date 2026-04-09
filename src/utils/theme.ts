export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wasel-theme';
export const LEGACY_DISPLAY_STORAGE_KEY = 'wasel.settings.display';

export function sanitizeThemePreference(value: string | null | undefined): ThemePreference {
  if (value === 'dark') {
    return 'dark';
  }

  return 'dark';
}

export function getSystemTheme(): ResolvedTheme {
  return 'dark';
}

export function getStoredThemePreference(): ThemePreference {
  return 'dark';
}

export function resolveThemePreference(_theme: ThemePreference): ResolvedTheme {
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

export function persistThemePreference(_theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    mergeThemeIntoLegacyDisplay('dark');
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
    themeMeta.setAttribute('content', isLight ? '#f6f9fc' : '#081c36');
  }
}

export function initializeThemeFromStorage(): ThemePreference {
  const preference = 'dark';
  applyThemeToDocument(resolveThemePreference(preference), preference);
  return preference;
}
