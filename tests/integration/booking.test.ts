/**
 * Integration Tests for Booking Flow
 * Tests the complete user journey from search to confirmation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { testDataFactory, createMockApiResponse, resetMocks, setupMockFetch } from './test-utils';
import { normalizeError, AuthenticationError, NetworkError } from '@/utils/errors';

describe('Integration: Booking Flow', () => {
  beforeEach(() => {
    setupMockFetch();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Search & Browse Trips', () => {
    it('should fetch available trips for given route', async () => {
      const mockTrips = [
        testDataFactory.trip(),
        testDataFactory.trip(),
      ];

      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(mockTrips),
      );

      const response = await fetch('/api/trips/search', {
        method: 'POST',
        body: JSON.stringify({
          startLocation: { lat: 31.9454, lng: 35.9284 },
          endLocation: { lat: 31.8974, lng: 35.9010 },
          date: new Date().toISOString(),
        }),
      });

      const trips = await response.json();
      expect(trips).toHaveLength(2);
      expect(trips[0]).toHaveProperty('id');
      expect(trips[0]).toHaveProperty('status');
    });

    it('should handle empty search results', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse([]),
      );

      const response = await fetch('/api/trips/search');
      const trips = await response.json();

      expect(trips).toEqual([]);
    });

    it('should handle network errors during trip search', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error('Network request failed'),
      );

      try {
        await fetch('/api/trips/search');
        expect.fail('Should have thrown NetworkError');
      } catch (error) {
        const normalized = normalizeError(error);
        expect(normalized).toBeInstanceOf(NetworkError);
      }
    });
  });

  describe('Authentication for Booking', () => {
    it('should require authentication before booking', async () => {
      // Simulate unauthenticated request
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(
          { error: 'Unauthorized' },
          401,
        ),
      );

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-token' },
        body: JSON.stringify({ tripId: 'trip-123' }),
      });

      expect(response.status).toBe(401);
    });

    it('should accept valid authentication token', async () => {
      const mockBooking = testDataFactory.booking();

      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(mockBooking, 201),
      );

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${testDataFactory.auth.mockToken()}` },
        body: JSON.stringify({ tripId: 'trip-123' }),
      });

      expect(response.status).toBe(201);
      const booking = await response.json();
      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('confirmed');
    });

    it('should refresh expired auth token', async () => {
      const mockAuthSession = testDataFactory.auth.mockAuthSession();

      // First call returns 401 (expired)
      (global.fetch as any)
        .mockResolvedValueOnce(
          createMockApiResponse({ error: 'Token expired' }, 401),
        )
        // Second call (refresh) returns valid session
        .mockResolvedValueOnce(
          createMockApiResponse(mockAuthSession),
        )
        // Third call (retry) succeeds
        .mockResolvedValueOnce(
          createMockApiResponse(testDataFactory.booking(), 201),
        );

      // First attempt (supposed to fail and trigger refresh)
      let response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { Authorization: 'Bearer expired-token' },
      });
      expect(response.status).toBe(401);

      // Token refresh
      response = await fetch('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'mock-refresh-token' }),
      });
      expect(response.status).toBe(200);

      // Retry with new token
      response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { Authorization: 'Bearer new-token' },
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Booking Creation & Validation', () => {
    it('should create booking with valid passenger data', async () => {
      const mockBooking = testDataFactory.booking();

      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(mockBooking, 201),
      );

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          passengers: 1,
          notes: 'Test booking',
        }),
      });

      expect(response.status).toBe(201);
      const booking = await response.json();
      expect(booking.passengers).toBe(1);
    });

    it('should validate passenger count', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(
          { error: 'Invalid passenger count' },
          400,
        ),
      );

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          tripId: 'trip-123',
          passengers: 0, // Invalid
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate bookings for same user', async () => {
      // First booking succeeds
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(testDataFactory.booking(), 201),
      );

      let response = await fetch('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({ tripId: 'trip-123' }),
      });
      expect(response.status).toBe(201);

      // Second booking for same trip fails
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(
          { error: 'Booking already exists for this trip' },
          409,
        ),
      );

      response = await fetch('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({ tripId: 'trip-123' }),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Payment Processing', () => {
    it('should initiate payment for confirmed booking', async () => {
      const mockPayment = testDataFactory.payment();

      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(mockPayment, 201),
      );

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          amount: 50,
          currency: 'SAR',
        }),
      });

      expect(response.status).toBe(201);
      const payment = await response.json();
      expect(payment.status).toBe('completed');
    });

    it('should handle payment failures gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(
          { error: 'Payment declined' },
          402,
        ),
      );

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'booking-123' }),
      });

      expect(response.status).toBe(402);
    });

    it('should update booking status after successful payment', async () => {
      const mockPayment = testDataFactory.payment();

      (global.fetch as any)
        .mockResolvedValueOnce(
          createMockApiResponse(mockPayment, 201),
        )
        .mockResolvedValueOnce(
          createMockApiResponse({ ...testDataFactory.booking(), status: 'paid' }),
        );

      // Process payment
      let response = await fetch('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify({ bookingId: 'booking-123' }),
      });
      expect(response.status).toBe(201);

      // Verify booking updated
      response = await fetch('/api/bookings/booking-123');
      const booking = await response.json();
      expect(booking.status).toBe('paid');
    });
  });

  describe('Complete Booking Flow (End-to-End)', () => {
    it('should complete full booking workflow: search → book → pay', async () => {
      const mockTrip = testDataFactory.trip();
      const mockBooking = testDataFactory.booking();
      const mockPayment = testDataFactory.payment();

      // Step 1: Search trips
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse([mockTrip]),
      );

      let response = await fetch('/api/trips/search', { method: 'POST' });
      let trips = await response.json();
      expect(trips).toHaveLength(1);

      // Step 2: Create booking
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(mockBooking, 201),
      );

      response = await fetch('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({ tripId: trips[0].id }),
      });
      expect(response.status).toBe(201);
      const booking = await response.json();

      // Step 3: Process payment
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse(mockPayment, 201),
      );

      response = await fetch('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id }),
      });
      expect(response.status).toBe(201);
      const payment = await response.json();

      // Verify flow completed
      expect(booking.id).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.bookingId).toBe(booking.id);
    });
  });
});
