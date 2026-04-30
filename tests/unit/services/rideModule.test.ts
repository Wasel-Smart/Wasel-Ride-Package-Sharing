import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JORDAN_LOCATION_OPTIONS } from '../../../src/utils/jordanLocations';

const mockSearchTrips = vi.fn();
const mockCreateRideBooking = vi.fn();
const mockGetRideBookings = vi.fn();
const mockHydrateRideBookings = vi.fn();
const mockTransitionRide = vi.fn();
const mockMatchDriver = vi.fn();
const mockOptimizeRideFlow = vi.fn();

let connectedRides: Array<Record<string, unknown>> = [];

vi.mock('../../../src/services/trips', () => ({
  tripsAPI: {
    searchTrips: (...args: unknown[]) => mockSearchTrips(...args),
  },
}));

vi.mock('../../../src/services/journeyLogistics', () => ({
  getConnectedRides: () => connectedRides,
}));

vi.mock('../../../src/services/rideLifecycle', () => ({
  createRideBooking: (...args: unknown[]) => mockCreateRideBooking(...args),
  getRideBookings: () => mockGetRideBookings(),
  hydrateRideBookings: (...args: unknown[]) => mockHydrateRideBookings(...args),
}));

vi.mock('../../../src/services/rideStateMachine', () => ({
  transitionRide: (...args: unknown[]) => mockTransitionRide(...args),
}));

vi.mock('../../../src/services/rideOptimization', () => ({
  optimizeRideFlow: (...args: unknown[]) => mockOptimizeRideFlow(...args),
}));

vi.mock('../../../src/modules/rides/ride.queue', () => ({
  rideQueue: {
    matchDriver: (...args: unknown[]) => mockMatchDriver(...args),
  },
}));

import { rideService } from '../../../src/modules/rides/ride.service';

function futureDate(days = 1) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function makeBooking(id: string, rideId: string, updatedAt: string) {
  return {
    id,
    rideId,
    from: 'Amman',
    to: 'Aqaba',
    date: futureDate(),
    time: '09:00',
    driverName: 'Wasel Captain',
    passengerName: 'Passenger',
    seatsRequested: 1,
    status: 'pending_driver',
    paymentStatus: 'pending',
    routeMode: 'live_post',
    supportThreadOpen: false,
    ticketCode: 'RIDE-123456',
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('ride module service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedRides = [];
    window.localStorage.clear();
    mockSearchTrips.mockResolvedValue([]);
    mockGetRideBookings.mockReturnValue([]);
    mockHydrateRideBookings.mockResolvedValue([]);
    mockTransitionRide.mockResolvedValue(undefined);
    mockMatchDriver.mockResolvedValue('job-1');
    mockOptimizeRideFlow.mockReturnValue({
      optimized_matches: [],
      dynamic_prices: [],
      system_alerts: [],
      completed_rides: [],
    });
  });

  it('uses backend trip search results instead of local ride inventory fallbacks', async () => {
    mockSearchTrips.mockResolvedValue([
      {
        id: 'trip-1',
        from: 'Amman',
        to: 'Zarqa',
        date: futureDate(),
        time: '09:00',
        seats: 2,
        price: 8,
        driver: { id: 'driver-1', name: 'Driver 1', rating: 4.8, verified: true },
      },
    ]);

    const results = await rideService.searchRides({
      from: 'Amman',
      to: 'Zarqa',
      seats: 1,
    });

    expect(results.map(ride => ride.id)).toEqual(['trip-1']);
    expect(mockSearchTrips).toHaveBeenCalledWith('Amman', 'Zarqa', undefined, 1);
  });

  it('falls back to the local Wasel ride catalog when backend search is unavailable', async () => {
    connectedRides = [];
    mockSearchTrips.mockRejectedValueOnce(new Error('search offline'));

    const results = await rideService.searchRides({
      from: 'Amman',
      to: 'Aqaba',
      seats: 1,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(ride => ride.id === 'r1')).toBe(true);
  });

  it('surfaces recent searches in suggestions instead of relying on static substring matches only', async () => {
    const uncommonLocation = JORDAN_LOCATION_OPTIONS[JORDAN_LOCATION_OPTIONS.length - 1]!;
    rideService.rememberRecentSearch('Amman', uncommonLocation);

    const suggestions = await rideService.getLocationSuggestions('', {
      field: 'to',
      counterpart: 'Amman',
    });

    expect(suggestions.map(suggestion => suggestion.value)).toContain(uncommonLocation);
  });

  it('fails the request flow when driver matching cannot be queued', async () => {
    mockCreateRideBooking.mockResolvedValue(
      makeBooking('booking-1', 'ride-1', `${futureDate()}T08:00:00.000Z`),
    );
    mockMatchDriver.mockRejectedValue(new Error('queue unavailable'));

    await expect(
      rideService.createRideRequest({
        ride: {
          id: 'ride-1',
          from: 'Amman',
          to: 'Aqaba',
          date: futureDate(),
          time: '09:00',
          seatsAvailable: 2,
          pricePerSeat: 8,
          driver: { id: 'driver-1', name: 'Driver', rating: 4.9, verified: true },
          routeMode: 'live_post',
          vehicleType: 'Sedan',
          etaMinutes: 25,
          estimatedArrivalLabel: '25 min ETA',
          rideType: 'economy',
        },
        passengerId: 'user-1',
        passengerName: 'Passenger',
      }),
    ).rejects.toThrow('queue unavailable');

    expect(mockTransitionRide).not.toHaveBeenCalled();
  });

  it('hydrates persisted requests into an indexed map keyed by ride id', async () => {
    mockGetRideBookings.mockReturnValue([
      makeBooking('booking-old', 'ride-1', '2026-04-17T08:00:00.000Z'),
      makeBooking('booking-new', 'ride-1', '2026-04-18T08:00:00.000Z'),
    ]);

    const indexed = await rideService.hydrateRideRequests('user-1', ['ride-1']);

    expect(mockHydrateRideBookings).toHaveBeenCalledWith('user-1', connectedRides);
    expect(indexed['ride-1']?.id).toBe('booking-new');
  });

  it('exposes ride flow optimization through the ride service surface', () => {
    const input = {
      real_time_driver_locations: [],
      active_ride_requests: [],
      historical_demand_data: [],
      system_health_metrics: {},
    };
    const options = { latency_target_ms: 180 };

    const result = rideService.optimizeRideFlow(input, options);

    expect(mockOptimizeRideFlow).toHaveBeenCalledWith(input, options);
    expect(result).toEqual({
      optimized_matches: [],
      dynamic_prices: [],
      system_alerts: [],
      completed_rides: [],
    });
  });
});
