export interface StartupEnvironment {
  DEV?: boolean;
  VITE_E2E_LOCAL_AUTH?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_API_URL?: string;
  VITE_APP_INSIGHTS_KEY?: string;
  VITE_APP_INSIGHTS_CONNECTION_STRING?: string;
  VITE_SENTRY_DSN?: string;
  MODE?: string;
}

export function getStartupConfigurationError(environment: StartupEnvironment): string | null {
  if (environment.DEV) {
    return null;
  }

  if (environment.VITE_E2E_LOCAL_AUTH === 'true') {
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

  // Supabase publishable keys come in two valid formats: the current
  // `sb_publishable_...` format, and the legacy JWT-style anon key
  // (`eyJ...`) still issued for older projects.
  if (!supabaseKey.startsWith('eyJ') && !supabaseKey.startsWith('sb_publishable_')) {
    return 'Supabase publishable key appears to be invalid.';
  }

  const apiUrl = environment.VITE_API_URL;
  if (apiUrl && !apiUrl.startsWith('https://')) {
    return 'VITE_API_URL must use HTTPS.';
  }

  return null;
}

/**
 * Returns a list of non-fatal observability warnings for production.
 * These do not block startup but should be surfaced to operators.
 */
export function getObservabilityWarnings(environment: StartupEnvironment): string[] {
  if (environment.DEV || environment.MODE === 'test' || environment.VITE_E2E_LOCAL_AUTH === 'true') {
    return [];
  }
  const warnings: string[] = [];
  if (!environment.VITE_SENTRY_DSN) {
    warnings.push('VITE_SENTRY_DSN is not set — runtime errors will not be captured in Sentry.');
  }
  if (!environment.VITE_APP_INSIGHTS_CONNECTION_STRING && !environment.VITE_APP_INSIGHTS_KEY) {
    warnings.push('VITE_APP_INSIGHTS_CONNECTION_STRING is not set — Web Vitals will not flow to Azure Application Insights.');
  }
  return warnings;
}
