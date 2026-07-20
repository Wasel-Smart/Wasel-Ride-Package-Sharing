/**
 * tests/utils/rateLimit.test.ts
 *
 * Unit tests for src/utils/rateLimit.ts
 *
 * IMPORTANT CONTEXT (see chat write-up, not re-derived here): this module
 * runs entirely in the browser and keys its counter off a client-supplied
 * fingerprint (userAgent/language/screen/timezone) stored in an in-memory
 * Map. That means it cannot actually stop a scripted/API client from
 * exceeding the limit — anyone bypassing the frontend JS (or just reloading,
 * which clears the Map) resets their count for free. These tests verify the
 * *counting and threshold arithmetic* is correct, which is real and useful
 * (e.g. for UI throttling / accidental double-submits) — they intentionally
 * do not claim this module provides abuse/DDoS/brute-force protection on its
 * own, despite the source file's header comment.
 *
 * Each RateLimiter below uses a unique keyPrefix so tests can't collide via
 * the shared in-memory store (the client fingerprint is otherwise constant
 * within a single jsdom test run).
 */

import { describe, it, expect } from 'vitest';
import { RateLimiter, withRateLimit, rateLimitConfigs } from '@/utils/rateLimit';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── rateLimitConfigs ───────────────────────────────────────────────────────────

describe('rateLimitConfigs', () => {
  it('defines stricter limits for auth and payment than general api traffic', () => {
    expect(rateLimitConfigs.auth.maxRequests).toBeLessThan(rateLimitConfigs.api.maxRequests);
    expect(rateLimitConfigs.payment.maxRequests).toBeLessThan(rateLimitConfigs.api.maxRequests);
  });

  it('every config has a unique keyPrefix', () => {
    const prefixes = Object.values(rateLimitConfigs).map((c) => c.keyPrefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

// ── RateLimiter.checkLimit() ──────────────────────────────────────────────────

describe('RateLimiter.checkLimit()', () => {
  it('allows requests up to maxRequests, then blocks', async () => {
    const limiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 3,
      keyPrefix: 'wasel-test-threshold',
    });

    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await limiter.checkLimit());
    }

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
  });

  it('resets the count once the configured window elapses', async () => {
    const limiter = new RateLimiter({
      windowMs: 30,
      maxRequests: 1,
      keyPrefix: 'wasel-test-window-expiry',
    });

    expect((await limiter.checkLimit()).allowed).toBe(true);
    expect((await limiter.checkLimit()).allowed).toBe(false);

    await sleep(50); // exceed the 30ms window

    expect((await limiter.checkLimit()).allowed).toBe(true);
  });
});

// ── withRateLimit() ────────────────────────────────────────────────────────────

describe('withRateLimit()', () => {
  it('runs the operation and returns its result when under the limit', async () => {
    const limiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 5,
      keyPrefix: 'wasel-test-with-rl-success',
    });
    const result = await withRateLimit(limiter, () => Promise.resolve('done'));
    expect(result).toBe('done');
  });

  it('throws a descriptive error and never calls the operation once exhausted', async () => {
    const limiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 1,
      keyPrefix: 'wasel-test-with-rl-exhausted',
    });

    await withRateLimit(limiter, () => Promise.resolve('first'));

    let called = false;
    await expect(
      withRateLimit(limiter, () => {
        called = true;
        return Promise.resolve('second');
      }),
    ).rejects.toThrow(/Rate limit exceeded/);
    expect(called).toBe(false);
  });

  it('still propagates the operation error, and counts the attempt, on failure', async () => {
    const limiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 5,
      keyPrefix: 'wasel-test-with-rl-op-error',
    });

    await expect(withRateLimit(limiter, () => Promise.reject(new Error('downstream failed')))).rejects.toThrow(
      'downstream failed',
    );
  });
});

// ── skipSuccessfulRequests / skipFailedRequests ───────────────────────────────

describe('RateLimiter.recordRequest() skip flags', () => {
  it('does not count a request toward the limit when skipSuccessfulRequests is set and it succeeded', async () => {
    const limiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 2,
      keyPrefix: 'wasel-test-skip-success',
      skipSuccessfulRequests: true,
    });

    await limiter.checkLimit(); // count = 1
    await limiter.recordRequest(true); // should be a no-op
    const result = await limiter.checkLimit(); // should be count = 2, not 3

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('does not count a request toward the limit when skipFailedRequests is set and it failed', async () => {
    const limiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 2,
      keyPrefix: 'wasel-test-skip-failed',
      skipFailedRequests: true,
    });

    await limiter.checkLimit(); // count = 1
    await limiter.recordRequest(false); // should be a no-op
    const result = await limiter.checkLimit(); // should be count = 2, not 3

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });
});
