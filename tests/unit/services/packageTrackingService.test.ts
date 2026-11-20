import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../src/utils/errors';
import { packageTrackingService } from '../../../src/services/packageTrackingService';

describe('packageTrackingService compatibility guard', () => {
  it('refuses to create browser-local package records or simulated escrow', async () => {
    await expect(packageTrackingService.createPackage({
      senderId: 'sender-1',
      from: 'Amman',
      to: 'Aqaba',
      size: 'medium',
      value: 25,
      insurance: true,
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('refuses local ride assignment and payment settlement', async () => {
    await expect(packageTrackingService.linkPackageToRide('pkg-1', {
      rideId: 'ride-1',
      driverId: 'driver-1',
      driverName: 'Wasel Captain',
      driverPhone: '+962790000000',
    })).rejects.toBeInstanceOf(ValidationError);

    await expect(packageTrackingService.processPayment('pkg-1', 'wallet'))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('refuses local pickup, location and delivery transitions', async () => {
    await expect(packageTrackingService.verifyPickup('pkg-1', '123456'))
      .rejects.toBeInstanceOf(ValidationError);
    await expect(packageTrackingService.updateLocation('pkg-1', { lat: 31.95, lng: 35.91 }))
      .rejects.toBeInstanceOf(ValidationError);
    await expect(packageTrackingService.verifyDelivery('pkg-1', '654321'))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('does not expose local package or escrow records', () => {
    expect(packageTrackingService.getPackage('pkg-1')).toBeUndefined();
    expect(packageTrackingService.getPackageByTrackingCode('TRACK-1')).toBeUndefined();
    expect(packageTrackingService.getSenderPackages('sender-1')).toEqual([]);
    expect(packageTrackingService.getDriverPackages('driver-1')).toEqual([]);
    expect(packageTrackingService.getTimeline('pkg-1')).toEqual([]);
  });
});
