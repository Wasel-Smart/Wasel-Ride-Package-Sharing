import { beforeEach, describe, expect, it } from 'vitest';
import { packageTrackingService } from '../../../src/services/packageTrackingService';

describe('packageTrackingService', () => {
  beforeEach(() => {
    packageTrackingService.resetRuntimeState();
  });

  it('creates, assigns, and escrows packages with canonical lifecycle state', async () => {
    const pkg = await packageTrackingService.createPackage({
      senderId: 'sender-1',
      from: 'Amman',
      to: 'Irbid',
      size: 'medium',
      value: 150,
      insurance: true,
      description: 'Prototype hardware',
    });

    expect(pkg.status).toBe('created');
    expect(pkg.lifecycleStatus).toBe('created');

    const assigned = await packageTrackingService.linkPackageToRide(pkg.id, {
      rideId: 'ride-1',
      driverId: 'driver-1',
      driverName: 'Captain Noor',
      driverPhone: '+962790000000',
    });

    expect(assigned.status).toBe('matched');
    expect(assigned.lifecycleStatus).toBe('assigned');

    const escrow = await packageTrackingService.processPayment(pkg.id, 'wallet');
    expect(escrow.heldInEscrow).toBe(true);
  });

  it('throttles noisy location updates and releases escrow on verified delivery', async () => {
    const pkg = await packageTrackingService.createPackage({
      senderId: 'sender-2',
      from: 'Amman',
      to: 'Aqaba',
      size: 'small',
      value: 50,
      insurance: false,
    });

    await packageTrackingService.linkPackageToRide(pkg.id, {
      rideId: 'ride-2',
      driverId: 'driver-2',
      driverName: 'Captain Sami',
      driverPhone: '+962791111111',
    });
    await packageTrackingService.processPayment(pkg.id, 'card');
    await packageTrackingService.verifyPickup(pkg.id, pkg.pickupVerificationCode);

    await packageTrackingService.updateLocation(pkg.id, { lat: 31.9539, lng: 35.9106 });
    await packageTrackingService.updateLocation(pkg.id, { lat: 31.95391, lng: 35.91061 });

    const history = packageTrackingService.getStatusHistory(pkg.id);
    const locationUpdates = history.filter((entry) => entry.note);
    expect(locationUpdates).toHaveLength(1);

    const result = await packageTrackingService.verifyDelivery(
      pkg.id,
      pkg.deliveryVerificationCode,
      'proof.png',
    );

    expect(result.verified).toBe(true);
    expect(result.paymentReleased).toBe(true);
    expect(packageTrackingService.getPackage(pkg.id)?.lifecycleStatus).toBe('delivered');
  });
});
