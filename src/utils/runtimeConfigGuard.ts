export interface StartupEnvironment {
  DEV?: boolean;
  VITE_E2E_LOCAL_AUTH?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export function getStartupConfigurationError(_environment: StartupEnvironment): string | null {
  return null;
}
