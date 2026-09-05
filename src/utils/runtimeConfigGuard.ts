export interface StartupEnvironment {
  DEV?: boolean;
  VITE_E2E_LOCAL_AUTH?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_API_URL?: string;
  VITE_APP_INSIGHTS_KEY?: string;
  MODE?: string;
}

export function getStartupConfigurationError(environment: StartupEnvironment): string | null {
  if (environment.DEV) {
    return null;
  }

  if (environment.MODE === 'test') {
    return null;
  }

  const supabaseUrl = environment.VITE_SUPABASE_URL;
  const supabaseKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY ?? environment.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';
  }

  if (!supabaseUrl.startsWith('https://')) {
    return 'Supabase URL must use HTTPS.';
  }

  if (!supabaseKey.startsWith('eyJ')) {
    return 'Supabase publishable key appears to be invalid.';
  }

  const apiUrl = environment.VITE_API_URL;
  if (apiUrl && !apiUrl.startsWith('https://')) {
    return 'VITE_API_URL must use HTTPS.';
  }

  return null;
}
