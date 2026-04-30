import type { WaselUser } from '../contexts/LocalAuth';
import { evaluateTrustCapability, isApprovedDriverStatus } from './trustRules';

export type DriverReadinessStep = {
  id: 'account_role' | 'phone' | 'email' | 'identity' | 'driver_clearance';
  label: string;
  description: string;
  complete: boolean;
};

export type DriverReadinessStatus =
  | 'not_started'
  | 'complete_profile'
  | 'complete_verification'
  | 'action_required'
  | 'pending_review'
  | 'ready';

export interface DriverReadinessSummary {
  status: DriverReadinessStatus;
  headline: string;
  detail: string;
  steps: DriverReadinessStep[];
  canOfferRide: boolean;
  canCarryPackages: boolean;
}

function hasDriverRole(user: WaselUser | null | undefined): boolean {
  return user?.role === 'driver' || user?.role === 'both';
}

export function getDriverReadinessSummary(user: WaselUser | null | undefined): DriverReadinessSummary {
  const steps: DriverReadinessStep[] = [
    {
      id: 'account_role',
      label: 'Driver role enabled',
      description: 'Your account is marked as driver-ready and can request onboarding review.',
      complete: hasDriverRole(user),
    },
    {
      id: 'phone',
      label: 'Phone verified',
      description: 'A confirmed phone number is required for booking safety and trip coordination.',
      complete: Boolean(user?.phoneVerified),
    },
    {
      id: 'email',
      label: 'Email verified',
      description: 'A confirmed email is required for receipts, notices, and payouts.',
      complete: Boolean(user?.emailVerified),
    },
    {
      id: 'identity',
      label: 'Identity verified',
      description: 'Identity verification must reach at least Level 2 before driver review can complete.',
      complete: Boolean(user?.verificationLevel === 'level_2' || user?.verificationLevel === 'level_3'),
    },
    {
      id: 'driver_clearance',
      label: 'Driver clearance',
      description: 'Driver operations unlock once the account reaches the highest verification readiness.',
      complete: Boolean(isApprovedDriverStatus(user?.driverStatus) || user?.verificationLevel === 'level_3'),
    },
  ];

  const offerRideGate = evaluateTrustCapability(user, 'offer_ride');
  const packageGate = evaluateTrustCapability(user, 'carry_packages');

  if (!user) {
    return {
      status: 'not_started',
      headline: 'Sign in to start driver onboarding',
      detail: 'Create or open your Wasel account first, then complete the trust and driver steps.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (!hasDriverRole(user)) {
    return {
      status: 'not_started',
      headline: 'Enable your driver role first',
      detail: 'Switch your account into driver mode before Wasel can review you for ride posting.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (!user.phoneVerified || !user.emailVerified) {
    return {
      status: 'complete_profile',
      headline: 'Finish account confirmation',
      detail: 'Confirm both phone and email so your driver application can move into verification review.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (user.verificationLevel === 'level_0' || user.verificationLevel === 'level_1') {
    return {
      status: 'complete_verification',
      headline: 'Complete identity checks',
      detail: 'You are close. Raise your verification level before Wasel unlocks ride posting and package carrying.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (user.verificationLevel === 'level_2') {
    return {
      status: 'pending_review',
      headline: 'Driver review is in progress',
      detail: 'Your account is verified enough for review. Final driver clearance unlocks live ride supply and package carrying.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (user.driverStatus === 'rejected' || user.driverStatus === 'suspended') {
    return {
      status: 'action_required',
      headline: 'Driver account needs trust review',
      detail: 'Operations are paused until Trust completes a follow-up review on this driver profile.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (user.driverStatus === 'pending_approval' || user.driverStatus === 'draft') {
    return {
      status: 'pending_review',
      headline: 'Driver review is in progress',
      detail: 'Your driver application is in the approval queue. Live ride posting unlocks after admin approval completes.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  return {
    status: 'ready',
    headline: 'Driver account is ready to operate',
    detail: 'You can post rides, receive rider demand, and carry approved packages on live corridors.',
    steps,
    canOfferRide: offerRideGate.allowed,
    canCarryPackages: packageGate.allowed,
  };
}
