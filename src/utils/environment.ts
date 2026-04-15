import { ConfigError } from './errors';
import { getConfig, getEnv, type AppEnvironment } from './env';
import { publicAnonKey, publicSupabaseUrl } from './supabase/info';

interface EnvironmentConfig {
  mode: AppEnvironment;
  isDemoMode: boolean;
  enableDemoData: boolean;
  enableSyntheticTrips: boolean;
  allowDirectSupabaseFallback: boolean;
  allowLocalPersistenceFallback: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  appUrl: string;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const config = getConfig();

  return {
    mode: config.environment,
    isDemoMode: config.enableDemoAccount,
    enableDemoData: config.enableDemoAccount,
    enableSyntheticTrips: config.enableSyntheticTrips,
    allowDirectSupabaseFallback: config.allowDirectSupabaseFallback,
    allowLocalPersistenceFallback: config.allowLocalPersistenceFallback,
    supabaseUrl: publicSupabaseUrl || '',
    supabaseKey: publicAnonKey || '',
    appUrl: config.appUrl,
  };
}

export function validateEnvironmentConfig(): void {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  const isProtectedEnvironment = config.mode === 'production' || config.mode === 'staging';

  if (!config.supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }

  if (!config.supabaseKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }

  const edgeApiConfigured = Boolean(
    getEnv('VITE_API_URL') ||
    getEnv('VITE_EDGE_FUNCTION_NAME') ||
    getEnv('VITE_EDGE_FUNCTIONS_BASE_URL'),
  );
  if (isProtectedEnvironment && !edgeApiConfigured) {
    errors.push('Protected environments must define VITE_API_URL or VITE_EDGE_FUNCTION_NAME');
  }

  if (isProtectedEnvironment) {
    if (config.isDemoMode) {
      errors.push('Demo mode cannot be enabled outside development or test environments');
    }

    if (config.enableSyntheticTrips) {
      errors.push('Synthetic trips cannot be enabled outside development or test environments');
    }

    if (config.allowDirectSupabaseFallback) {
      errors.push('Direct Supabase fallback must be disabled in staging and production');
    }

    if (config.allowLocalPersistenceFallback) {
      errors.push('Local persistence fallback must be disabled in staging and production');
    }

    if (!config.appUrl.startsWith('https://')) {
      errors.push('Protected environments must use an HTTPS VITE_APP_URL');
    }

    if (!config.supabaseUrl.startsWith('https://')) {
      errors.push('Protected environments must use an HTTPS Supabase URL');
    }
  }

  if (errors.length > 0) {
    throw new ConfigError(`Environment configuration errors:\n${errors.join('\n')}`, {
      errors,
      config,
    });
  }
}

export function isProduction(): boolean {
  return getConfig().isProd;
}

export function isDemoMode(): boolean {
  return getConfig().enableDemoAccount;
}

export function enforceDemoModeSafety(): void {
  const config = getEnvironmentConfig();
  if (config.mode !== 'development' && config.mode !== 'test' && config.isDemoMode) {
    throw new ConfigError(
      'Demo mode is not permitted in staging or production. Aborting app initialization.',
      { allowedModes: ['development', 'test'], currentMode: config.mode },
    );
  }
}

export function getEnvironmentDisplayName(): string {
  const { mode, isDemoMode } = getEnvironmentConfig();
  if (isDemoMode) return 'Demo';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function assertEnvironment(expectedMode: EnvironmentConfig['mode'] | string[]): void {
  const config = getEnvironmentConfig();
  const modes = typeof expectedMode === 'string' ? [expectedMode] : expectedMode;

  if (!modes.includes(config.mode)) {
    throw new ConfigError(
      `This operation requires environment to be one of [${modes.join(', ')}], but current mode is ${config.mode}`,
      { expectedModes: modes, currentMode: config.mode },
    );
  }
}
