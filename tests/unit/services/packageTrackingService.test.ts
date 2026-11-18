import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../../src/utils/errors';
import { packageTrackingService } from '../../../src/services/packageTrackingService';

describe('packageTrackingService', () => {
  beforeEach(() => {
    localStorage.clear();
    packageTrackingService.resetForTesting();
  });

  it('never represents browser-local payment as verified escrow or releases funds', async () => {
    const pkg = await packageTrackingService.createPackage({
      senderId: 'sender-1',
      from: 'Amman',
      to: 'Aqaba',
      size: 'medium',
      value: 25,
      insurance: true,
    });

    await packageTrackingService.linkPackageToRide(pkg.id, {
      rideId: 'ride-1',
      driverId: 'driver-1',
      driverName: 'Wasel Captain',
      driverPhone: '+962790000000',
    });

    await expect(packageTrackingService.processPayment(pkg.id, 'wallet')).rejects.toThrow(
      'server-verified payment provider',
    );
    expect(packageTrackingService.getPackage(pkg.id)?.paymentStatus).toBe('pending');
    expect(packageTrackingService.getEscrowStatus(pkg.id)).toBeUndefined();
    expect(packageTrackingService.getPackageTimeline(pkg.id).map((event) => event.type)).toEqual([
      'created',
      'linked_to_ride',
    ]);
  });

  it('fails closed when trying to escrow payment before linking a ride', async () => {
    const pkg = await packageTrackingService.createPackage({
      senderId: 'sender-1',
      from: 'Amman',
      to: 'Aqaba',
      size: 'small',
      value: 10,
      insurance: false,
    });

    await expect(packageTrackingService.processPayment(pkg.id, 'wallet')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('fails closed when trying to update package location before pickup', async () => {
    const pkg = await packageTrackingService.createPackage({
      senderId: 'sender-1',
      from: 'Amman',
      to: 'Aqaba',
      size: 'small',
      value: 10,
      insurance: false,
    });

    await packageTrackingService.linkPackageToRide(pkg.id, {
      rideId: 'ride-1',
      driverId: 'driver-1',
      driverName: 'Wasel Captain',
      driverPhone: '+962790000000',
    });
    await expect(
      packageTrackingService.updateLocation(pkg.id, { lat: 31.95, lng: 35.91 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
