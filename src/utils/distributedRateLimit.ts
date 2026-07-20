/**
 * Distributed Rate Limiter
 *
 * Uses the Supabase `rate_limits` table (created in database_excellence_upgrade)
 * for persistence across deploys and horizontal scaling.
 *
 * Falls back to the in-memory limiter in security.ts for non-critical paths
 * where a DB round-trip is too expensive.
 */

import { supabase } from './supabase/client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit via the DB-backed RPC.
 * Use this for sensitive operations: login, payment, OTP, password reset.
 */
export async function checkDbRateLimit(
  userId: string,
  operation: string,
  maxAttempts = 5,
  windowMinutes = 15,
): Promise<RateLimitResult> {
  if (!supabase) {
    if (import.meta.env.DEV) {
      console.warn('[rateLimit] Supabase not configured, skipping DB rate limit check');
    }
    return {
      allowed: true,
      remaining: maxAttempts,
      resetAt: new Date(Date.now() + windowMinutes * 60_000),
    };
  }

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_operation: operation,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      // If the error message contains "Rate limit exceeded" it's a business error, not a DB error
      if (error.message?.includes('Rate limit exceeded')) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + windowMinutes * 60_000),
        };
      }
      // DB error — fail open to avoid blocking legitimate users
      if (import.meta.env.DEV) {
        console.error('[rateLimit] DB check failed, failing open:', error.message);
      }
      return { allowed: true, remaining: maxAttempts, resetAt: new Date() };
    }

    return {
      allowed: Boolean(data),
      remaining: data ? maxAttempts - 1 : 0,
      resetAt: new Date(Date.now() + windowMinutes * 60_000),
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[rateLimit] Unexpected error:', err);
    }
    return { allowed: true, remaining: maxAttempts, resetAt: new Date() };
  }
}

/**
 * Rate limit presets for common operations.
 */
export const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  otp: { maxAttempts: 3, windowMinutes: 10 },
  passwordReset: { maxAttempts: 3, windowMinutes: 60 },
  payment: { maxAttempts: 10, windowMinutes: 60 },
  walletWithdraw: { maxAttempts: 3, windowMinutes: 60 },
  apiGeneral: { maxAttempts: 100, windowMinutes: 1 },
} as const;
