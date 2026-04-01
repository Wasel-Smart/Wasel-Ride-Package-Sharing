import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRideBooking,
  getBookingsForDriver,
  getRideBookings,
  syncRideBookingCompletion,
  updateRideBooking,
} from '../../../src/services/rideLifecycle';
import type { PostedRide } from '../../../src/services/journeyLogistics';

describe('rideLifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates pending requests for live posts and confirmed bookings for network inventory', () => {
    const live = createRideBooking({
      rideId: 'ride-1',
      ownerId: 'driver-1',
      from: 'Amman',
      to: 'Irbid',
      date: '2099-05-10',
      time: '08:00',
      driverName: 'Captain Lina',
      passengerName: 'Maya',
      routeMode: 'live_post',
    });
    const network = createRideBooking({
      rideId: 'ride-2',
      from: 'Amman',
      to: 'Aqaba',
      date: '2099-05-10',
      time: '09:00',
      driverName: 'Captain Omar',
      passengerName: 'Maya',
      routeMode: 'network_inventory',
    });

    expect(live.status).toBe('pending_driver');
    expect(network.status).toBe('confirmed');
    expect(network.ticketCode).toMatch(/^RIDE-\d{6}$/);
  });

  it('filters pending requests for a driver from owned rides', () => {
    createRideBooking({
      rideId: 'ride-1',
      ownerId: 'driver-1',
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

  it('can update and complete bookings', () => {
    const booking = createRideBooking({
      rideId: 'ride-3',
      from: 'Amman',
      to: 'Jerash',
      date: '2020-05-10',
      time: '08:00',
      driverName: 'Captain Rana',
      passengerName: 'Maya',
      routeMode: 'network_inventory',
    });

    const updated = updateRideBooking(booking.id, { supportThreadOpen: true });
    expect(updated?.supportThreadOpen).toBe(true);

    const synced = syncRideBookingCompletion(new Date('2021-05-10T09:00:00Z').getTime());
    expect(synced[0].status).toBe('completed');
    expect(synced[0].paymentStatus).toBe('captured');
    expect(getRideBookings()).toHaveLength(1);
  });
});
