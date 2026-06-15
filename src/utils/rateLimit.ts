/**
 * Production-Grade Rate Limiting
 * Protects against abuse, DDoS, and brute force attacks
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
  increment(key: string): Promise<number>;
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

  async increment(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: Date.now() + 60000 });
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

// Cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => defaultStore.cleanup(), 300000);
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
    
    // Use multiple identifiers for better tracking
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `${this.config.keyPrefix}:${Math.abs(hash)}`;
  }

  async checkLimit(): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.getClientKey();
    const count = await this.store.increment(key);
    const resetAt = Date.now() + this.config.windowMs;

    if (count === 1) {
      await this.store.set(key, 1, this.config.windowMs);
    }

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
