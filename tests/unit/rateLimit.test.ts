/**
 * Tests for src/utils/rateLimit.ts — currently zero coverage.
 * Uses an in-process MemoryRateLimitStore via a custom store injection so the
 * tests run without touching sessionStorage or the shared module-level store.
 */
import { describe, it, expect } from 'vitest';
import { RateLimiter, createRateLimiter, withRateLimit, rateLimitConfigs } from '../../src/utils/rateLimit';

// ── Minimal in-memory store injectable into RateLimiter ──────────────────────

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
}

function makeMemoryStore(): RateLimitStore {
  const store = new Map<string, { count: number; resetAt: number }>();
  return {
    async get(key) {
      const entry = store.get(key);
      if (!entry || Date.now() > entry.resetAt) {
        return null;
      }
      return entry.count;
    },
    async set(key, value, ttl) {
      store.set(key, { count: value, resetAt: Date.now() + ttl });
    },
    async increment(key, ttl) {
      const entry = store.get(key);
      if (!entry || Date.now() > entry.resetAt) {
        store.set(key, { count: 1, resetAt: Date.now() + ttl });
        return 1;
      }
      entry.count++;
      return entry.count;
    },
  };
}

// ── RateLimiter ───────────────────────────────────────────────────────────────

describe('RateLimiter', () => {
  it('allows requests under the limit', async () => {
    const limiter = new RateLimiter(
      { windowMs: 10_000, maxRequests: 3, keyPrefix: 'test' },
      makeMemoryStore(),
    );
    const r1 = await limiter.checkLimit();
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
  });

  it('blocks requests at the limit', async () => {
    const store = makeMemoryStore();
    const limiter = new RateLimiter(
      { windowMs: 10_000, maxRequests: 2, keyPrefix: 'test' },
      store,
    );
    await limiter.checkLimit(); // 1
    await limiter.checkLimit(); // 2
    const r3 = await limiter.checkLimit(); // 3 — over limit
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('remaining decrements correctly', async () => {
    const store = makeMemoryStore();
    const limiter = new RateLimiter(
      { windowMs: 10_000, maxRequests: 5, keyPrefix: 'test' },
      store,
    );
    for (let i = 5; i >= 1; i--) {
      const r = await limiter.checkLimit();
      expect(r.remaining).toBe(i - 1);
    }
  });

  it('recordRequest is a no-op (does not throw)', async () => {
    const limiter = new RateLimiter(
      { windowMs: 10_000, maxRequests: 5, keyPrefix: 'test' },
      makeMemoryStore(),
    );
    await expect(limiter.recordRequest(true)).resolves.toBeUndefined();
    await expect(limiter.recordRequest(false)).resolves.toBeUndefined();
  });
});

// ── withRateLimit ───────────────────────────────��─────────────────────────────

describe('withRateLimit', () => {
  it('runs the operation when under the limit', async () => {
    const limiter = new RateLimiter(
      { windowMs: 10_000, maxRequests: 5, keyPrefix: 'test' },
      makeMemoryStore(),
    );
    const result = await withRateLimit(limiter, async () => 'ok');
    expect(result).toBe('ok');
  });

  it('throws when the limit is exceeded', async () => {
    const store = makeMemoryStore();
    const limiter = new RateLimiter(
      { windowMs: 60_000, maxRequests: 1, keyPrefix: 'test' },
      store,
    );
    await limiter.checkLimit(); // consume the 1 allowed slot
    await expect(withRateLimit(limiter, async () => 'never')).rejects.toThrow(
      'Rate limit exceeded',
    );
  });

  it('propagates operation errors', async () => {
    const limiter = new RateLimiter(
      { windowMs: 10_000, maxRequests: 5, keyPrefix: 'test' },
      makeMemoryStore(),
    );
    await expect(
      withRateLimit(limiter, async () => { throw new Error('op failed'); }),
    ).rejects.toThrow('op failed');
  });
});

// ── rateLimitConfigs ──────────────────────────────────────────────────────────

describe('rateLimitConfigs', () => {
  it('auth config has max 5 requests per 15 minutes', () => {
    expect(rateLimitConfigs.auth.maxRequests).toBe(5);
    expect(rateLimitConfigs.auth.windowMs).toBe(15 * 60 * 1000);
  });

  it('payment config has max 5 requests per minute', () => {
    expect(rateLimitConfigs.payment.maxRequests).toBe(5);
    expect(rateLimitConfigs.payment.windowMs).toBe(60_000);
  });

  it('createRateLimiter produces a RateLimiter instance', () => {
    const limiter = createRateLimiter('api');
    expect(limiter).toBeInstanceOf(RateLimiter);
  });
});
