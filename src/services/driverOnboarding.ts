import type { WaselUser } from '../contexts/LocalAuth';
import { evaluateTrustCapability } from './trustRules';

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
      description: 'Turn on Driver mode.',
      complete: hasDriverRole(user),
    },
    {
      id: 'phone',
      label: 'Phone verified',
      description: 'Confirm your main phone number.',
      complete: Boolean(user?.phoneVerified),
    },
    {
      id: 'email',
      label: 'Email verified',
      description: 'Confirm your email.',
      complete: Boolean(user?.emailVerified),
    },
    {
      id: 'identity',
      label: 'Identity verified',
      description: 'Reach Level 2 or higher.',
      complete: Boolean(user?.verificationLevel === 'level_2' || user?.verificationLevel === 'level_3'),
    },
    {
      id: 'driver_clearance',
      label: 'Driver clearance',
      description: 'Final approval for live rides.',
      complete: Boolean(user?.verificationLevel === 'level_3'),
    },
  ];

  const offerRideGate = evaluateTrustCapability(user, 'offer_ride');
  const packageGate = evaluateTrustCapability(user, 'carry_packages');

  if (!user) {
    return {
      status: 'not_started',
      headline: 'Sign in to start',
      detail: 'Open your Wasel account to begin trust setup.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (!hasDriverRole(user)) {
    return {
      status: 'not_started',
      headline: 'Turn on Driver mode',
      detail: 'Switch roles first so Wasel can review your account.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (!user.phoneVerified || !user.emailVerified) {
    return {
      status: 'complete_profile',
      headline: 'Confirm your contact info',
      detail: 'Verify phone and email. Wasel will move you forward automatically.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (user.verificationLevel === 'level_0' || user.verificationLevel === 'level_1') {
    return {
      status: 'complete_verification',
      headline: 'Verify your identity',
      detail: 'Reach Level 2 to unlock ride review.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  if (user.verificationLevel === 'level_2') {
    return {
      status: 'pending_review',
      headline: 'Final review in progress',
      detail: 'Identity is approved. Final driver clearance is next.',
      steps,
      canOfferRide: false,
      canCarryPackages: false,
    };
  }

  return {
    status: 'ready',
    headline: 'Ready to post',
    detail: 'You can post rides, carry approved packages, and receive payouts.',
    steps,
    canOfferRide: offerRideGate.allowed,
    canCarryPackages: packageGate.allowed,
  };
}
