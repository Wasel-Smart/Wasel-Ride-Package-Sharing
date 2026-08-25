import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMockSupabase = () => {
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockFunctionsInvoke = vi.fn();
  const mockAuthGetUser = vi.fn();
  const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'user-1' } } }, error: null });

  const mockSupabase = {
    auth: {
      getUser: mockAuthGetUser,
      getSession: mockGetSession,
      refreshSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: mockFunctionsInvoke,
    },
    from: mockFrom,
  };

  return { mockSupabase, mockFunctionsInvoke, mockAuthGetUser, mockGetSession, mockFrom, mockSelect, mockEq, mockSingle };
};

vi.mock('@/utils/supabase/client.ts', () => ({
  supabase: null,
}));

describe('payment.test.ts', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock('@/utils/supabase/client.ts', () => ({
      supabase: mockSupabase.mockSupabase,
    }));
  });

  it('creates payment intent with valid amount', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { clientSecret: 'secret-123', paymentIntentId: 'pi-123' },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    const result = await ps.createPaymentIntent({
      amount: 5.00,
      currency: 'jod',
      bookingId: 'booking-1',
    });

    expect(result.clientSecret).toBe('secret-123');
    expect(result.paymentIntentId).toBe('pi-123');
    expect(mockSupabase.mockFunctionsInvoke).toHaveBeenCalledWith('stripe-payments-v2', {
      body: expect.objectContaining({
        action: 'create-payment-intent',
        amount: 5000,
        currency: 'jod',
        idempotency_key: 'booking:booking-1',
        metadata: expect.objectContaining({
          booking_id: 'booking-1',
          user_id: 'user-1',
        }),
      }),
      headers: expect.objectContaining({
        Authorization: expect.stringContaining('Bearer'),
      }),
    });
  });

  it('normalizes JOD amount to minor units (multiplier 1000)', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { clientSecret: 'secret', paymentIntentId: 'pi-1' },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    await ps.createPaymentIntent({
      amount: 1.5,
      currency: 'jod',
      bookingId: 'b-1',
    });

    const callArgs = mockSupabase.mockFunctionsInvoke.mock.calls[0];
    expect((callArgs as unknown as any[])[1].body.amount).toBe(1500);
  });

  it('normalizes non-JOD amount to minor units (multiplier 100)', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { clientSecret: 'secret', paymentIntentId: 'pi-1' },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    await ps.createPaymentIntent({
      amount: 10.00,
      currency: 'usd',
      bookingId: 'b-1',
    });

    const callArgs = mockSupabase.mockFunctionsInvoke.mock.calls[0];
    expect((callArgs as unknown as any[])[1].body.amount).toBe(1000);
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
    // Mock getSession to return no session (unauthenticated)
    mockSupabase.mockGetSession.mockResolvedValue({
      data: { session: null },
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

  it('handles payment timeout', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    const slowInvoke = new Promise(() => {});
    mockSupabase.mockFunctionsInvoke.mockReturnValue(slowInvoke);

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.createPaymentIntent({
        amount: 10,
        currency: 'jod',
        bookingId: 'b-1',
      }),
    ).rejects.toThrow('Payment request timed out');
  }, 20000);

  it('throws on invalid payment response', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { clientSecret: undefined, paymentIntentId: undefined },
      error: null,
    });

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
    ).rejects.toThrow('Payments are not available');
  });

  it('processes refund with full amount', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { refundId: 'refund-1', amount: 5000 },
      error: null,
    });

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
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { refundId: 'refund-2' },
      error: null,
    });

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
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockFunctionsInvoke.mockResolvedValue({
      data: { refundId: undefined },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    await expect(
      ps.processRefund({
        bookingId: 'booking-1',
        reason: 'test',
      }),
    ).rejects.toThrow('Invalid refund response');
  });

  it('gets payment status', async () => {
    mockSupabase.mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.mockEq.mockReturnValue({
      eq: mockSupabase.mockEq,
      single: mockSupabase.mockSingle,
    });
    mockSupabase.mockSingle.mockResolvedValue({
      data: { payment_status: 'succeeded' },
      error: null,
    });

    const { paymentService: ps } = await import('@/services/payment');
    const result = await ps.getPaymentStatus('booking-1');
    expect(result).toBe('succeeded');
  });

  it('confirmPayment is a no-op', async () => {
    const { paymentService: ps } = await import('@/services/payment');
    await expect(ps.confirmPayment('b-1', 'pi-1')).resolves.toBeUndefined();
  });
});
