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
    }, 'carry_packages');
    expect(result.allowed).toBe(true);
  });
});
