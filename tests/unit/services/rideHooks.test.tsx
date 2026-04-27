import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockValidateDraft = vi.fn();
const mockSearch = vi.fn();
const mockGetSuggestions = vi.fn();
const mockAutoDetectOrigin = vi.fn();
const mockHydrateRequests = vi.fn();
const mockGetRequestIndex = vi.fn();
const mockSubmitRideRequest = vi.fn();

vi.mock('../../../src/modules/rides/ride.controller', () => ({
  rideController: {
    validateDraft: (...args: unknown[]) => mockValidateDraft(...args),
    search: (...args: unknown[]) => mockSearch(...args),
    getSuggestions: (...args: unknown[]) => mockGetSuggestions(...args),
    autoDetectOrigin: (...args: unknown[]) => mockAutoDetectOrigin(...args),
    hydrateRequests: (...args: unknown[]) => mockHydrateRequests(...args),
    getRequestIndex: (...args: unknown[]) => mockGetRequestIndex(...args),
    submitRideRequest: (...args: unknown[]) => mockSubmitRideRequest(...args),
  },
}));

import { useRideSearch } from '../../../src/modules/rides/ride.hooks';

function makeRide(id: string) {
  return {
    id,
    from: 'Amman',
    to: 'Aqaba',
    date: '2026-04-20',
    time: '09:00',
    seatsAvailable: 2,
    pricePerSeat: 8,
    driver: { id: `driver-${id}`, name: 'Driver', rating: 4.8, verified: true },
    routeMode: 'live_post' as const,
    vehicleType: 'Sedan',
    etaMinutes: 24,
    estimatedArrivalLabel: '24 min ETA',
    rideType: 'economy' as const,
  };
}

describe('useRideSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateDraft.mockReturnValue({});
    mockSearch.mockResolvedValue({
      results: ['ride-1', 'ride-2', 'ride-3', 'ride-4', 'ride-5', 'ride-6'].map(makeRide),
      recommendedRideId: 'ride-1',
    });
    mockGetSuggestions.mockResolvedValue([]);
    mockAutoDetectOrigin.mockResolvedValue('Amman');
    mockHydrateRequests.mockResolvedValue({
      'ride-1': {
        id: 'booking-1',
        rideId: 'ride-1',
        from: 'Amman',
        to: 'Aqaba',
        date: '2026-04-20',
        time: '09:00',
        driverName: 'Driver',
        passengerName: 'Passenger',
        seatsRequested: 1,
        status: 'pending_driver',
        paymentStatus: 'pending',
        routeMode: 'live_post',
        supportThreadOpen: false,
        ticketCode: 'RIDE-123456',
        createdAt: '2026-04-18T08:00:00.000Z',
        updatedAt: '2026-04-18T08:00:00.000Z',
      },
    });
    mockGetRequestIndex.mockReturnValue({});
    mockSubmitRideRequest.mockResolvedValue({
      booking: {
        id: 'booking-2',
        rideId: 'ride-2',
        from: 'Amman',
        to: 'Aqaba',
        date: '2026-04-20',
        time: '09:00',
        driverName: 'Driver',
        passengerName: 'Passenger',
        seatsRequested: 1,
        status: 'pending_driver',
        paymentStatus: 'pending',
        routeMode: 'live_post',
        supportThreadOpen: false,
        ticketCode: 'RIDE-654321',
        createdAt: '2026-04-18T09:00:00.000Z',
        updatedAt: '2026-04-18T09:00:00.000Z',
      },
      queueJobId: 'job-1',
      lifecycleSynced: true,
    });
  });

  it('pages search results and hydrates persisted requests from the module layer', async () => {
    const { result } = renderHook(() =>
      useRideSearch({
        from: 'Amman',
        to: 'Aqaba',
        passengerId: 'user-1',
      }),
    );

    await act(async () => {
      const didSearch = await result.current.submitSearch();
      expect(didSearch).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.state.requestsByRideId['ride-1']).toBeDefined();
    });

    expect(result.current.visibleResults).toHaveLength(4);
    expect(result.current.hasMoreResults).toBe(true);

    act(() => {
      result.current.loadMoreResults();
    });

    expect(result.current.visibleResults).toHaveLength(6);
    expect(mockHydrateRequests).toHaveBeenCalled();
  });
});
