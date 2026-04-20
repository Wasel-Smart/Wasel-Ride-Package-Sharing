/**
 * Integration Test Utilities
 * Provides test helpers for integration testing critical user flows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Mock API response helper
 */
export function createMockApiResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mock API error response
 */
export function createMockApiError(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Setup mock fetch for tests
 */
export function setupMockFetch(): void {
  global.fetch = vi.fn();
}

/**
 * Reset all mocks after test
 */
export function resetMocks(): void {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * Test data factory - creates realistic test data
 */
export const testDataFactory = {
  user: () => ({
    id: 'test-user-123',
    email: 'test@example.com',
    phone: '+966501234567',
    name: 'Test User',
    createdAt: new Date().toISOString(),
  }),

  booking: () => ({
    id: 'booking-123',
    userId: 'test-user-123',
    status: 'confirmed',
    tripDate: new Date(Date.now() + 86400000).toISOString(),
    startLocation: { lat: 31.9454, lng: 35.9284 },
    endLocation: { lat: 31.8974, lng: 35.9010 },
    passengers: 1,
    totalPrice: 50,
    currency: 'SAR',
  }),

  payment: () => ({
    id: 'payment-123',
    bookingId: 'booking-123',
    amount: 50,
    currency: 'SAR',
    status: 'completed',
    method: 'card',
    stripePaymentIntentId: 'pi_test123',
    createdAt: new Date().toISOString(),
  }),

  trip: () => ({
    id: 'trip-123',
    driverId: 'driver-123',
    startLocation: { lat: 31.9454, lng: 35.9284 },
    endLocation: { lat: 31.8974, lng: 35.9010 },
    status: 'completed',
    distance: 5.2,
    duration: 1200,
    price: 45,
  }),

  auth: {
    mockToken: () => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: 'test-user-123', exp: Math.floor(Date.now() / 1000) + 3600 }))}.mock`,
    mockAuthSession: () => ({
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: new Date().toISOString(),
      },
      session: {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      },
    }),
  },
};

/**
 * Wait for async operations in tests
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test wrapper for checking error handling
 */
export function expectErrorHandling(testFn: () => Promise<void> | void): {
  throws: (ErrorType: any, message?: string) => Promise<void>;
  catches: (message: string) => Promise<void>;
} {
  return {
    async throws(ErrorType: any, message?: string) {
      try {
        await testFn();
        expect.fail(`Expected ${ErrorType.name} to be thrown`);
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorType);
        if (message && error instanceof Error) {
          expect(error.message).toContain(message);
        }
      }
    },
    async catches(message: string) {
      try {
        await testFn();
        expect.fail(`Expected error with message containing "${message}"`);
      } catch (error) {
        expect(error).toBeDefined();
        if (error instanceof Error) {
          expect(error.message).toContain(message);
        }
      }
    },
  };
}

/**
 * Integration test structure helper
 */
export function integrationTest(
  name: string,
  testFn: () => Promise<void> | void,
) {
  describe(`Integration: ${name}`, () => {
    beforeEach(() => {
      setupMockFetch();
    });

    afterEach(() => {
      resetMocks();
    });

    it(name, async () => {
      await testFn();
    });
  });
}
