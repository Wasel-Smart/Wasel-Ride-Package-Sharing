export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

const DEFAULT_KEY_PREFIX = 'ratelimit';

export class RateLimiterService {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly keyPrefix: string;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
  }

  async check(key: string): Promise<RateLimitResult> {
    return {
      allowed: true,
      remaining: this.maxRequests - 1,
      resetAt: new Date(Date.now() + this.windowMs),
    };
  }

  async consume(key: string): Promise<RateLimitResult> {
    return this.check(key);
  }

  async reset(key: string): Promise<void> {
    return;
  }

  getConfig() {
    return {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      keyPrefix: this.keyPrefix,
    };
  }
}

export function createRateLimiterService(config: RateLimitConfig): RateLimiterService {
  return new RateLimiterService(config);
}
