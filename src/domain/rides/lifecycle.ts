import { canTransition, type TransitionMap } from '../shared/stateMachine';

export type RideLifecycleState =
  | 'requested'
  | 'matched'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type LegacyRideBookingStatus =
  | 'pending_driver'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export const RIDE_LIFECYCLE_TRANSITIONS: TransitionMap<RideLifecycleState> = {
  requested: ['matched', 'cancelled'],
  matched: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const rideLifecycleOrder: RideLifecycleState[] = [
  'requested',
  'matched',
  'accepted',
  'in_progress',
  'completed',
];

export function mapBookingStatusToRideLifecycleState(
  status: LegacyRideBookingStatus,
): RideLifecycleState {
  switch (status) {
    case 'pending_driver':
      return 'requested';
    case 'confirmed':
      return 'accepted';
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'rejected':
      return 'cancelled';
    default:
      return 'requested';
  }
}

export function mapRideLifecycleStateToBookingStatus(
  status: RideLifecycleState,
): LegacyRideBookingStatus {
  switch (status) {
    case 'requested':
    case 'matched':
      return 'pending_driver';
    case 'accepted':
    case 'in_progress':
      return 'confirmed';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending_driver';
  }
}

export function projectRideLifecycleState(
  current: RideLifecycleState,
  target: RideLifecycleState,
): RideLifecycleState {
  if (current === target) {
    return current;
  }

  if (target === 'cancelled' && current !== 'completed') {
    return 'cancelled';
  }

  if (current === 'cancelled' || current === 'completed') {
    throw new Error(`Cannot transition terminal ride state ${current} to ${target}`);
  }

  if (canTransition(current, target, RIDE_LIFECYCLE_TRANSITIONS)) {
    return target;
  }

  const currentIndex = rideLifecycleOrder.indexOf(current);
  const targetIndex = rideLifecycleOrder.indexOf(target);

  if (currentIndex === -1 || targetIndex === -1 || targetIndex < currentIndex) {
    throw new Error(`Cannot project ride state ${current} to ${target}`);
  }

  return target;
}
