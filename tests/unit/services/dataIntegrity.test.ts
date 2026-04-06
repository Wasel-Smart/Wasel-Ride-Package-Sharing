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

  it('retries transient write failures and preserves the final result', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network timeout while writing'))
      .mockResolvedValueOnce({ ok: true });

    const result = await withDataIntegrity({
      operation: 'test.write',
      schema: profileUpdatePayloadSchema,
      payload: { full_name: 'Laith Khaled' },
      execute,
      maxAttempts: 2,
    });

    expect(result).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
