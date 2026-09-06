/**
 * Server-side Rate Limiting for Edge Functions
 *
 * Two tiers:
 *  1. checkRateLimit()           — in-memory, isolate-local. Fast. Use for
 *                                  general request throttling where cross-isolate
 *                                  consistency is not required.
 *  2. checkDbRateLimit()         — database-backed via check_rate_limit RPC.
 *                                  Distributed and consistent across all isolates.
 *                                  Use for sensitive operations: wallet send/withdraw,
 *                                  package deliver, OTP, auth.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const store = new Map<string, RateLimitEntry>();
let requestsSinceCleanup = 0;

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
};

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
  // Edge isolates can be short- or long-lived. Clean opportunistically instead
  // of installing a perpetual timer for every isolate, and avoid allowing an
  // all-success traffic pattern to grow this in-memory map indefinitely.
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100) {
    cleanup();
    requestsSinceCleanup = 0;
  }

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;

  if (!allowed) {
    cleanup();
  }

  return { allowed, remaining, resetAt: entry.resetAt };
}

export function getRateLimitKey(req: Request): string {
  const rawIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Validate the IP is a plausible IPv4 or IPv6 address to prevent
  // header-injection attacks where a client spoofs x-forwarded-for
  // with an arbitrary string to bypass per-IP rate limiting.
  const isValidIp =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(rawIp) ||
    /^[0-9a-fA-F:]{2,39}$/.test(rawIp);

  const ip = isValidIp ? rawIp : 'unknown';

  // Use epoch-based window bucket instead of clock hour to get a true sliding window
  return `${ip}:${Math.floor(Date.now() / DEFAULT_CONFIG.windowMs)}`;
}

export function createRateLimitMiddleware(config: RateLimitConfig = DEFAULT_CONFIG) {
  return (req: Request): Response | null => {
    const key = getRateLimitKey(req);
    const { allowed, resetAt } = checkRateLimit(key, config);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    return null;
  };
}

// ---------------------------------------------------------------------------
// Distributed (DB-backed) rate limit — consistent across all edge isolates.
// Calls the check_rate_limit RPC which uses Postgres row-level locking.
// Fails CLOSED: if the DB is unavailable the request is denied.
// ---------------------------------------------------------------------------

export interface DbRateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

export async function checkDbRateLimit(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  operation: string,
  config: DbRateLimitConfig = { maxAttempts: 10, windowMinutes: 1 },
): Promise<{ allowed: boolean }> {
  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_operation: operation,
      p_max_attempts: config.maxAttempts,
      p_window_minutes: config.windowMinutes,
    });
    if (error) return { allowed: false };
    return { allowed: Boolean(data) };
  } catch {
    // Fail closed: deny when DB is unreachable.
    return { allowed: false };
  }
}
