import type { WaselUser } from '../contexts/LocalAuth';

export type TrustCapability =
  | 'offer_ride'
  | 'carry_packages'
  | 'receive_payouts'
  | 'priority_support';

export interface TrustGateResult {
  allowed: boolean;
  reason: string | null;
  recommendation: string | null;
}

function verificationRank(level?: string): number {
  switch (level) {
    case 'level_3':
      return 3;
    case 'level_2':
      return 2;
    case 'level_1':
      return 1;
    default:
      return 0;
  }
}

export function evaluateTrustCapability(
  user:
    | Pick<
        WaselUser,
        | 'role'
        | 'verificationLevel'
        | 'walletStatus'
        | 'trustScore'
        | 'phoneVerified'
        | 'emailVerified'
      >
    | null
    | undefined,
  capability: TrustCapability,
): TrustGateResult {
  if (!user) {
    return {
      allowed: false,
      reason: 'Sign in to continue.',
      recommendation: 'Open your account first.',
    };
  }

  const level = verificationRank(user.verificationLevel);
  const walletBlocked = user.walletStatus === 'frozen' || user.walletStatus === 'closed';

  if (walletBlocked && capability !== 'priority_support') {
    return {
      allowed: false,
      reason: 'Wallet needs review.',
      recommendation: 'Fix wallet status in Wallet or Settings.',
    };
  }

  if (capability === 'offer_ride') {
    if (user.role !== 'driver' && user.role !== 'both') {
      return {
        allowed: false,
        reason: 'Turn on Driver mode first.',
        recommendation: 'Open Driver to start.',
      };
    }
    if (level < 2 || !user.phoneVerified || !user.emailVerified) {
      return {
        allowed: false,
        reason: 'Verify phone, email, and ID.',
        recommendation: 'Finish checks in Trust Center.',
      };
    }
    return { allowed: true, reason: null, recommendation: null };
  }

  if (capability === 'carry_packages') {
    if (user.role !== 'driver' && user.role !== 'both') {
      return {
        allowed: false,
        reason: 'Turn on Driver mode first.',
        recommendation: 'Complete driver setup.',
      };
    }
    if (level < 3 || user.trustScore < 70) {
      return {
        allowed: false,
        reason: 'Packages need full trust approval.',
        recommendation: 'Reach full driver verification first.',
      };
    }
    return { allowed: true, reason: null, recommendation: null };
  }

  if (capability === 'receive_payouts') {
    if (level < 2 || !user.emailVerified) {
      return {
        allowed: false,
        reason: 'Payouts need verified ID and email.',
        recommendation: 'Finish account verification.',
      };
    }
    return { allowed: true, reason: null, recommendation: null };
  }

  if (user.trustScore < 70) {
    return {
      allowed: false,
      reason: 'Priority support needs stronger trust.',
      recommendation: 'Complete checks and keep a good trip record.',
    };
  }

  return { allowed: true, reason: null, recommendation: null };
}

export function getTrustReadinessSummary(
  user:
    | Pick<
        WaselUser,
        | 'role'
        | 'verificationLevel'
        | 'walletStatus'
        | 'trustScore'
        | 'phoneVerified'
        | 'emailVerified'
      >
    | null
    | undefined,
) {
  return {
    canOfferRide: evaluateTrustCapability(user, 'offer_ride').allowed,
    canCarryPackages: evaluateTrustCapability(user, 'carry_packages').allowed,
    canReceivePayouts: evaluateTrustCapability(user, 'receive_payouts').allowed,
    canUsePrioritySupport: evaluateTrustCapability(user, 'priority_support').allowed,
  };
}
