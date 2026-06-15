import { canTransition, type TransitionMap } from '../shared/stateMachine';

export type PackageLifecycleState =
  | 'created'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type LegacyPackageStatus =
  | 'created'
  | 'matched'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_transit'
  | 'near_destination'
  | 'delivered'
  | 'cancelled'
  | 'disputed';

export const PACKAGE_LIFECYCLE_TRANSITIONS: TransitionMap<PackageLifecycleState> = {
  created: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function mapLegacyPackageStatusToLifecycle(
  status: LegacyPackageStatus,
): PackageLifecycleState {
  switch (status) {
    case 'created':
      return 'created';
    case 'matched':
    case 'pickup_scheduled':
      return 'assigned';
    case 'picked_up':
      return 'picked_up';
    case 'in_transit':
    case 'near_destination':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
    case 'disputed':
      return 'cancelled';
    default:
      return 'created';
  }
}

export function canProjectPackageLifecycle(
  current: PackageLifecycleState,
  next: PackageLifecycleState,
): boolean {
  if (current === next) {
    return true;
  }

  if (next === 'cancelled' && current !== 'delivered') {
    return true;
  }

  return canTransition(current, next, PACKAGE_LIFECYCLE_TRANSITIONS);
}
