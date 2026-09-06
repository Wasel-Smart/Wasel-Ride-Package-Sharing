import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMockSupabase = () => {
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockFunctionsInvoke = vi.fn();
  const mockAuthGetUser = vi.fn();
  const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'user-1' } } }, error: null });
  const mockRefreshSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'user-1' } } }, error: null });

  const mockSupabase = {
    auth: {
      getUser: mockAuthGetUser,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: mockFunctionsInvoke,
    },
    from: mockFrom,
  };

  return { mockSupabase, mockFunctionsInvoke, mockAuthGetUser, mockGetSession, mockRefreshSession, mockFrom, mockSelect, mockEq, mockSingle };
};

vi.mock('@/utils/supabase/client.ts', () => ({
  supabase: null,
}));

describe('payment.test.ts', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  // `payment.ts` gets its request token from `getAuthDetails()` (in
  // `@/services/core`), not from the raw supabase client — mocked directly
  // here so tests don't have to fight the session/refresh-token logic that
  // lives inside `getAuthDetails` itself (that has its own test coverage).
  let mockGetAuthDetails: ReturnType<typeof vi.fn>;
  // `payment.ts` sends requests via `requestEdgeJson` (a plain HTTP call
  // through `fetchWithRetry`), not `supabase.functions.invoke`. Mocking it
  // directly avoids needing a real API_URL and a mocked global fetch.
  let mockRequestEdgeJson: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
    mockGetAuthDetails = vi.fn().mockResolvedValue({ token: 'token', userId: 'user-1' });
    mockRequestEdgeJson = vi.fn();

    vi.doMock('@/utils/supabase/client.ts', () => ({
      supabase: mockSupabase.mockSupabase,
    }));
    vi.doMock('@/services/core', () => ({
      getAuthDetails: mockGetAuthDetails,
    }));
    vi.doMock('@/services/backendWorkflow', async () => {
      const actual = await vi.importActual<typeof import('@/services/backendWorkflow')>(
        '@/services/backendWorkflow',
      );
      return {
        ...actual,
        requestEdgeJson: mockRequestEdgeJson,
      };
    });
  });

  it('creates payment intent with valid amount', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRequestEdgeJson.mockResolvedValue({ clientSecret: 'secret-123', paymentIntentId: 'pi-123' });

    const { paymentService: ps } = await import('@/services/payment');
    const result = await ps.createPaymentIntent({
      amount: 5.00,
      currency: 'jod',
      bookingId: 'booking-1',
    });

    expect(result.clientSecret).toBe('secret-123');
    expect(result.paymentIntentId).toBe('pi-123');
    expect(mockRequestEdgeJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/payment/create-intent',
        operation: 'createPaymentIntent',
        authMode: 'required',
        method: 'POST',
        body: expect.objectContaining({
          action: 'create-payment-intent',
          amount: 5000,
          currency: 'jod',
          booking_id: 'booking-1',
          idempotency_key: 'booking:booking-1',
          metadata: expect.objectContaining({
            booking_id: 'booking-1',
            user_id: 'user-1',
          }),
        }),
      }),
    );
  });

  it('normalizes JOD amount to minor units (multiplier 1000)', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRequestEdgeJson.mockResolvedValue({ clientSecret: 'secret', paymentIntentId: 'pi-1' });

    const { paymentService: ps } = await import('@/services/payment');
    await ps.createPaymentIntent({
      amount: 1.5,
      currency: 'jod',
      bookingId: 'b-1',
    });

    const callArgs = mockRequestEdgeJson.mock.calls[0][0] as { body: { amount: number } };
    expect(callArgs.body.amount).toBe(1500);
  });

  it('normalizes non-JOD amount to minor units (multiplier 100)', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRequestEdgeJson.mockResolvedValue({ clientSecret: 'secret', paymentIntentId: 'pi-1' });

    const { paymentService: ps } = await import('@/services/payment');
    await ps.createPaymentIntent({
      amount: 10.00,
      currency: 'usd',
      bookingId: 'b-1',
    });

    const callArgs = mockRequestEdgeJson.mock.calls[0][0] as { body: { amount: number } };
    expect(callArgs.body.amount).toBe(1000);
  });

  it('rejects amounts below minimum', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.createPaymentIntent({
        amount: 0.001,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Payment amount must be at least 0.50');
  });

  it('rejects non-safe-integer amounts', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.createPaymentIntent({
        amount: Number.MAX_SAFE_INTEGER * 2,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Payment amount must be at least 0.50');
  });

  it('throws on unauthenticated user', async () => {
    // createPaymentIntent checks auth via supabase.auth.getUser() (not
    // getSession/getAuthDetails) — that's the mock that needs to reflect
    // "no user" for this path to actually exercise the auth check.
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' },
    });

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.createPaymentIntent({
        amount: 10,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Not authenticated');
  });

  it('propagates an edge request failure (e.g. a timeout) instead of hanging', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRequestEdgeJson.mockRejectedValue(new DOMException('Request aborted', 'AbortError'));

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.createPaymentIntent({
        amount: 10,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Request aborted');
  });

  it('throws on invalid payment response', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockRequestEdgeJson.mockResolvedValue({ clientSecret: undefined, paymentIntentId: undefined });

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.createPaymentIntent({
        amount: 10,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Invalid payment response');
  });

  it('throws when supabase is not configured', async () => {
    vi.doMock('@/utils/supabase/client.ts', () => ({
      supabase: null,
    }));

    const { paymentService: ps } = await import('@/services/payment');

    await expect(
      ps.createPaymentIntent({
        amount: 10,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Supabase client not configured');
  });

  it('processes refund with full amount', async () => {
    mockRequestEdgeJson.mockResolvedValue({ refundId: 'refund-1', amount: 5000 });

    const { paymentService: ps } = await import('@/services/payment');
    const result = await ps.processRefund({
      bookingId: 'booking-1',
      amount: 50,
      reason: 'customer request',
    });

    expect(result.success).toBe(true);
    expect(result.refundId).toBe('refund-1');
    expect(result.amount).toBe(5000);
  });

  it('processes refund without specifying amount', async () => {
    mockRequestEdgeJson.mockResolvedValue({ refundId: 'refund-2' });

    const { paymentService: ps } = await import('@/services/payment');
    const result = await ps.processRefund({
      bookingId: 'booking-1',
      reason: 'customer request',
    });

    expect(result.success).toBe(true);
    expect(result.refundId).toBe('refund-2');
    expect(result.amount).toBe(0);
  });

  it('throws on invalid refund response', async () => {
    mockRequestEdgeJson.mockResolvedValue({ refundId: undefined });

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.processRefund({
        bookingId: 'booking-1',
        reason: 'test',
      }),
    ).rejects.toThrow('Invalid refund response');
  });

  it('gets payment status', async () => {
    mockRequestEdgeJson.mockResolvedValue('succeeded');

    const { paymentService: ps } = await import('@/services/payment');
    const result = await ps.getPaymentStatus('booking-1');
    expect(result).toBe('succeeded');
  });

  it('confirmPayment resolves once the polled payment status succeeds', async () => {
    mockRequestEdgeJson.mockResolvedValue('succeeded');

    const { paymentService: ps } = await import('@/services/payment');
    await expect(ps.confirmPayment('b-1')).resolves.toBe('succeeded');
  });
});
