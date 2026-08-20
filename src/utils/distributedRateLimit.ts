/** Distributed rate-limit gate for sensitive client actions.
 *
 * The Edge Function/database is authoritative. This check must fail closed:
 * allowing a login, OTP, payment, or withdrawal after the distributed check
 * fails creates an abuse bypass precisely when the system is degraded.
 */
import { supabase } from './supabase/client';
import { sanitizeLogMessage } from './sanitization';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

function denied(windowMinutes: number): RateLimitResult {
  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(Date.now() + windowMinutes * 60_000),
  };
}

/** Check the database-backed limit before sensitive operations. */
export async function checkDbRateLimit(
  userId: string,
  operation: string,
  maxAttempts = 5,
  windowMinutes = 15,
): Promise<RateLimitResult> {
  if (!supabase) {
    if (import.meta.env.DEV)
      console.warn(
        `[rateLimit] Supabase is unavailable for ${sanitizeLogMessage(operation)}; denying request`,
      );
    return denied(windowMinutes);
  }

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_operation: operation,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
    });
    if (error) {
      if (import.meta.env.DEV)
        console.error(
          `[rateLimit] DB check failed for ${sanitizeLogMessage(operation)}; denying request:`,
          sanitizeLogMessage(error.message),
        );
      return denied(windowMinutes);
    }
    return {
      allowed: Boolean(data),
      remaining: data ? maxAttempts - 1 : 0,
      resetAt: new Date(Date.now() + windowMinutes * 60_000),
    };
  } catch (error) {
    if (import.meta.env.DEV)
      console.error(
        `[rateLimit] Unexpected failure for ${sanitizeLogMessage(operation)}; denying request:`,
        error,
      );
    return denied(windowMinutes);
  }
}

export const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  otp: { maxAttempts: 3, windowMinutes: 10 },
  passwordReset: { maxAttempts: 3, windowMinutes: 60 },
  payment: { maxAttempts: 10, windowMinutes: 60 },
  walletWithdraw: { maxAttempts: 3, windowMinutes: 60 },
  apiGeneral: { maxAttempts: 100, windowMinutes: 1 },
} as const;
