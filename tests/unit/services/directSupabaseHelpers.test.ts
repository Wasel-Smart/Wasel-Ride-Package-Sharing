import { describe, expect, it } from 'vitest';
import {
  buildTrustLikeUser,
  mapProfileFromContext,
} from '../../../src/services/directSupabase/helpers';

describe('directSupabase trust helpers', () => {
  it('does not auto-verify email from the canonical user record alone', () => {
    const profile = mapProfileFromContext({
      user: {
        id: 'canonical-user-1',
        auth_user_id: 'auth-user-1',
        email: 'sara@example.com',
        full_name: 'Sara Ali',
        phone_number: '+962790000000',
        role: 'driver',
        verification_level: 'level_1',
        sanad_verified_status: 'unverified',
        phone_verified_at: null,
        avatar_url: null,
        two_factor_enabled: false,
        created_at: '2026-05-01T08:00:00.000Z',
      },
      wallet: {
        wallet_id: 'wallet-1',
        user_id: 'canonical-user-1',
        balance: 0,
        pending_balance: 0,
        wallet_status: 'active',
        currency_code: 'JOD',
        created_at: '2026-05-01T08:00:00.000Z',
      },
      verification: null,
      driver: null,
      authUserId: 'auth-user-1',
    });

    expect(profile.email_verified).toBeNull();
    expect(buildTrustLikeUser(profile).emailVerified).toBe(false);
  });

  it('preserves closed wallets as blocked trust state', () => {
    const trustUser = buildTrustLikeUser({
      role: 'driver',
      verification_level: 'level_2',
      phone_verified: true,
      email_verified: true,
      wallet_status: 'closed',
    });

    expect(trustUser.walletStatus).toBe('closed');
  });
});
