import { describe, expect, it } from 'vitest';
import {
  createDemoUserProfile,
  deriveTrustScore,
  deriveVerificationLevel,
  mapBackendProfile,
} from '../src/domains/trust/profile';

describe('trust profile derivation', () => {
  it('assigns verification levels correctly', () => {
    expect(deriveVerificationLevel({})).toBe('level_0');
    expect(deriveVerificationLevel({ phoneVerified: true })).toBe('level_1');
    expect(deriveVerificationLevel({ sanadVerified: true, role: 'passenger' })).toBe('level_2');
    expect(deriveVerificationLevel({ sanadVerified: true, role: 'driver' })).toBe('level_3');
  });

  it('keeps trust score inside 0-99 bounds', () => {
    const low = deriveTrustScore({ verificationLevel: 'level_0', rating: 0, trips: 0 });
    const high = deriveTrustScore({ verificationLevel: 'level_3', rating: 5, trips: 5000 });
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(99);
  });

  it('builds a consistent demo profile', () => {
    const profile = createDemoUserProfile({
      id: 'u1',
      name: 'Demo User',
      email: 'demo@example.com',
      phone: '+962700000000',
      role: 'driver',
      verified: true,
    });

    expect(profile.verificationLevel).toBe('level_3');
    expect(profile.sanadVerified).toBe(true);
    expect(profile.backendMode).toBe('demo');
    expect(profile.walletStatus).toBe('active');
  });

  it('maps backend profile into stable runtime shape', () => {
    const mapped = mapBackendProfile({
      authUser: {
        id: 'auth_1',
        email: 'backend@example.com',
        created_at: '2026-01-01T00:00:00.000Z',
        email_confirmed_at: '2026-01-02T00:00:00.000Z',
        phone_confirmed_at: null,
      },
      profile: {
        full_name: 'Backend User',
        role: 'driver',
        phone_number: '+962711111111',
        sanad_verified: true,
        verification_level: 'level_3',
        wallet_balance: 44.2,
        trip_count: 25,
        rating: 4.9,
      },
    });

    expect(mapped.backendMode).toBe('supabase');
    expect(mapped.name).toBe('Backend User');
    expect(mapped.verificationLevel).toBe('level_3');
    expect(mapped.balance).toBe(44.2);
    expect(mapped.trips).toBe(25);
  });

  it('does not mark a phone as verified just because a phone number exists', () => {
    const mapped = mapBackendProfile({
      authUser: {
        id: 'auth_2',
        email: 'pending@example.com',
        created_at: '2026-01-01T00:00:00.000Z',
        email_confirmed_at: '2026-01-02T00:00:00.000Z',
        phone_confirmed_at: null,
      },
      profile: {
        full_name: 'Pending Phone User',
        phone_number: '+962799999999',
        verification_level: 'level_0',
      },
    });

    expect(mapped.phone).toBe('+962799999999');
    expect(mapped.phoneVerified).toBe(false);
    expect(mapped.verificationLevel).toBe('level_0');
  });
});
