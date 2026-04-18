/**
 * Unit tests for unified ride service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedRideService } from '@/services/unifiedRide';

// Mock dependencies
vi.mock('@/services/trips', () => ({
  tripsAPI: {
    searchTrips: vi.fn(),
    getTripById: vi.fn(),
    createTrip: vi.fn(),
    getDriverTrips: vi.fn(),
    deleteTrip: vi.fn(),
  },
}));

vi.mock('@/services/bookings', () => ({
  bookingsAPI: {
    createBooking: vi.fn(),
    updateBookingStatus: vi.fn(),
  },
}));

vi.mock('@/services/rideLifecycle', () => ({
  createRideBooking: vi.fn(),
  getRideBookings: vi.fn(),
  updateRideBooking: vi.fn(),
  hydrateRideBookings: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    rideEvent: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { tripsAPI } from '@/services/trips';
import { bookingsAPI } from '@/services/bookings';
import {
  createRideBooking,
  getRideBookings,
  updateRideBooking,
  hydrateRideBookings,
} from '@/services/rideLifecycle';

describe('UnifiedRideService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchRides', () => {
    it('returns rides matching search criteria', async () => {
      const mockRides = [
        {
          id: 'ride-1',
          from: 'Amman',
          to: 'Aqaba',
          date: '2024-01-15',
          time: '08:00',
          seats: 3,
          price: 15,
          driver: { id: 'driver-1', name: 'Ahmad', rating: 4.8, verified: true },
        },
      ];

      vi.mocked(tripsAPI.searchTrips).mockResolvedValue(mockRides);

      const result = await unifiedRideService.searchRides({
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRides);
      expect(tripsAPI.searchTrips).toHaveBeenCalledWith('Amman', 'Aqaba', '2024-01-15', undefined);
    });

    it('handles search errors gracefully', async () => {
      vi.mocked(tripsAPI.searchTrips).mockRejectedValue(new Error('Network error'));

      const result = await unifiedRideService.searchRides({
        from: 'Amman',
        to: 'Aqaba',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getRideById', () => {
    it('fetches ride details successfully', async () => {
      const mockRide = {
        id: 'ride-1',
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
        time: '08:00',
        seats: 3,
        price: 15,
        driver: { id: 'driver-1', name: 'Ahmad', rating: 4.8, verified: true },
      };

      vi.mocked(tripsAPI.getTripById).mockResolvedValue(mockRide);

      const result = await unifiedRideService.getRideById('ride-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRide);
    });

    it('handles fetch errors', async () => {
      vi.mocked(tripsAPI.getTripById).mockRejectedValue(new Error('Ride not found'));

      const result = await unifiedRideService.getRideById('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ride not found');
    });
  });

  describe('createRide', () => {
    it('creates a new ride successfully', async () => {
      const rideData = {
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
        time: '08:00',
        seats: 3,
        price: 15,
      };

      const mockCreatedRide = {
        id: 'ride-1',
        ...rideData,
        driver: { id: 'driver-1', name: 'Ahmad', rating: 4.8, verified: true },
      };

      vi.mocked(tripsAPI.createTrip).mockResolvedValue(mockCreatedRide);

      const result = await unifiedRideService.createRide(rideData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedRide);
    });

    it('handles creation errors', async () => {
      vi.mocked(tripsAPI.createTrip).mockRejectedValue(new Error('Invalid ride data'));

      const result = await unifiedRideService.createRide({
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
        time: '08:00',
        seats: 3,
        price: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid ride data');
    });
  });

  describe('bookRide', () => {
    it('books a ride successfully', async () => {
      const bookingParams = {
        rideId: 'ride-1',
        passengerId: 'user-1',
        passengerName: 'Sara',
        seatsRequested: 2,
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
        time: '08:00',
        driverName: 'Ahmad',
        pricePerSeat: 15,
      };

      const mockBooking = {
        id: 'booking-1',
        rideId: 'ride-1',
        status: 'confirmed' as const,
        ticketCode: 'RIDE-123456',
        ...bookingParams,
        paymentStatus: 'authorized' as const,
        routeMode: 'network_inventory' as const,
        supportThreadOpen: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(createRideBooking).mockReturnValue(mockBooking);
      vi.mocked(bookingsAPI.createBooking).mockResolvedValue({ booking: mockBooking });

      const result = await unifiedRideService.bookRide(bookingParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBooking);
      expect(createRideBooking).toHaveBeenCalled();
    });

    it('handles booking errors', async () => {
      vi.mocked(createRideBooking).mockImplementation(() => {
        throw new Error('Booking failed');
      });

      const result = await unifiedRideService.bookRide({
        rideId: 'ride-1',
        passengerId: 'user-1',
        passengerName: 'Sara',
        seatsRequested: 2,
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
        time: '08:00',
        driverName: 'Ahmad',
        pricePerSeat: 15,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking failed');
    });
  });

  describe('updateBookingStatus', () => {
    it('updates booking status successfully', async () => {
      const mockUpdatedBooking = {
        id: 'booking-1',
        status: 'confirmed' as const,
        rideId: 'ride-1',
        from: 'Amman',
        to: 'Aqaba',
        date: '2024-01-15',
        time: '08:00',
        driverName: 'Ahmad',
        passengerName: 'Sara',
        seatsRequested: 2,
        paymentStatus: 'authorized' as const,
        routeMode: 'network_inventory' as const,
        supportThreadOpen: false,
        ticketCode: 'RIDE-123456',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(updateRideBooking).mockReturnValue(mockUpdatedBooking);
      vi.mocked(bookingsAPI.updateBookingStatus).mockResolvedValue({ success: true });

      const result = await unifiedRideService.updateBookingStatus('booking-1', 'confirmed');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('confirmed');
    });

    it('handles update errors when booking not found', async () => {
      vi.mocked(updateRideBooking).mockReturnValue(null);

      const result = await unifiedRideService.updateBookingStatus('invalid-id', 'confirmed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });
  });

  describe('getUserBookings', () => {
    it('fetches and hydrates user bookings', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          rideId: 'ride-1',
          status: 'confirmed' as const,
          from: 'Amman',
          to: 'Aqaba',
          date: '2024-01-15',
          time: '08:00',
          driverName: 'Ahmad',
          passengerName: 'Sara',
          seatsRequested: 2,
          paymentStatus: 'authorized' as const,
          routeMode: 'network_inventory' as const,
          supportThreadOpen: false,
          ticketCode: 'RIDE-123456',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(hydrateRideBookings).mockResolvedValue(mockBookings);
      vi.mocked(getRideBookings).mockReturnValue(mockBookings);

      const result = await unifiedRideService.getUserBookings('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBookings);
      expect(hydrateRideBookings).toHaveBeenCalledWith('user-1');
    });

    it('handles fetch errors', async () => {
      vi.mocked(hydrateRideBookings).mockRejectedValue(new Error('Fetch failed'));

      const result = await unifiedRideService.getUserBookings('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch failed');
    });
  });

  describe('booking lifecycle methods', () => {
    const mockBooking = {
      id: 'booking-1',
      rideId: 'ride-1',
      status: 'confirmed' as const,
      from: 'Amman',
      to: 'Aqaba',
      date: '2024-01-15',
      time: '08:00',
      driverName: 'Ahmad',
      passengerName: 'Sara',
      seatsRequested: 2,
      paymentStatus: 'authorized' as const,
      routeMode: 'network_inventory' as const,
      supportThreadOpen: false,
      ticketCode: 'RIDE-123456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      vi.mocked(updateRideBooking).mockReturnValue(mockBooking);
      vi.mocked(bookingsAPI.updateBookingStatus).mockResolvedValue({ success: true });
    });

    it('cancels booking', async () => {
      const result = await unifiedRideService.cancelBooking('booking-1');
      expect(result.success).toBe(true);
      expect(updateRideBooking).toHaveBeenCalledWith('booking-1', { status: 'cancelled' });
    });

    it('confirms booking', async () => {
      const result = await unifiedRideService.confirmBooking('booking-1');
      expect(result.success).toBe(true);
      expect(updateRideBooking).toHaveBeenCalledWith('booking-1', { status: 'confirmed' });
    });

    it('rejects booking', async () => {
      const result = await unifiedRideService.rejectBooking('booking-1');
      expect(result.success).toBe(true);
      expect(updateRideBooking).toHaveBeenCalledWith('booking-1', { status: 'rejected' });
    });

    it('completes booking', async () => {
      const result = await unifiedRideService.completeBooking('booking-1');
      expect(result.success).toBe(true);
      expect(updateRideBooking).toHaveBeenCalledWith('booking-1', { status: 'completed' });
    });
  });

  describe('getDriverTrips', () => {
    it('fetches driver trips successfully', async () => {
      const mockTrips = [
        {
          id: 'ride-1',
          from: 'Amman',
          to: 'Aqaba',
          date: '2024-01-15',
          time: '08:00',
          seats: 3,
          price: 15,
          driver: { id: 'driver-1', name: 'Ahmad', rating: 4.8, verified: true },
        },
      ];

      vi.mocked(tripsAPI.getDriverTrips).mockResolvedValue(mockTrips);

      const result = await unifiedRideService.getDriverTrips();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrips);
    });
  });

  describe('deleteRide', () => {
    it('deletes ride successfully', async () => {
      vi.mocked(tripsAPI.deleteTrip).mockResolvedValue({ success: true });

      const result = await unifiedRideService.deleteRide('ride-1');

      expect(result.success).toBe(true);
      expect(tripsAPI.deleteTrip).toHaveBeenCalledWith('ride-1');
    });

    it('handles deletion errors', async () => {
      vi.mocked(tripsAPI.deleteTrip).mockRejectedValue(new Error('Delete failed'));

      const result = await unifiedRideService.deleteRide('ride-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});
