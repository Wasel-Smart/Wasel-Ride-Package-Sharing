import { describe, expect, it, vi } from 'vitest';
import {
  consumeRateLimitToken,
  getClientIp,
  sanitizeEdgeErrorMessage,
  verifyTimestampedHmacSignature,
} from '../../../supabase/functions/make-server-0b1f4071/_shared/security-runtime';

describe('distributed Edge rate limiter', () => {
  it('uses the trusted proxy client IP before a caller-supplied forwarded header', () => {
    const request = new Request('https://edge.example.test/wallet/transfer', {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.20',
      },
    });

    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('does not trust X-Forwarded-For when the trusted Cloudflare header is absent', () => {
    const request = new Request('https://edge.example.test/wallet/transfer', {
      headers: { 'x-forwarded-for': '198.51.100.20' },
    });

    expect(getClientIp(request)).toBe('unknown');
  });


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


describe('Edge security helpers', () => {
  it('does not expose internal exception messages to API callers', () => {
    expect(sanitizeEdgeErrorMessage(new Error('provider secret or SQL detail'))).toBe('Internal server error');
  });

  it('accepts a valid timestamped HMAC signature including a rotated v1 signature', async () => {
    const secret = 'test-webhook-secret-with-sufficient-entropy';
    const payload = '{"id":"evt_test"}';
    const nowMs = 1_800_000_000_000;
    const timestamp = Math.floor(nowMs / 1000);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    );
    const signatureHex = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');

    await expect(verifyTimestampedHmacSignature(
      secret,
      payload,
      `t=${timestamp},v1=${'0'.repeat(64)},v1=${signatureHex}`,
      300,
      nowMs,
    )).resolves.toBe(true);
  });

  it('rejects stale, malformed, and missing timestamped signatures', async () => {
    const secret = 'test-webhook-secret-with-sufficient-entropy';
    const payload = '{"id":"evt_test"}';
    const nowMs = 1_800_000_000_000;

    await expect(verifyTimestampedHmacSignature(secret, payload, 't=1,v1=deadbeef', 300, nowMs)).resolves.toBe(false);
    await expect(verifyTimestampedHmacSignature(secret, payload, 't=not-a-number,v1=deadbeef', 300, nowMs)).resolves.toBe(false);
    await expect(verifyTimestampedHmacSignature(secret, payload, null, 300, nowMs)).resolves.toBe(false);
  });
});
