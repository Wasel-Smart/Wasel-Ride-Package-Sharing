import { beforeEach, describe, expect, it } from 'vitest';
import { packageTrackingService } from '../packageTrackingService';

describe('packageTrackingService', () => {
  beforeEach(() => {
    packageTrackingService.resetRuntimeState();
  });

  it('creates non-predictable, correctly formatted hand-off codes', async () => {
    const first = await packageTrackingService.createPackage({
      senderId: 'sender-1',
      from: 'Amman',
      to: 'Aqaba',
      size: 'small',
      value: 10,
      insurance: false,
    });
    const second = await packageTrackingService.createPackage({
      senderId: 'sender-2',
      from: 'Irbid',
      to: 'Zarqa',
      size: 'medium',
      value: 20,
      insurance: true,
    });

    expect(first.trackingCode).toMatch(/^WSL-PKG-[A-Z0-9]{6}$/);
    expect(first.pickupVerificationCode).toMatch(/^\d{6}$/);
    expect(first.deliveryVerificationCode).toMatch(/^\d{6}$/);
    expect(first.pickupVerificationCode).not.toBe(first.deliveryVerificationCode);
    expect(first.trackingCode).not.toBe(second.trackingCode);
  });
});
