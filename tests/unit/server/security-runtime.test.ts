import { describe, expect, it } from 'vitest';
import { generateSixDigitOtp, sanitizeEdgeErrorMessage, verifyTimestampedHmacSignature } from '../../../supabase/functions/make-server-0b1f4071/_shared/security-runtime';

describe('sanitizeEdgeErrorMessage', () => {
  it('does not expose provider or database exception messages', () => {
    expect(sanitizeEdgeErrorMessage(new Error('Postgres connection string: postgres://internal'))).toBe(
      'Internal server error',
    );
  });

  it('does not expose raw string errors', () => {
    expect(sanitizeEdgeErrorMessage('Stripe secret configuration is invalid')).toBe(
      'Internal server error',
    );
  });

  it('returns a generic message for unknown values', () => {
    expect(sanitizeEdgeErrorMessage({ detail: 'internal diagnostic' })).toBe(
      'Internal server error',
    );
  });
});

describe('verifyTimestampedHmacSignature', () => {
  async function sign(secret: string, timestamp: number, payload: string): Promise<string> {
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
    return Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  it('accepts a valid signature inside the timestamp tolerance', async () => {
    const timestamp = 1_800_000_000;
    const payload = '{"id":"evt_test"}';
    const signature = await sign('test-secret', timestamp, payload);

    await expect(verifyTimestampedHmacSignature(
      'test-secret',
      payload,
      `t=${timestamp},v1=${signature}`,
      300,
      timestamp * 1000,
    )).resolves.toBe(true);
  });

  it('rejects a correctly signed payload outside the timestamp tolerance', async () => {
    const timestamp = 1_800_000_000;
    const payload = '{"id":"evt_test"}';
    const signature = await sign('test-secret', timestamp, payload);

    await expect(verifyTimestampedHmacSignature(
      'test-secret',
      payload,
      `t=${timestamp},v1=${signature}`,
      300,
      (timestamp + 301) * 1000,
    )).resolves.toBe(false);
  });

  it('accepts any matching v1 signature during secret rotation', async () => {
    const timestamp = 1_800_000_000;
    const payload = '{"id":"evt_test"}';
    const signature = await sign('test-secret', timestamp, payload);

    await expect(verifyTimestampedHmacSignature(
      'test-secret',
      payload,
      `t=${timestamp},v1=${'0'.repeat(64)},v1=${signature}`,
      300,
      timestamp * 1000,
    )).resolves.toBe(true);
  });
});

describe('generateSixDigitOtp', () => {
  it('returns a six-digit numeric code', () => {
    expect(generateSixDigitOtp()).toMatch(/^[1-9]\d{5}$/);
  });
});
