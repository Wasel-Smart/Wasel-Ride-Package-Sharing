/**
 * Retry Logic Test Suite
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry, RetryPresets } from '@/utils/retry';

describe('Retry Logic', () => {
  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { maxAttempts: 2, initialDelayMs: 10 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network failed'));
    
    await expect(
      withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
    ).rejects.toThrow('network failed');
    
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400 });
    
    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
        retryableErrors: (error) => {
          return typeof error === 'object' && error !== null && 'status' in error
            ? (error as { status: number }).status >= 500
            : false;
        },
      })
    ).rejects.toEqual({ status: 400 });
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();
    
    await withRetry(fn, {
      maxAttempts: 2,
      initialDelayMs: 10,
      onRetry,
    });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should use preset configurations', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, {
      ...RetryPresets.QUICK,
      initialDelayMs: 10,
    });
    
    expect(result).toBe('success');
  });

  it('should apply exponential backoff', async () => {
    const callTimes: number[] = [];
    const fn = vi.fn().mockImplementation(async () => {
      callTimes.push(Date.now());
      if (callTimes.length < 3) {
        throw new Error('network failed');
      }

      return 'success';
    });
    
    await withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 40,
      backoffMultiplier: 2,
      jitterFactor: 0,
    });
    
    const firstDelay = callTimes[1]! - callTimes[0]!;
    const secondDelay = callTimes[2]! - callTimes[1]!;

    expect(firstDelay).toBeGreaterThanOrEqual(30);
    expect(secondDelay).toBeGreaterThanOrEqual(70);
    expect(secondDelay).toBeGreaterThan(firstDelay);
  });
});
