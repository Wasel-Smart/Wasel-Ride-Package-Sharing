import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockContext = {
  token: 'mock-token',
  userId: 'user-1',
};

vi.mock('@/services/backendWorkflow', () => ({
  runBackendWorkflow: vi.fn(async ({ edge }: { edge: (ctx: unknown) => Promise<unknown> }) => edge(mockContext)),
  requestEdgeJson: vi.fn(async ({ body }: { body: unknown }) => body),
  hasConfiguredEdgeTransport: vi.fn(() => true),
  getSecureBackendFallbackError: vi.fn(() => new Error('fallback')),
  logFallbackUsage: vi.fn(),
}));

describe('bookings.test.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createBooking passes correct fields to edge', async () => {
    const { bookingsAPI: api } = await import('@/services/bookings');
    const result = await api.createBooking('trip-1', 2, 'pickup-stop', 'dropoff-stop', {
      notes: 'hello',
    });

    expect(result).toEqual({
      trip_id: 'trip-1',
      seats_requested: 2,
      pickup_stop: 'pickup-stop',
      dropoff_stop: 'dropoff-stop',
      notes: 'hello',
    });
  });

  it('getUserBookings requests correct path', async () => {
    const { requestEdgeJson } = await import('@/services/backendWorkflow') as Record<string, { mockResolvedValueOnce: (value: unknown) => void }>;
    requestEdgeJson.mockResolvedValueOnce({ bookings: [{ booking_id: 'b1', trip_id: 't1', status: 'pending' }] });

    const { bookingsAPI: api } = await import('@/services/bookings');
    const result = await api.getUserBookings();

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].booking_id).toBe('b1');
  });

  it('getTripBookings requests correct path', async () => {
    const { requestEdgeJson } = await import('@/services/backendWorkflow') as Record<string, { mockResolvedValueOnce: (value: unknown) => void }>;
    requestEdgeJson.mockResolvedValueOnce({ bookings: [{ booking_id: 'b1', trip_id: 't1', status: 'pending' }] });

    const { bookingsAPI: api } = await import('@/services/bookings');
    const result = await api.getTripBookings('trip-1');

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].trip_id).toBe('t1');
  });

  it('updateBookingStatus updates status', async () => {
    const { requestEdgeJson } = await import('@/services/backendWorkflow') as Record<string, { mockResolvedValueOnce: (value: unknown) => void }>;
    requestEdgeJson.mockResolvedValueOnce({ booking_id: 'b1', status: 'accepted' });

    const { bookingsAPI: api } = await import('@/services/bookings');
    const result = await api.updateBookingStatus('b1', 'accepted');

    expect(result.status).toBe('accepted');
  });

  it('normalizeBookingRecord handles nested booking key', async () => {
    const raw = { booking: { booking_id: 'b1', trip_id: 't1' } };
    const { normalizeBookingRecord } = await import('@/services/bookings');
    const result = normalizeBookingRecord(raw);
    expect(result.booking_id).toBe('b1');
    expect(result.trip_id).toBe('t1');
  });

  it('normalizeBookingRecord handles flat record', async () => {
    const raw = { booking_id: 'b1', trip_id: 't1', status: 'confirmed' };
    const { normalizeBookingRecord } = await import('@/services/bookings');
    const result = normalizeBookingRecord(raw);
    expect(result.booking_id).toBe('b1');
    expect(result.status).toBe('confirmed');
  });

  it('normalizeBookingRecord falls back to id', async () => {
    const raw = { id: 'b1', trip_id: 't1' };
    const { normalizeBookingRecord } = await import('@/services/bookings');
    const result = normalizeBookingRecord(raw);
    expect(result.booking_id).toBe('b1');
  });

  it('normalizeBookingList wraps array', async () => {
    const raw = [{ booking_id: 'b1', trip_id: 't1' }];
    const { normalizeBookingList } = await import('@/services/bookings');
    const result = normalizeBookingList(raw);
    expect(result.bookings).toHaveLength(1);
  });

  it('normalizeBookingList wraps non-array', async () => {
    const raw = null;
    const { normalizeBookingList } = await import('@/services/bookings');
    const result = normalizeBookingList(raw);
    expect(result.bookings).toHaveLength(0);
  });
});
