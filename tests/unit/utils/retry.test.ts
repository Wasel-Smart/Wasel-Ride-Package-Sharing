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
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { maxAttempts: 2, initialDelayMs: 10 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'));
    
    await expect(
      withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
    ).rejects.toThrow('Failed');
    
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
      .mockRejectedValueOnce(new Error('Failed'))
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
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, {
      ...RetryPresets.QUICK,
      initialDelayMs: 10,
    });
    
    expect(result).toBe('success');
  });

  it('should apply exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success');
    
    const delays: number[] = [];
    const startTime = Date.now();
    
    await withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2,
      jitterFactor: 0,
      onRetry: () => {
        delays.push(Date.now() - startTime);
      },
    });
    
    // Second delay should be roughly 2x the first
    expect(delays[1]).toBeGreaterThan(delays[0]! * 1.5);
  });
});
