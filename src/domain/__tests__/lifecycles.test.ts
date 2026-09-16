import { describe, it, expect } from 'vitest';
import { RIDE_LIFECYCLE_TRANSITIONS, mapBookingStatusToRideLifecycleState, mapRideLifecycleStateToBookingStatus } from '../rides/lifecycle';
import { PACKAGE_LIFECYCLE_TRANSITIONS, mapLegacyPackageStatusToLifecycle, canProjectPackageLifecycle } from '../packages/lifecycle';
import { DRIVER_AVAILABILITY_TRANSITIONS, canTransitionDriverAvailability } from '../drivers/availability';

describe('Ride Lifecycle', () => {
  it('has correct valid transitions', () => {
    expect(RIDE_LIFECYCLE_TRANSITIONS.requested).toContain('matched');
    expect(RIDE_LIFECYCLE_TRANSITIONS.requested).toContain('cancelled');
    expect(RIDE_LIFECYCLE_TRANSITIONS.matched).toContain('accepted');
    expect(RIDE_LIFECYCLE_TRANSITIONS.matched).toContain('cancelled');
    expect(RIDE_LIFECYCLE_TRANSITIONS.accepted).toContain('in_progress');
    expect(RIDE_LIFECYCLE_TRANSITIONS.in_progress).toContain('completed');
    expect(RIDE_LIFECYCLE_TRANSITIONS.completed).toEqual([]);
    expect(RIDE_LIFECYCLE_TRANSITIONS.cancelled).toEqual([]);
  });

  it('maps legacy statuses correctly', () => {
    expect(mapBookingStatusToRideLifecycleState('pending_driver')).toBe('requested');
    expect(mapBookingStatusToRideLifecycleState('confirmed')).toBe('accepted');
    expect(mapBookingStatusToRideLifecycleState('completed')).toBe('completed');
    expect(mapBookingStatusToRideLifecycleState('cancelled')).toBe('cancelled');
    expect(mapBookingStatusToRideLifecycleState('rejected')).toBe('cancelled');
    expect(mapBookingStatusToRideLifecycleState('unknown')).toBe('requested');
  });

  it('maps lifecycle states back to legacy statuses', () => {
    expect(mapRideLifecycleStateToBookingStatus('requested')).toBe('pending_driver');
    expect(mapRideLifecycleStateToBookingStatus('accepted')).toBe('confirmed');
    expect(mapRideLifecycleStateToBookingStatus('completed')).toBe('completed');
    expect(mapRideLifecycleStateToBookingStatus('cancelled')).toBe('cancelled');
  });
});

describe('Package Lifecycle', () => {
  it('has correct valid transitions', () => {
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.created).toContain('assigned');
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.created).toContain('cancelled');
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.assigned).toContain('picked_up');
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.picked_up).toContain('in_transit');
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.in_transit).toContain('delivered');
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.delivered).toEqual([]);
    expect(PACKAGE_LIFECYCLE_TRANSITIONS.cancelled).toEqual([]);
  });

  it('maps legacy statuses correctly', () => {
    expect(mapLegacyPackageStatusToLifecycle('created')).toBe('created');
    expect(mapLegacyPackageStatusToLifecycle('matched')).toBe('assigned');
    expect(mapLegacyPackageStatusToLifecycle('pickup_scheduled')).toBe('assigned');
    expect(mapLegacyPackageStatusToLifecycle('picked_up')).toBe('picked_up');
    expect(mapLegacyPackageStatusToLifecycle('in_transit')).toBe('in_transit');
    expect(mapLegacyPackageStatusToLifecycle('near_destination')).toBe('in_transit');
    expect(mapLegacyPackageStatusToLifecycle('delivered')).toBe('delivered');
    expect(mapLegacyPackageStatusToLifecycle('cancelled')).toBe('cancelled');
    expect(mapLegacyPackageStatusToLifecycle('disputed')).toBe('cancelled');
    expect(mapLegacyPackageStatusToLifecycle('unknown')).toBe('created');
  });

  it('canProjectPackageLifecycle returns true for valid transitions', () => {
    expect(canProjectPackageLifecycle('created', 'assigned')).toBe(true);
    expect(canProjectPackageLifecycle('created', 'cancelled')).toBe(true);
    expect(canProjectPackageLifecycle('delivered', 'cancelled')).toBe(true);
  });

  it('canProjectPackageLifecycle returns false for invalid transitions', () => {
    expect(canProjectPackageLifecycle('assigned', 'delivered')).toBe(false);
    expect(canProjectPackageLifecycle('created', 'delivered')).toBe(false);
  });
});

describe('Driver Availability', () => {
  it('has correct valid transitions', () => {
    expect(DRIVER_AVAILABILITY_TRANSITIONS.offline).toContain('available');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.available).toContain('reserved');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.available).toContain('offline');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.reserved).toContain('on_trip');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.reserved).toContain('available');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.reserved).toContain('offline');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.on_trip).toContain('cooldown');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.cooldown).toContain('available');
    expect(DRIVER_AVAILABILITY_TRANSITIONS.cooldown).toContain('offline');
  });

  it('canTransitionDriverAvailability returns correct values', () => {
    expect(canTransitionDriverAvailability('offline', 'available')).toBe(true);
    expect(canTransitionDriverAvailability('available', 'offline')).toBe(true);
    expect(canTransitionDriverAvailability('offline', 'on_trip')).toBe(false);
    expect(canTransitionDriverAvailability('on_trip', 'available')).toBe(false);
    expect(canTransitionDriverAvailability('cooldown', 'available')).toBe(true);
  });
});