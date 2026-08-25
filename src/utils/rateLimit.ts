/**
 * Client-side rate limiting (defense-in-depth)
 *
 * This guards against accidental double-clicks / rapid retries from a single
 * client. It is NOT a security boundary: a malicious client can bypass it, so
 * authoritative rate limiting + abuse protection is enforced server-side in
 * supabase/functions/rate-limited-api/index.ts via _shared/rate-limiter.ts.
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return null;
    }
    return entry.count;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, { count: value, resetAt: Date.now() + ttl });
  }

  async increment(key: string, ttl: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: Date.now() + ttl });
      return 1;
    }
    entry.count++;
    return entry.count;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

const defaultStore = new MemoryRateLimitStore();

// Cleanup every 5 minutes. Stored so it can be cleared on unload.
let rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;
if (typeof window !== 'undefined') {
  rateLimitCleanupTimer = setInterval(() => defaultStore.cleanup(), 300000);
}

/** Stop the rate-limit cleanup interval. */
export function stopRateLimitCleanup(): void {
  if (rateLimitCleanupTimer !== null) {
    clearInterval(rateLimitCleanupTimer);
    rateLimitCleanupTimer = null;
  }
}

export const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'auth',
  },
  api: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api',
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyPrefix: 'search',
  },
  booking: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'booking',
  },
  payment: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'payment',
  },
} as const;

export class RateLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = config;
    this.store = store || defaultStore;
  }

  private getClientKey(): string {
    if (typeof window === 'undefined') return 'server';

    // Use a session-scoped random key instead of browser fingerprinting
    // to avoid privacy concerns and spoofing via navigator.userAgent.
    const storageKey = `wasel_rl_key_${this.config.keyPrefix}`;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = `${this.config.keyPrefix}:${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      try { sessionStorage.setItem(storageKey, key); } catch { /* ignore */ }
    }
    return key;
  }

  async checkLimit(): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.getClientKey();
    const resetAt = Date.now() + this.config.windowMs;
    const count = await this.store.increment(key, this.config.windowMs);
    const allowed = count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - count);
    return { allowed, remaining, resetAt };
  }

  async recordRequest(success: boolean): Promise<void> {
    if (this.config.skipSuccessfulRequests && success) return;
    if (this.config.skipFailedRequests && !success) return;
    await this.checkLimit();
  }
}

export function createRateLimiter(
  type: keyof typeof rateLimitConfigs,
  store?: RateLimitStore,
): RateLimiter {
  return new RateLimiter(rateLimitConfigs[type], store);
}

export async function withRateLimit<T>(
  limiter: RateLimiter,
  operation: () => Promise<T>,
): Promise<T> {
  const { allowed, remaining, resetAt } = await limiter.checkLimit();

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    throw new Error(
      `Rate limit exceeded. Try again in ${retryAfter} seconds. Remaining: ${remaining}`,
    );
  }

  try {
    const result = await operation();
    await limiter.recordRequest(true);
    return result;
  } catch (error) {
    await limiter.recordRequest(false);
    throw error;
  }
}

// Export pre-configured limiters
export const authLimiter = createRateLimiter('auth');
export const apiLimiter = createRateLimiter('api');
export const searchLimiter = createRateLimiter('search');
export const bookingLimiter = createRateLimiter('booking');
export const paymentLimiter = createRateLimiter('payment');
