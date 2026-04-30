import { describe, expect, it } from 'vitest';
import { evaluateTrustCapability } from '../../../src/services/trustRules';

describe('trustRules', () => {
  const baseUser = {
    verificationLevel: 'level_0',
    walletStatus: 'active' as const,
    trustScore: 45,
    phoneVerified: false,
    emailVerified: false,
    role: 'rider' as const,
    driverStatus: undefined,
  };

  it('blocks ride posting without phone verification', () => {
    const result = evaluateTrustCapability(baseUser, 'offer_ride');
    expect(result.allowed).toBe(false);
  });

  it('allows package carrying only for stronger trust', () => {
    const result = evaluateTrustCapability({
      ...baseUser,
      verificationLevel: 'level_3',
      phoneVerified: true,
      emailVerified: true,
      trustScore: 72,
      role: 'driver',
      driverStatus: 'approved',
    }, 'carry_packages');
    expect(result.allowed).toBe(true);
  });

  it('blocks ride posting when driver approval is still pending', () => {
    const result = evaluateTrustCapability({
      ...baseUser,
      verificationLevel: 'level_3',
      phoneVerified: true,
      emailVerified: true,
      trustScore: 72,
      role: 'driver',
      driverStatus: 'pending_approval',
    }, 'offer_ride');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('pending approval');
  });

  it('blocks package carrying when driver approval is suspended', () => {
    const result = evaluateTrustCapability({
      ...baseUser,
      verificationLevel: 'level_3',
      phoneVerified: true,
      emailVerified: true,
      trustScore: 85,
      role: 'driver',
      driverStatus: 'suspended',
    }, 'carry_packages');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('paused');
  });
});
