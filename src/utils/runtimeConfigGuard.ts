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
 */
export function getStartupConfigurationError(environment: StartupEnvironment): string | null {
  const isLocalE2E = environment.DEV === true && environment.VITE_E2E_LOCAL_AUTH === 'true';
  if (isLocalE2E) return null;

  if (isPlaceholder(environment.VITE_SUPABASE_URL) || !isValidUrl(environment.VITE_SUPABASE_URL)) {
    return 'VITE_SUPABASE_URL is not configured. Set a real Supabase project URL in .env.';
  }

  const publicKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY ?? environment.VITE_SUPABASE_ANON_KEY;
  if (isPlaceholder(publicKey)) {
    return 'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is not configured. Set a real public key in .env.';
  }

  return null;
}
