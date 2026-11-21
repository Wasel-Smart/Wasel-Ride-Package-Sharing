/**
 * WaselThemeProvider
 *
 * Reads the device color-scheme preference via `useColorScheme` and exposes
 * the matching token set through `useTheme()`.  Components call `useTheme()`
 * instead of importing `colors` directly so they respond to light/dark mode.
 *
 * Usage:
 *   const { colors, isDark } = useTheme();
 */
import React, { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
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
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
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
