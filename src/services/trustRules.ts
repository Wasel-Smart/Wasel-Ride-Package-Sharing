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

const APPROVED_DRIVER_STATUSES = new Set(['approved', 'online', 'offline', 'busy']);

export function isApprovedDriverStatus(status?: string | null): boolean {
  return typeof status === 'string' && APPROVED_DRIVER_STATUSES.has(status);
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
  user: Pick<WaselUser, 'role' | 'driverStatus' | 'verificationLevel' | 'walletStatus' | 'trustScore' | 'phoneVerified' | 'emailVerified'> | null | undefined,
  capability: TrustCapability,
): TrustGateResult {
  if (!user) {
    return {
      allowed: false,
      reason: 'Sign in to continue.',
      recommendation: 'Open your account and complete verification first.',
    };
  }

  const level = verificationRank(user.verificationLevel);
  const walletBlocked = user.walletStatus === 'frozen';

  if (walletBlocked && capability !== 'priority_support') {
    return {
      allowed: false,
      reason: 'Wallet standing needs review before this action can continue.',
      recommendation: 'Resolve wallet restrictions from Settings or Wallet.',
    };
  }

  if (capability === 'offer_ride') {
    if (user.role !== 'driver' && user.role !== 'both') {
      return {
        allowed: false,
        reason: 'Ride posting is limited to approved driver accounts.',
        recommendation: 'Open Driver or Trust Center to start driver onboarding.',
      };
    }
    if (user.driverStatus && !isApprovedDriverStatus(user.driverStatus)) {
      return {
        allowed: false,
        reason:
          user.driverStatus === 'rejected' || user.driverStatus === 'suspended'
            ? 'Driver operations are paused until Trust finishes account review.'
            : 'Driver profile is pending approval. You can post rides after driver verification is approved.',
        recommendation:
          user.driverStatus === 'rejected' || user.driverStatus === 'suspended'
            ? 'Open Trust Center to review the account status before posting a ride.'
            : 'Finish driver onboarding and wait for approval from the admin review queue.',
      };
    }
    if (level < 2 || !user.phoneVerified || !user.emailVerified) {
      return {
        allowed: false,
        reason: 'Ride posting needs confirmed phone, email, and identity checks.',
        recommendation: 'Complete account confirmation and driver verification before posting a ride.',
      };
    }
    return { allowed: true, reason: null, recommendation: null };
  }

  if (capability === 'carry_packages') {
    if (user.role !== 'driver' && user.role !== 'both') {
      return {
        allowed: false,
        reason: 'Package carrying is limited to approved driver accounts.',
        recommendation: 'Complete driver onboarding before enabling parcel capacity.',
      };
    }
    if (user.driverStatus && !isApprovedDriverStatus(user.driverStatus)) {
      return {
        allowed: false,
        reason:
          user.driverStatus === 'rejected' || user.driverStatus === 'suspended'
            ? 'Package carrying is paused until Trust finishes account review.'
            : 'Driver profile is pending approval. Package carrying unlocks after driver verification is approved.',
        recommendation:
          user.driverStatus === 'rejected' || user.driverStatus === 'suspended'
            ? 'Open Trust Center to review the account status before enabling parcel capacity.'
            : 'Finish driver onboarding and wait for approval from the admin review queue.',
      };
    }
    if (level < 3 || user.trustScore < 70) {
      return {
        allowed: false,
        reason: 'Package carrying is limited to trusted riders.',
        recommendation: 'Reach full driver verification and maintain strong trust standing first.',
      };
    }
    return { allowed: true, reason: null, recommendation: null };
  }

  if (capability === 'receive_payouts') {
    if (level < 2 || !user.emailVerified) {
      return {
        allowed: false,
        reason: 'Payouts need an identity-verified account and confirmed email.',
        recommendation: 'Confirm email and complete identity verification first.',
      };
    }
    return { allowed: true, reason: null, recommendation: null };
  }

  if (user.trustScore < 70) {
    return {
      allowed: false,
      reason: 'Priority support is reserved for stronger trust standing.',
      recommendation: 'Complete verification and maintain good trip completion.',
    };
  }

  return { allowed: true, reason: null, recommendation: null };
}

export function getTrustReadinessSummary(
  user: Pick<WaselUser, 'role' | 'driverStatus' | 'verificationLevel' | 'walletStatus' | 'trustScore' | 'phoneVerified' | 'emailVerified'> | null | undefined,
) {
  return {
    canOfferRide: evaluateTrustCapability(user, 'offer_ride').allowed,
    canCarryPackages: evaluateTrustCapability(user, 'carry_packages').allowed,
    canReceivePayouts: evaluateTrustCapability(user, 'receive_payouts').allowed,
    canUsePrioritySupport: evaluateTrustCapability(user, 'priority_support').allowed,
  };
}
