import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/client.ts', () => ({
  supabase: null,
  supabaseUrl: '',
}));

const createMockSupabase = () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'user-1' } } }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'new-token', user: { id: 'user-1' } } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };

  return {
    mockSupabase,
    auth: mockSupabase.auth,
    from: mockSupabase.from,
  };
};

describe('cancellation.test.ts', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.resetModules();
    mockSupabase = createMockSupabase();
    vi.doMock('@/utils/supabase/client.ts', () => ({
      supabase: mockSupabase.mockSupabase,
      supabaseUrl: '',
    }));
  });

  it('cancelBooking throws when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test' })).rejects.toThrow('Not authenticated');
  });

  it('cancelBooking throws when booking not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test' })).rejects.toThrow('Booking not found');
  });

  it('cancelBooking throws when booking already cancelled', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'b1', status: 'cancelled', passenger_id: 'user-1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test' })).rejects.toThrow('Booking already cancelled');
  });

  it('cancelBooking throws when booking is completed', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'b1', status: 'completed', passenger_id: 'user-1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test' })).rejects.toThrow('Cannot cancel completed booking');
  });

  it('cancelBooking throws when unauthorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'other-user' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'b1', status: 'pending', passenger_id: 'user-1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test' })).rejects.toThrow('Unauthorized');
  });

  it('cancelBooking updates status and processes refund when payment succeeded', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'b1', status: 'pending', passenger_id: 'user-1', trip_id: 't1', payment_status: 'succeeded' }, error: null }),
        })),
      })),
    }).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { driver_id: 'driver-1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test' })).resolves.toBeUndefined();
  });

  it('cancelBooking without refund skips refund', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'b1', status: 'pending', passenger_id: 'user-1', trip_id: 't1', payment_status: 'pending' }, error: null }),
        })),
      })),
    }).mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { driver_id: 'driver-1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelBooking({ bookingId: 'b1', reason: 'test', refundRequested: false })).resolves.toBeUndefined();
  });

  it('cancelTrip throws when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelTrip({ tripId: 't1', reason: 'test' })).rejects.toThrow('Not authenticated');
  });

  it('cancelTrip throws when trip not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelTrip({ tripId: 't1', reason: 'test' })).rejects.toThrow('Trip not found');
  });

  it('cancelTrip throws when trip already cancelled', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 't1', status: 'cancelled', driver_id: 'user-1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    await expect(cs.cancelTrip({ tripId: 't1', reason: 'test' })).rejects.toThrow('Trip already cancelled');
  });

  it('canCancelBooking returns true for eligible booking', async () => {
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { status: 'pending', trip_id: 't1' }, error: null }),
        })),
      })),
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { departure_time: futureTime }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    const result = await cs.canCancelBooking('b1');
    expect(result.canCancel).toBe(true);
  });

  it('canCancelBooking returns false for completed trip', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { status: 'completed', trip_id: 't1' }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    const result = await cs.canCancelBooking('b1');
    expect(result.canCancel).toBe(false);
    expect(result.reason).toBe('Trip completed');
  });

  it('canCancelBooking returns false too close to departure', async () => {
    const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { status: 'pending', trip_id: 't1' }, error: null }),
        })),
      })),
    });
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { departure_time: pastTime }, error: null }),
        })),
      })),
    });

    const { cancellationService: cs } = await import('@/services/cancellation');
    const result = await cs.canCancelBooking('b1');
    expect(result.canCancel).toBe(false);
    expect(result.reason).toBe('Too close to departure time');
  });
});
