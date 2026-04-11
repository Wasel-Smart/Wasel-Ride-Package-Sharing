import { describe, expect, it, vi } from 'vitest';
import {
  profileUpdatePayloadSchema,
  tripCreatePayloadSchema,
  withDataIntegrity,
} from '../../../src/services/dataIntegrity';

describe('dataIntegrity', () => {
  it('accepts phone-only profile updates so first-time phone saves can persist', () => {
    const result = profileUpdatePayloadSchema.safeParse({
      phone_number: '+962792084333',
    });

    expect(result.success).toBe(true);
  });

  it('canonicalizes local and 00-prefixed phone updates before profile validation', () => {
    const localResult = profileUpdatePayloadSchema.safeParse({
      phone_number: '0792084333',
    });
    const internationalPrefixResult = profileUpdatePayloadSchema.safeParse({
      phone_number: '00962 79 208 4333',
    });

    expect(localResult.success).toBe(true);
    expect(localResult.success && localResult.data.phone_number).toBe('+962792084333');
    expect(internationalPrefixResult.success).toBe(true);
    expect(internationalPrefixResult.success && internationalPrefixResult.data.phone_number).toBe(
      '+962792084333',
    );
  });

  it('rejects malformed trip writes before they hit the API or database', () => {
    const result = tripCreatePayloadSchema.safeParse({
      from: 'Amman',
      to: 'Amman',
      date: '2026-04-01',
      time: '08:00',
      seats: 0,
      price: -1,
    });

    expect(result.success).toBe(false);
  });

  it('does not retry unsafe writes unless explicitly enabled', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network timeout while writing'))
      .mockResolvedValueOnce({ ok: true });

    await expect(withDataIntegrity({
      operation: 'test.write',
      schema: profileUpdatePayloadSchema,
      payload: { full_name: 'Laith Khaled' },
      execute,
      maxAttempts: 2,
    })).rejects.toThrow('Network timeout while writing');

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures only when the operation opts into transient retries', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network timeout while writing'))
      .mockResolvedValueOnce({ ok: true });

    const result = await withDataIntegrity({
      operation: 'test.idempotent-write',
      schema: profileUpdatePayloadSchema,
      payload: { full_name: 'Laith Khaled' },
      execute,
      maxAttempts: 2,
      retryPolicy: 'transient',
    });

    expect(result).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
