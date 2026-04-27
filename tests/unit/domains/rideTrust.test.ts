import { describe, expect, it } from 'vitest';
import {
  buildRideConfidenceScore,
  getRideTrustSummary,
} from '@/domains/trust/rideTrust';
import type { RideResult } from '@/modules/rides/ride.types';

function createRide(overrides: Partial<RideResult> = {}): RideResult {
  return {
    id: 'ride-1',
    from: 'Amman',
    to: 'Irbid',
    date: '2026-04-24',
    time: '08:30',
    seatsAvailable: 2,
    totalSeats: 4,
    pricePerSeat: 5,
    driver: {
      id: 'driver-1',
      name: 'Sara Al-Khalidi',
      rating: 4.9,
      verified: true,
      trips: 860,
      phone: '+962790000002',
    },
    routeMode: 'live_post',
    vehicleType: 'Honda Civic',
    etaMinutes: 34,
    estimatedArrivalLabel: '34 min ETA',
    rideType: 'comfort',
    supportsPackages: true,
    packageCapacity: 'small',
    lastUpdatedAt: '2026-04-23T12:30:00.000Z',
    ...overrides,
  };
}

describe('rideTrust', () => {
  it('scores strong verified rides as high confidence', () => {
    const ride = createRide();

    expect(buildRideConfidenceScore(ride)).toBeGreaterThanOrEqual(92);
  });

  it('falls back to Wasel support language when direct WhatsApp is unavailable', () => {
    const baseRide = createRide();
    const ride = createRide({
      driver: {
        ...baseRide.driver,
        phone: '',
      },
      supportsPackages: false,
      prayerStops: true,
    });

    const summary = getRideTrustSummary(ride, 'en', { supportLine: '+962 6 500 0000' });

    expect(summary.signals.find((signal) => signal.id === 'coordination')?.value).toContain(
      'Wasel support',
    );
    expect(summary.signals.find((signal) => signal.id === 'service-fit')?.value).toContain(
      'Prayer-stop',
    );
  });

  it('returns Arabic trust language for Arabic journeys', () => {
    const summary = getRideTrustSummary(createRide(), 'ar');

    expect(summary.scoreLabel).toBe('ثقة الرحلة');
    expect(summary.headline.length).toBeGreaterThan(0);
    expect(summary.signals[0]?.label).toBe('إثبات السائق');
  });
});
