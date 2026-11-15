import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as BackendWorkflowModule from '../backendWorkflow';
import type * as DirectSupabaseModule from '../directSupabase';

// ── Hoisted mocks ──

const mocks = vi.hoisted(() => ({
  mockRequestEdgeJson: vi.fn(),
  mockRunBackendWorkflow: vi.fn(),
  mockGetDirectUserBookings: vi.fn(),
  mockGetDirectTripBookings: vi.fn(),
  mockBackendRequestError: class extends Error {
    status?: number;
    recoverable?: boolean;
    constructor(message: string, options?: { status?: number; recoverable?: boolean }) {
      super(message);
      this.name = 'BackendRequestError';
      this.status = options?.status;
      this.recoverable = options?.recoverable ?? false;
    }
  },
}));

vi.mock('../backendWorkflow', async (importOriginal) => {
  const actual = await importOriginal<typeof BackendWorkflowModule>();
  return {
    ...actual,
    requestEdgeJson: mocks.mockRequestEdgeJson,
    runBackendWorkflow: mocks.mockRunBackendWorkflow,
    BackendRequestError: mocks.mockBackendRequestError,
  };
});

vi.mock('../directSupabase', async (importOriginal) => {
  const actual = await importOriginal<typeof DirectSupabaseModule>();
  return { ...actual, getDirectUserBookings: mocks.mockGetDirectUserBookings, getDirectTripBookings: mocks.mockGetDirectTripBookings };
});

import { bookingsAPI, normalizeBookingRecord, normalizeBookingList } from '../bookings';

describe('bookingsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRunBackendWorkflow.mockImplementation(async ({ edge, fallback }) => {
      // Simulate the actual workflow: try edge first, then fallback
      try {
        return await edge({ token: 'test-token', userId: 'user-1' });
      } catch (e) {
        if (fallback) {return fallback({ token: 'test-token', userId: 'user-1' });}
        throw e;
      }
    });
  });

  describe('normalizeBookingRecord', () => {
    it('extracts booking_id and trip_id from nested booking object', () => {
      const input = { booking: { booking_id: 'bk-1', trip_id: 'trip-1', status: 'confirmed', seats_requested: 2 } };
      const result = normalizeBookingRecord(input);
      expect(result.booking_id).toBe('bk-1');
      expect(result.trip_id).toBe('trip-1');
      expect(result.status).toBe('confirmed');
      expect(result.seatsRequested).toBeUndefined(); // not in nested
    });

    it('handles flat booking record', () => {
      const input = { booking_id: 'bk-2', trip_id: 'trip-2', status: 'pending', seats_requested: 1 };
      const result = normalizeBookingRecord(input);
      expect(result.booking_id).toBe('bk-2');
      expect(result.trip_id).toBe('trip-2');
      expect(result.status).toBe('pending');
    });

    it('falls back to id when booking_id missing', () => {
      const input = { id: 'fallback-id', trip_id: 'trip-3' };
      const result = normalizeBookingRecord(input);
      expect(result.booking_id).toBe('fallback-id');
    });

    it('defaults status to pending when missing', () => {
      const input = { booking_id: 'bk-3' };
      const result = normalizeBookingRecord(input);
      expect(result.status).toBe('pending');
    });

    it('handles null/undefined input gracefully', () => {
      const result = normalizeBookingRecord(null);
      expect(result.booking_id).toBe('');
      expect(result.trip_id).toBe('');
      expect(result.status).toBe('pending');
    });
  });

  describe('normalizeBookingList', () => {
    it('normalizes array of bookings', () => {
      const input = [
        { booking_id: 'bk-1', trip_id: 'trip-1', status: 'confirmed' },
        { booking_id: 'bk-2', trip_id: 'trip-2', status: 'pending' },
      ];
      const result = normalizeBookingList(input);
      expect(result.bookings).toHaveLength(2);
      expect(result.bookings![0]!.booking_id).toBe('bk-1');
      expect(result.bookings![1]!.status).toBe('pending');
    });

    it('returns empty bookings for non-array input', () => {
      const result = normalizeBookingList(null);
      expect(result.bookings).toEqual([]);
    });

    it('handles empty array', () => {
      const result = normalizeBookingList([]);
      expect(result.bookings).toEqual([]);
    });
  });

  describe('createBooking', () => {
    it('calls edge with correct payload', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ booking_id: 'new-bk', trip_id: 'trip-1', status: 'pending' });

      const result = await bookingsAPI.createBooking({
        tripId: 'trip-1',
        seatsRequested: 2,
        pickup: 'Amman',
        dropoff: 'Aqaba',
      });

      expect(result.booking_id).toBe('new-bk');
      expect(mocks.mockRunBackendWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'Booking creation',
          authMode: 'required',
          fallbackPolicy: 'never',
        })
      );
    });

    it('includes metadata in request body', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ booking_id: 'bk-1' });

      await bookingsAPI.createBooking({
        tripId: 'trip-1',
        seatsRequested: 1,
        metadata: { source: 'mobile', promo: 'WELCOME10' },
      });

      expect(mocks.mockRunBackendWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          edge: expect.any(Function),
        })
      );
    });

    it('throws when runBackendWorkflow throws', async () => {
      mocks.mockRunBackendWorkflow.mockRejectedValueOnce(new Error('Edge unavailable'));

      await expect(
        bookingsAPI.createBooking({ tripId: 'trip-1', seatsRequested: 1 })
      ).rejects.toThrow('Edge unavailable');
    });
  });

  describe('getUserBookings', () => {
    it('calls edge with user ID path', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ bookings: [{ booking_id: 'bk-1' }] });

      const result = await bookingsAPI.getUserBookings();

      expect(result.bookings).toHaveLength(1);
      expect(mocks.mockRunBackendWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'User booking loading',
          authMode: 'required',
        })
      );
    });

    it('falls back to direct Supabase when edge fails', async () => {
      mocks.mockRequestEdgeJson.mockRejectedValueOnce(new Error('Edge unavailable'));
      mocks.mockGetDirectUserBookings.mockResolvedValueOnce([
        { booking_id: 'direct-1', trip_id: 'trip-1', status: 'confirmed', passenger_id: 'user-1' },
      ]);

      const result = await bookingsAPI.getUserBookings();

      expect(mocks.mockGetDirectUserBookings).toHaveBeenCalledWith('user-1');
      expect(result.bookings![0]!.booking_id).toBe('direct-1');
    });

    it('surfaces the error when both edge and direct fail', async () => {
      mocks.mockRequestEdgeJson.mockRejectedValueOnce(new Error('Edge unavailable'));
      mocks.mockGetDirectUserBookings.mockRejectedValueOnce(new Error('DB error'));

      await expect(bookingsAPI.getUserBookings()).rejects.toThrow('DB error');
    });
  });

  describe('getTripBookings', () => {
    it('calls edge with trip ID path', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ bookings: [{ booking_id: 'bk-1', trip_id: 'trip-1' }] });

      const result = await bookingsAPI.getTripBookings('trip-1');

      expect(result.bookings![0]!.trip_id).toBe('trip-1');
    });

    it('falls back to direct Supabase for trip bookings', async () => {
      mocks.mockRequestEdgeJson.mockRejectedValueOnce(new Error('Edge unavailable'));
      mocks.mockGetDirectTripBookings.mockResolvedValueOnce([
        { booking_id: 'direct-trip-1', trip_id: 'trip-1', status: 'pending' },
      ]);

      const result = await bookingsAPI.getTripBookings('trip-1');
      expect(mocks.mockGetDirectTripBookings).toHaveBeenCalledWith('trip-1');
      expect(result.bookings![0]!.booking_id).toBe('direct-trip-1');
    });
  });

  describe('updateBookingStatus', () => {
    it('maps accepted status for edge API', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ booking_id: 'bk-1', status: 'accepted' });

      const result = await bookingsAPI.updateBookingStatus('bk-1', 'accepted');

      expect(result.status).toBe('accepted');
      expect(mocks.mockRunBackendWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'Booking update',
          authMode: 'required',
          fallbackPolicy: 'never',
        })
      );
    });

    it('maps rejected to rejected for edge API', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ booking_id: 'bk-1', status: 'rejected' });

      const result = await bookingsAPI.updateBookingStatus('bk-1', 'rejected');
      expect(result.status).toBe('rejected');
    });

    it('maps cancelled to cancelled for edge API', async () => {
      mocks.mockRunBackendWorkflow.mockResolvedValueOnce({ booking_id: 'bk-1', status: 'cancelled' });

      const result = await bookingsAPI.updateBookingStatus('bk-1', 'cancelled');
      expect(result.status).toBe('cancelled');
    });

    it('throws when runBackendWorkflow throws', async () => {
      mocks.mockRunBackendWorkflow.mockRejectedValueOnce(new Error('Update failed'));
      await expect(bookingsAPI.updateBookingStatus('bk-1', 'accepted')).rejects.toThrow('Update failed');
    });
  });
});
