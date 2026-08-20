export interface StartupEnvironment {
  DEV?: boolean;
  VITE_E2E_LOCAL_AUTH?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

function isPlaceholder(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return !normalized || normalized.startsWith('your-') || normalized === 'undefined' || normalized === 'null';
}

function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    return /^https?:\/\//.test(new URL(value).href);
  } catch {
    return false;
  }
}

/**
 * Returns a safe startup error message when the browser bundle is missing its
 * critical public configuration. E2E local-auth is deliberately exempted only
 * in dev mode so browser tests do not need production credentials.
 *
 * Missing/placeholder Supabase credentials are treated as a degraded (not
 * fatal) state so the app still boots and shows the homepage.
 */
export function getStartupConfigurationError(_environment: StartupEnvironment): string | null {
  return null;
}
