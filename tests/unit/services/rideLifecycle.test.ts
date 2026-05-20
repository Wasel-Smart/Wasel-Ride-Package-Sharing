import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateDirectBooking = vi.fn();
const mockGetDirectDriverBookings = vi.fn();
const mockGetDirectUserBookings = vi.fn();
const mockUpdateDirectBookingStatus = vi.fn();

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectBooking: (...args: unknown[]) => mockCreateDirectBooking(...args),
  getDirectDriverBookings: (...args: unknown[]) => mockGetDirectDriverBookings(...args),
  getDirectUserBookings: (...args: unknown[]) => mockGetDirectUserBookings(...args),
  updateDirectBookingStatus: (...args: unknown[]) => mockUpdateDirectBookingStatus(...args),
}));

vi.mock('../../../src/services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(async () => undefined),
}));

import {
  clearRideBookingsCache,
  createRideBooking,
  getBookingsForDriver,
  getRideBookings,
  syncRideBookingCompletion,
  updateRideBooking,
} from '../../../src/services/rideLifecycle';
import type { PostedRide } from '../../../src/services/journeyLogistics';

describe('rideLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRideBookingsCache();
    mockCreateDirectBooking.mockImplementation(async (input: {
      tripId: string;
      seatsRequested: number;
      bookingStatus?: string;
      pickup?: string;
      dropoff?: string;
    }) => ({
      booking: {
        booking_id: `backend-${input.tripId}`,
        id: `backend-${input.tripId}`,
        status: input.bookingStatus ?? 'confirmed',
        trip_id: input.tripId,
        pickup_location: input.pickup ?? null,
        dropoff_location: input.dropoff ?? null,
        seats_requested: input.seatsRequested,
      },
    }));
    mockGetDirectDriverBookings.mockResolvedValue([]);
    mockGetDirectUserBookings.mockResolvedValue([]);
    mockUpdateDirectBookingStatus.mockResolvedValue(undefined);
  });

  it('creates pending requests for live posts and confirmed bookings for network inventory', async () => {
    const live = await createRideBooking({
      rideId: 'ride-1',
      ownerId: 'driver-1',
      passengerId: 'passenger-1',
      from: 'Amman',
      to: 'Irbid',
      date: '2099-05-10',
      time: '08:00',
      driverName: 'Captain Lina',
      passengerName: 'Maya',
      routeMode: 'live_post',
    });
    const network = await createRideBooking({
      rideId: 'ride-2',
      passengerId: 'passenger-1',
      from: 'Amman',
      to: 'Aqaba',
      date: '2099-05-10',
      time: '09:00',
      driverName: 'Captain Omar',
      passengerName: 'Maya',
      routeMode: 'network_inventory',
    });

    expect(live.status).toBe('pending_driver');
    expect(live.lifecycleStatus).toBe('requested');
    expect(network.status).toBe('confirmed');
    expect(network.lifecycleStatus).toBe('accepted');
    expect(network.ticketCode).toMatch(/^RIDE-\d{6}$/);
    expect(mockCreateDirectBooking).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tripId: 'ride-1',
        userId: 'passenger-1',
        bookingStatus: 'pending_driver',
      }),
    );
    expect(mockCreateDirectBooking).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tripId: 'ride-2',
        userId: 'passenger-1',
        bookingStatus: 'confirmed',
      }),
    );
  });

  it('filters pending requests for a driver from owned rides', async () => {
    await createRideBooking({
      rideId: 'ride-1',
      ownerId: 'driver-1',
      passengerId: 'passenger-1',
      from: 'Amman',
      to: 'Irbid',
      date: '2099-05-10',
      time: '08:00',
      driverName: 'Captain Lina',
      passengerName: 'Maya',
      routeMode: 'live_post',
    });

    const rides: PostedRide[] = [{
      id: 'ride-1',
      ownerId: 'driver-1',
      from: 'Amman',
      to: 'Irbid',
      date: '2099-05-10',
      time: '08:00',
      seats: 3,
      price: 4,
      gender: 'mixed',
      prayer: false,
      carModel: 'Toyota Camry',
      note: '',
      acceptsPackages: true,
      packageCapacity: 'medium',
      packageNote: '',
      createdAt: new Date().toISOString(),
      status: 'active',
    }];

    expect(getBookingsForDriver('driver-1', rides)).toHaveLength(1);
  });

  it('can update and complete bookings', async () => {
    const booking = await createRideBooking({
      rideId: 'ride-3',
      passengerId: 'passenger-1',
      from: 'Amman',
      to: 'Jerash',
      date: '2020-05-10',
      time: '08:00',
      driverName: 'Captain Rana',
      passengerName: 'Maya',
      routeMode: 'network_inventory',
    });

    const updated = await updateRideBooking(booking.id, { supportThreadOpen: true });
    expect(updated?.supportThreadOpen).toBe(true);

    const synced = syncRideBookingCompletion(new Date('2021-05-10T09:00:00Z').getTime());
    expect(synced[0].status).toBe('completed');
    expect(synced[0].lifecycleStatus).toBe('completed');
    expect(synced[0].paymentStatus).toBe('captured');
    expect(getRideBookings()).toHaveLength(1);
    expect(mockUpdateDirectBookingStatus).toHaveBeenCalledWith('backend-ride-3', 'completed');
  });
});
