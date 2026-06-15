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

/**
 * Check if request is within rate limit
 */
export function check_rate_limit(
  key: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): boolean {
  const now = Date.now();
  const state = rateLimitStore.get(key);

  if (!state || now > state.resetAt) {
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
export function set_updated_at(metadata: Record<string, string>): Record<string, string> {
  return {
    ...metadata,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Set updated_at in metadata object structure
 */
export function set_updated_at_metadata(
  obj: { metadata?: Record<string, string> }
): { metadata: Record<string, string> } {
  return {
    ...obj,
    metadata: set_updated_at(obj.metadata || {}),
  };
}
