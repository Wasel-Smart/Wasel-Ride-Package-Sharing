import { describe, expect, it, vi } from 'vitest';
import { consumeRateLimitToken } from '../../../supabase/functions/make-server-0b1f4071/_shared/security-runtime';

describe('distributed Edge rate limiter', () => {
  it('hashes the bucket key and returns the atomic database decision', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const result = await consumeRateLimitToken({ rpc }, {
      key: 'wallet:transfer:user-123',
      maxRequests: 12,
      windowMs: 10 * 60_000,
    });

    expect(result).toEqual({ allowed: true, unavailable: false });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('consume_edge_rate_limit', {
      p_bucket_key: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_max_requests: 12,
      p_window_seconds: 600,
    });
    const firstCallArgs = rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(firstCallArgs.p_bucket_key).not.toContain('user-123');
  });

  it('fails closed when the RPC returns a database error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('database unavailable') });
    await expect(consumeRateLimitToken({ rpc }, {
      key: '2fa:verify:user-123',
      maxRequests: 8,
      windowMs: 60_000,
    })).resolves.toEqual({ allowed: false, unavailable: true });
  });

  it('fails closed when the RPC response is not a boolean', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(consumeRateLimitToken({ rpc }, {
      key: 'communications:user-123',
      maxRequests: 25,
      windowMs: 300_000,
    })).resolves.toEqual({ allowed: false, unavailable: true });
  });
});
