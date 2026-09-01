import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackendRequestError, runBackendWorkflow } from '@/services/backendWorkflow';

vi.mock('@/utils/env', () => ({
  getConfig: () => ({
    allowDirectSupabaseFallback: false,
    isProd: true,
    isDev: false,
  }),
}));

describe('runBackendWorkflow error surfacing (production fallback denied)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces the real edge error instead of masking it with "requires edge function"', async () => {
    vi.spyOn(await import('@/services/core'), 'getAuthDetails').mockResolvedValue({
      token: 'token',
      userId: 'user-1',
    });

    const realEdgeError = new BackendRequestError('otp_sessions insert failed', {
      status: 500,
      payload: { error: 'otp_sessions insert failed' },
      recoverable: true,
    });

    await expect(
      runBackendWorkflow({
        operation: 'Phone verification start',
        authMode: 'required',
        fallbackPolicy: 'writes-if-enabled',
        edgeAvailable: true,
        edge: async () => {
          throw realEdgeError;
        },
        fallback: async () => ({ started: true }),
      }),
    ).rejects.toThrow('otp_sessions insert failed');

    await expect(
      runBackendWorkflow({
        operation: 'Phone verification start',
        authMode: 'required',
        fallbackPolicy: 'writes-if-enabled',
        edgeAvailable: true,
        edge: async () => {
          throw realEdgeError;
        },
        fallback: async () => ({ started: true }),
      }),
    ).rejects.not.toThrow(/Direct database access is disabled/);
  });

  it('translates an open circuit breaker into a friendly temporary-unavailability error', async () => {
    vi.spyOn(await import('@/services/core'), 'getAuthDetails').mockResolvedValue({
      token: 'token',
      userId: 'user-1',
    });

    const circuitOpenError = new Error('Circuit breaker api-calls is OPEN');

    await expect(
      runBackendWorkflow({
        operation: 'Phone verification start',
        authMode: 'required',
        fallbackPolicy: 'writes-if-enabled',
        edgeAvailable: true,
        edge: async () => {
          throw circuitOpenError;
        },
        fallback: async () => ({ started: true }),
      }),
    ).rejects.toThrow(/temporarily unavailable/);
  });
});
