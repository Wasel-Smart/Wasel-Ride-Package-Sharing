/**
 * Integration test: Auth + Ride Booking Flow
 * Tests the integration between authentication and ride booking
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedAuthService } from '@/services/unifiedAuth';
import { unifiedRideService } from '@/services/unifiedRide';

// Mock Supabase
vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/services/trips', () => ({
  tripsAPI: {
    searchTrips: vi.fn(),
    createTrip: vi.fn(),
  },
}));

vi.mock('@/services/bookings', () => ({
  bookingsAPI: {
    createBooking: vi.fn(),
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
    authEvent: vi.fn(),
    rideEvent: vi.fn(),
    error: vi.fn(),
  },
  setCorrelationId: vi.fn(),
}));

import { supabase } from '@/utils/supabase/client';
import { tripsAPI } from '@/services/trips';
import { createRideBooking } from '@/services/rideLifecycle';

describe('Integration: Auth + Ride Booking', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSession = {
    access_token: 'token-123',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full flow: login -> search -> book', async () => {
    // Step 1: User logs in
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    } as any);

    const authResult = await unifiedAuthService.signInWithEmail(
      'test@example.com',
      'password123'
    );

    expect(authResult.success).toBe(true);
    expect(authResult.user?.id).toBe('user-123');

    // Step 2: User searches for rides
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

    const searchResult = await unifiedRideService.searchRides({
      from: 'Amman',
      to: 'Aqaba',
      date: '2024-01-15',
    });

    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toHaveLength(1);

    // Step 3: User books a ride
    const mockBooking = {
      id: 'booking-1',
      rideId: 'ride-1',
      status: 'confirmed' as const,
      from: 'Amman',
      to: 'Aqaba',
      date: '2024-01-15',
      time: '08:00',
      driverName: 'Ahmad',
      passengerName: 'Test User',
      seatsRequested: 2,
      paymentStatus: 'authorized' as const,
      routeMode: 'network_inventory' as const,
      supportThreadOpen: false,
      ticketCode: 'RIDE-123456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(createRideBooking).mockReturnValue(mockBooking);

    const bookingResult = await unifiedRideService.bookRide({
      rideId: 'ride-1',
      passengerId: 'user-123',
      passengerName: 'Test User',
      seatsRequested: 2,
      from: 'Amman',
      to: 'Aqaba',
      date: '2024-01-15',
      time: '08:00',
      driverName: 'Ahmad',
      pricePerSeat: 15,
    });

    expect(bookingResult.success).toBe(true);
    expect(bookingResult.data?.status).toBe('confirmed');
    expect(bookingResult.data?.ticketCode).toBeTruthy();
  });

  it('prevents booking without authentication', async () => {
    vi.mocked(createRideBooking).mockImplementation(() => {
      throw new Error('Not authenticated');
    });

    const bookingResult = await unifiedRideService.bookRide({
      rideId: 'ride-1',
      passengerId: '',
      passengerName: 'Test User',
      seatsRequested: 2,
      from: 'Amman',
      to: 'Aqaba',
      date: '2024-01-15',
      time: '08:00',
      driverName: 'Ahmad',
      pricePerSeat: 15,
    });

    expect(bookingResult.success).toBe(false);
    expect(bookingResult.error).toContain('authenticated');
  });

  it('handles session expiry during booking', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    } as any);

    const sessionResult = await unifiedAuthService.getSession();
    expect(sessionResult.session).toBeTruthy();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    const expiredSessionResult = await unifiedAuthService.getSession();
    expect(expiredSessionResult.session).toBeNull();

    vi.mocked(createRideBooking).mockImplementation(() => {
      throw new Error('Session expired');
    });

    const bookingResult = await unifiedRideService.bookRide({
      rideId: 'ride-1',
      passengerId: 'user-123',
      passengerName: 'Test User',
      seatsRequested: 2,
      from: 'Amman',
      to: 'Aqaba',
      date: '2024-01-15',
      time: '08:00',
      driverName: 'Ahmad',
      pricePerSeat: 15,
    });

    expect(bookingResult.success).toBe(false);
  });
});
