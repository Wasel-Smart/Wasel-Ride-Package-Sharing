/**
 * Production Environment Safety Checks
 * Validates that the app is running in the correct environment configuration
 */

import { ConfigError } from './errors';
import { publicAnonKey, publicSupabaseUrl } from './supabase/info';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  mode: 'production' | 'staging' | 'development' | 'test';
  isDemoMode: boolean;
  enableDemoData: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  appUrl: string;
}

/**
 * Get current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
  const mode = import.meta.env.MODE as EnvironmentConfig['mode'];

  return {
    mode,
    isDemoMode,
    enableDemoData: isDemoMode,
    supabaseUrl: publicSupabaseUrl || '',
    supabaseKey: publicAnonKey || '',
    appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  };
}

/**
 * Validate environment configuration
 * Throws ConfigError if configuration is invalid
 */
export function validateEnvironmentConfig(): void {
  const config = getEnvironmentConfig();

  // Critical validations
  const errors: string[] = [];

  // Check required environment variables
  if (!config.supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  if (!config.supabaseKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }

  // Production safety checks
  if (config.mode === 'production') {
    // Prevent demo data in production
    if (config.isDemoMode) {
      errors.push('Demo mode cannot be enabled in production environment');
    }

    // Ensure production URLs
    if (!config.appUrl.includes('https://') && !config.appUrl.includes('localhost')) {
      console.warn('[Wasel] Production URL does not use HTTPS:', config.appUrl);
    }

    // Alert on disabled security features
    if (!config.supabaseUrl.includes('supabase.co')) {
      console.warn('[Wasel] Non-Supabase backend detected in production');
    }
  }

  if (errors.length > 0) {
    const message = `Environment configuration errors:\n${errors.join('\n')}`;
    throw new ConfigError(message, { errors, config });
  }

  // Log environment info for debugging
  if (!import.meta.env.PROD) {
    console.info('[Wasel Environment]', {
      mode: config.mode,
      isDemoMode: config.isDemoMode,
      appUrl: config.appUrl,
      supabaseUrl: config.supabaseUrl.split('.')[0] + '.[redacted]',
    });
  }
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Check if running in demo mode
 */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
}

/**
 * Prevent demo mode in production (failsafe)
 * Should be called early in app initialization
 */
export function enforceDemoModeSafety(): void {
  const config = getEnvironmentConfig();

  if (config.mode === 'production' && config.isDemoMode) {
    // Redact demo data before app loads
    const error = new ConfigError(
      'Demo mode is not permitted in production. Aborting app initialization.',
      { allowedModes: ['staging', 'development'], currentMode: config.mode },
    );

    // Log critical security error
    console.error('[Wasel SECURITY]', error.message);

    // Prevent app from fully initializing
    throw error;
  }
}

/**
 * Get environment display name for user-facing messages
 */
export function getEnvironmentDisplayName(): string {
  const config = getEnvironmentConfig();
  if (config.isDemoMode) return 'Demo';
  if (config.mode === 'production') return 'Production';
  if (config.mode === 'staging') return 'Staging';
  return 'Development';
}

/**
 * Assert that we're in the expected environment
 */
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
