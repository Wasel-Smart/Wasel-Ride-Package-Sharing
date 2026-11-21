/**
 * WaselThemeProvider
 *
 * Reads the device color-scheme via React Native's `Appearance` API and
 * exposes the matching Wasel token set through `useTheme()`. Components call
 * `useTheme()` instead of importing `colors` directly so they respond to
 * light/dark changes without a restart.
 *
 * Usage:
 *   const { colors, isDark } = useTheme();
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Appearance } = require('react-native') as {
  Appearance: {
    getColorScheme(): 'light' | 'dark' | 'unspecified' | null;
    addChangeListener(listener: (prefs: { colorScheme: 'light' | 'dark' | 'unspecified' | null }) => void): { remove(): void };
  };
};
import { DARK_COLORS, LIGHT_COLORS, type WaselColors } from '../theme';

interface ThemeContextValue {
  colors: WaselColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: DARK_COLORS,
  isDark: true,
});

export function WaselThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() !== 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }: { colorScheme: 'light' | 'dark' | 'unspecified' | null }) => {
      setIsDark(colorScheme !== 'light');
    });
    return () => sub.remove();
  }, []);

  const colors = isDark ? DARK_COLORS : (LIGHT_COLORS as unknown as WaselColors);

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Returns the active Wasel color tokens and an `isDark` flag. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
