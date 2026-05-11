/**
 * Fallback Strategy Configuration
 * Centralized control for backend fallback behavior
 */

import { getConfig } from './env';

export type FallbackMode = 'disabled' | 'reads-only' | 'writes-if-enabled' | 'always';

export interface FallbackConfig {
  mode: FallbackMode;
  allowDirectSupabase: boolean;
  requireEdgeForWrites: boolean;
  requireEdgeForReads: boolean;
}

/**
 * Get current fallback configuration based on environment
 */
export function getFallbackConfig(): FallbackConfig {
  const { allowDirectSupabaseFallback, isProd } = getConfig();

  // Production: strict mode, no fallbacks
  if (isProd) {
    return {
      mode: 'disabled',
      allowDirectSupabase: false,
      requireEdgeForWrites: true,
      requireEdgeForReads: true,
    };
  }

  // Development: flexible fallback
  if (allowDirectSupabaseFallback) {
    return {
      mode: 'always',
      allowDirectSupabase: true,
      requireEdgeForWrites: false,
      requireEdgeForReads: false,
    };
  }

  // Development with fallback disabled: prefer edge, allow reads
  return {
    mode: 'reads-only',
    allowDirectSupabase: true,
    requireEdgeForWrites: true,
    requireEdgeForReads: false,
  };
}

/**
 * Check if fallback is allowed for a specific operation type
 */
export function isFallbackAllowed(operationType: 'read' | 'write'): boolean {
  const config = getFallbackConfig();

  if (config.mode === 'disabled') {
    return false;
  }

  if (config.mode === 'always') {
    return true;
  }

  if (operationType === 'read') {
    return config.mode === 'reads-only' || !config.requireEdgeForReads;
  }

  if (operationType === 'write') {
    return config.mode === 'writes-if-enabled' && config.allowDirectSupabase;
  }

  return false;
}

/**
 * Get error message when fallback is not allowed
 */
export function getFallbackDeniedError(operation: string): Error {
  const { isProd } = getConfig();

  if (isProd) {
    return new Error(
      `${operation} requires edge function. Direct database access is disabled in production.`,
    );
  }

  return new Error(
    `${operation} requires edge function. Enable VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=true for local fallback.`,
  );
}

/**
 * Log fallback usage for debugging
 */
export function logFallbackUsage(operation: string, reason: string): void {
  if (import.meta.env?.DEV) {
    console.warn(`[Fallback] ${operation}: ${reason}`);
  }
}

/**
 * Validate fallback configuration on startup
 */
export function validateFallbackConfig(): { valid: boolean; warnings: string[] } {
  const config = getFallbackConfig();
  const { isProd } = getConfig();
  const warnings: string[] = [];

  if (isProd && config.allowDirectSupabase) {
    warnings.push(
      'CRITICAL: Direct Supabase fallback is enabled in production. This bypasses security layers.',
    );
  }

  if (!isProd && config.mode === 'disabled') {
    warnings.push(
      'Development mode with fallback disabled may cause failures if edge functions are unavailable.',
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
