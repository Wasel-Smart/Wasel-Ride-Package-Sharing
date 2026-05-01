import { type TransitionMap, canTransition } from '../shared/stateMachine';

export type DriverAvailabilityState =
  | 'offline'
  | 'available'
  | 'reserved'
  | 'on_trip'
  | 'cooldown';

export const DRIVER_AVAILABILITY_TRANSITIONS: TransitionMap<DriverAvailabilityState> = {
  offline: ['available'],
  available: ['reserved', 'offline'],
  reserved: ['on_trip', 'available', 'offline'],
  on_trip: ['cooldown'],
  cooldown: ['available', 'offline'],
};

export function canTransitionDriverAvailability(
  current: DriverAvailabilityState,
  next: DriverAvailabilityState,
): boolean {
  return canTransition(current, next, DRIVER_AVAILABILITY_TRANSITIONS);
}
