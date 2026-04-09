import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemeToDocument,
  getStoredThemePreference,
  getSystemTheme,
  persistThemePreference,
  resolveThemePreference,
  sanitizeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../utils/theme';

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() => getStoredThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemePreference(getStoredThemePreference()),
  );

  useEffect(() => {
    const nextResolved = resolveThemePreference(theme);
    setResolvedTheme(nextResolved);
    persistThemePreference(theme);
    applyThemeToDocument(nextResolved, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      if (theme !== 'system') {
        return;
      }

      const nextResolved = getSystemTheme();
      setResolvedTheme(nextResolved);
      applyThemeToDocument(nextResolved, theme);
    };

    updateSystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, [theme]);

  const setTheme = useCallback((value: ThemePreference) => {
    setThemeState(sanitizeThemePreference(value));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
