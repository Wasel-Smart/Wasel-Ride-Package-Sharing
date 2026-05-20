import { beforeEach, describe, expect, it, vi } from 'vitest';

type WorkflowOptions = {
  edge: (context: { userId?: string; token?: string }) => Promise<unknown>;
  fallback?: (context: { userId?: string; token?: string }) => Promise<unknown>;
};

const mockRequestEdgeJson = vi.fn();
const mockRunBackendWorkflow = vi.fn();
const mockCreateDirectBooking = vi.fn();
const mockGetDirectUserBookings = vi.fn();
const mockGetDirectTripBookings = vi.fn();
const mockUpdateDirectBookingStatus = vi.fn();

vi.mock('../../../src/services/backendWorkflow', () => ({
  requestEdgeJson: (...args: unknown[]) => mockRequestEdgeJson(...args),
  runBackendWorkflow: (options: WorkflowOptions) => mockRunBackendWorkflow(options),
}));

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectBooking: (...args: unknown[]) => mockCreateDirectBooking(...args),
  getDirectUserBookings: (...args: unknown[]) => mockGetDirectUserBookings(...args),
  getDirectTripBookings: (...args: unknown[]) => mockGetDirectTripBookings(...args),
  updateDirectBookingStatus: (...args: unknown[]) => mockUpdateDirectBookingStatus(...args),
}));

import { bookingsAPI } from '../../../src/services/bookings';

describe('bookingsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunBackendWorkflow.mockImplementation(async (options: WorkflowOptions) =>
      options.edge({ userId: 'user-123', token: 'token-123' }),
    );
  });

  it('normalizes flat edge booking creation payloads into a stable envelope', async () => {
    mockRequestEdgeJson.mockResolvedValue({
      id: 'booking-1',
      trip_id: 'trip-1',
      passenger_id: 'user-123',
      seats_requested: '2',
      seat_number: '4',
      price_per_seat: '3.5',
      total_price: '7',
      status: 'accepted',
      confirmed_by_driver: true,
      created_at: '2026-04-01T10:00:00.000Z',
    });

    const result = await bookingsAPI.createBooking(
      'trip-1',
      2,
      'Abdali',
      'Aqaba Terminal',
      { total_price: 7 },
    );

    expect(result).toEqual({
      booking: {
        id: 'booking-1',
        booking_id: 'booking-1',
        trip_id: 'trip-1',
        passenger_id: 'user-123',
        seats_requested: 2,
        seat_number: 4,
        pickup_location: null,
        dropoff_location: null,
        price_per_seat: 3.5,
        total_price: 7,
        amount: 7,
        status: 'confirmed',
        booking_status: 'confirmed',
        confirmed_by_driver: true,
        created_at: '2026-04-01T10:00:00.000Z',
        updated_at: null,
      },
    });
  });

  it('normalizes direct fallback booking lists to the shared booking contract', async () => {
    mockRunBackendWorkflow.mockImplementationOnce(async (options: WorkflowOptions) =>
      options.fallback!({ userId: 'user-123', token: 'token-123' }),
    );
    mockGetDirectUserBookings.mockResolvedValue([
      {
        id: 'booking-2',
        trip_id: 'trip-2',
        passenger_id: 'user-123',
        seats_requested: '1',
        amount: '5',
        booking_status: 'pending_payment',
      },
    ]);

    const result = await bookingsAPI.getUserBookings();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'booking-2',
        booking_id: 'booking-2',
        status: 'pending',
        booking_status: 'pending',
        seats_requested: 1,
        amount: 5,
      }),
    ]);
  });

  it('normalizes booking status updates returned by the edge backend', async () => {
    mockRequestEdgeJson.mockResolvedValue({
      booking_id: 'booking-3',
      trip_id: 'trip-3',
      seats_requested: 1,
      amount: 12,
      status: 'rejected',
    });

    const result = await bookingsAPI.updateBookingStatus('booking-3', 'rejected');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'booking-3',
        booking_id: 'booking-3',
        status: 'cancelled',
        booking_status: 'cancelled',
        amount: 12,
      }),
    );
  });
});
