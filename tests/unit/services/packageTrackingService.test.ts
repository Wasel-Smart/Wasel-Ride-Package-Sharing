import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../../../src/utils/errors';
import { packageTrackingService } from '../../../src/services/packageTrackingService';

describe('packageTrackingService', () => {
  beforeEach(() => {
    localStorage.clear();
    packageTrackingService.resetForTesting();
  });

  it('creates an auditable timeline for package fulfillment', async () => {
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
    await packageTrackingService.processPayment(pkg.id, 'wallet');
    await packageTrackingService.verifyPickup(pkg.id, pkg.pickupVerificationCode, 'pickup.jpg');
    await packageTrackingService.updateLocation(pkg.id, { lat: 31.95, lng: 35.91 });
    const delivery = await packageTrackingService.verifyDelivery(
      pkg.id,
      pkg.deliveryVerificationCode,
      'delivery.jpg',
    );

    expect(delivery).toEqual({ verified: true, paymentReleased: true });
    expect(packageTrackingService.getPackageTimeline(pkg.id).map((event) => event.type)).toEqual([
      'created',
      'linked_to_ride',
      'payment_escrowed',
      'pickup_verified',
      'location_updated',
      'delivery_verified',
      'payment_released',
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
    await packageTrackingService.processPayment(pkg.id, 'wallet');

    await expect(
      packageTrackingService.updateLocation(pkg.id, { lat: 31.95, lng: 35.91 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
