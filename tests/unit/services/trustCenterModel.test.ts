import { describe, expect, it } from 'vitest';
import { buildFallbackTrustCenterStatus } from '../../../src/services/trustCenterModel';

describe('trustCenterModel', () => {
  it('marks a strong driver account as complete', () => {
    const status = buildFallbackTrustCenterStatus({
      role: 'driver',
      verificationLevel: 'level_3',
      email: 'driver@example.com',
      emailVerified: true,
      phone: '+962790000000',
      phoneVerified: true,
      walletStatus: 'active',
      sanadVerified: true,
    });

    expect(status.completedSteps).toBe(5);
    expect(status.nextStepId).toBeNull();
    expect(status.steps.driverDocuments.state).toBe('completed');
  });

  it('keeps rider document flow blocked until driver mode is enabled', () => {
    const status = buildFallbackTrustCenterStatus({
      role: 'rider',
      verificationLevel: 'level_2',
      email: 'rider@example.com',
      emailVerified: true,
      phone: '+962790000000',
      phoneVerified: true,
      walletStatus: 'active',
      sanadVerified: true,
    });

    expect(status.steps.driverDocuments.state).toBe('not_started');
    expect(status.steps.driverDocuments(event as CustomEvent).detail).toContain('Enable Driver mode');
  });

  it('treats closed wallets as failed trust state', () => {
    const status = buildFallbackTrustCenterStatus({
      role: 'driver',
      verificationLevel: 'level_3',
      email: 'driver@example.com',
      emailVerified: true,
      phone: '+962790000000',
      phoneVerified: true,
      walletStatus: 'closed',
      sanadVerified: true,
    });

    expect(status.steps.walletStanding.state).toBe('failed');
    expect(status.blockedSteps).toContain('wallet_standing');
  });
});
