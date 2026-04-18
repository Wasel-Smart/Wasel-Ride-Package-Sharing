import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JORDAN_LOCATION_OPTIONS } from '../../../src/utils/jordanLocations';

const mockSearchTrips = vi.fn();
const mockCreateRideBooking = vi.fn();
const mockGetRideBookings = vi.fn();
const mockHydrateRideBookings = vi.fn();
const mockTransitionRide = vi.fn();
const mockMatchDriver = vi.fn();

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

function makeConnectedRide(id: string, from: string, to: string) {
  return {
    id,
    ownerId: 'owner-1',
    ownerPhone: '+962790000001',
    ownerEmail: 'driver@wasel.jo',
    from,
    to,
    date: futureDate(),
    time: '09:00',
    seats: 3,
    price: 7,
    gender: 'mixed',
    prayer: false,
    carModel: 'Toyota Camry',
    note: 'Live ride',
    acceptsPackages: true,
    packageCapacity: 'medium',
    packageNote: 'Small parcels only',
    createdAt: `${futureDate()}T08:00:00.000Z`,
    status: 'active',
  };
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
  });

  it('reads connected ride inventory live on every search instead of snapshotting it', async () => {
    connectedRides = [makeConnectedRide('connected-1', 'Amman', 'Zarqa')];

    const first = await rideService.searchRides({
      from: 'Amman',
      to: 'Zarqa',
      seats: 1,
    });

    expect(first.map(ride => ride.id)).toContain('live-connected-1');

    connectedRides = [makeConnectedRide('connected-2', 'Amman', 'Zarqa')];

    const second = await rideService.searchRides({
      from: 'Amman',
      to: 'Zarqa',
      seats: 1,
    });

    expect(second.map(ride => ride.id)).toContain('live-connected-2');
    expect(second.map(ride => ride.id)).not.toContain('live-connected-1');
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
});
