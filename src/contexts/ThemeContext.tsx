import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'wasel-theme';
const MEDIA_QUERY = '(prefers-color-scheme: light)';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: ( preference: ThemePreference ) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>( null );

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem( STORAGE_KEY );
    if ( stored === 'dark' || stored === 'light' || stored === 'system' ) {
      return stored;
    }
  } catch {
    // Storage unavailable (private mode) — fall through to system.
  }
  // New visitors follow the OS colour scheme, matching the pre-paint
  // bootstrap script in index.html (no dark flash for light-OS users).
  return 'system';
}

function resolvePreference( preference: ThemePreference ): ResolvedTheme {
  if ( preference === 'system' ) {
    return window.matchMedia( MEDIA_QUERY ).matches ? 'light' : 'dark';
  }
  return preference;
}

function applyTheme( resolved: ResolvedTheme ) {
  const root = document.documentElement;
  root.setAttribute( 'data-theme', resolved );
  // Keep the PWA status bar / browser chrome in sync with the active theme.
  document.querySelectorAll<HTMLMetaElement>( 'meta[name="theme-color"]' ).forEach( meta => {
    if ( !meta.media ) {
      meta.setAttribute( 'content', resolved === 'light' ? '#F4F8FC' : '#081D39' );
    }
  } );
}

export function ThemeProvider( { children }: { children: ReactNode } ) {
  const [ preference, setPreferenceState ] = useState<ThemePreference>( () =>
    typeof window === 'undefined' ? 'dark' : readStoredPreference(),
  );
  const [ resolvedTheme, setResolvedTheme ] = useState<ResolvedTheme>( () =>
    typeof window === 'undefined' ? 'dark' : resolvePreference( readStoredPreference() ),
  );

  useEffect( () => {
    const resolved = resolvePreference( preference );
    setResolvedTheme( resolved );
    applyTheme( resolved );

    if ( preference !== 'system' ) {return;}
    const media = window.matchMedia( MEDIA_QUERY );
    const onChange = () => {
      const next = media.matches ? 'light' : 'dark';
      setResolvedTheme( next );
      applyTheme( next );
    };
    media.addEventListener( 'change', onChange );
    return () => media.removeEventListener( 'change', onChange );
  }, [ preference ] );

  const setPreference = useCallback( ( next: ThemePreference ) => {
    setPreferenceState( next );
    try {
      if ( next === 'system' ) {
        window.localStorage.removeItem( STORAGE_KEY );
      } else {
        window.localStorage.setItem( STORAGE_KEY, next );
      }
    } catch {
      // Best effort: theme still applies for this session.
    }
  }, [] );

  const toggleTheme = useCallback( () => {
    setPreference( resolvedTheme === 'dark' ? 'light' : 'dark' );
  }, [ resolvedTheme, setPreference ] );

  const value = useMemo(
    () => ( { preference, resolvedTheme, setPreference, toggleTheme } ),
    [ preference, resolvedTheme, setPreference, toggleTheme ],
  );

  return <ThemeContext.Provider value={ value }>{ children }</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext( ThemeContext );
  if ( !context ) {
    throw new Error( 'useTheme must be used inside <ThemeProvider>' );
  }
  return context;
}
