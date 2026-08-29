/**
 * Stripe utility functions for Wasel platform
 * Rate limiting, metadata management, and timestamp tracking
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const MAX_RATE_LIMIT_ENTRIES = 5_000;

function evictExpiredRateLimitEntries(): void {
  const now = Date.now();
  for (const [key, state] of rateLimitStore.entries()) {
    if (now > state.resetAt) rateLimitStore.delete(key);
  }
  if (rateLimitStore.size > MAX_RATE_LIMIT_ENTRIES) {
    const toDelete = rateLimitStore.size - MAX_RATE_LIMIT_ENTRIES;
    let deleted = 0;
    for (const key of rateLimitStore.keys()) {
      if (deleted >= toDelete) break;
      rateLimitStore.delete(key);
      deleted++;
    }
  }
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 },
): boolean {
  const now = Date.now();
  const state = rateLimitStore.get(key);

  if (!state || now > state.resetAt) {
    evictExpiredRateLimitEntries();
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (state.count >= config.maxRequests) {
    return false;
  }

  state.count++;
  return true;
}

/**
 * Set updated_at timestamp on Stripe metadata
 */
export function setUpdatedAt(metadata: Record<string, string>): Record<string, string> {
  return {
    ...metadata,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Set updated_at in metadata object structure
 */
export function setUpdatedAtMetadata(obj: { metadata?: Record<string, string> }): {
  metadata: Record<string, string>;
} {
  return {
    ...obj,
    metadata: setUpdatedAt(obj.metadata || {}),
  };
}
