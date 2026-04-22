import type { RideBookingRecord, RideBookingStatus } from '../rideLifecycle';
import { parseContract } from '../../contracts/validation';
import { rideBookingRecordSchema, RIDE_LIFECYCLE_CONTRACT_VERSION } from '../../contracts/rideLifecycle';
import { ValidationError } from '../../utils/errors';

const ALLOWED_TRANSITIONS: Record<RideBookingStatus, readonly RideBookingStatus[]> = {
  pending_driver: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

export type RideBookingCustomerState = 'pending' | 'confirmed' | 'closed';

export function getCustomerState(
  booking: Pick<RideBookingRecord, 'status' | 'syncState' | 'backendBookingId'>,
): RideBookingCustomerState {
  if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'completed') {
    return 'closed';
  }
  if (booking.status === 'confirmed' && (booking.syncState === 'synced' || Boolean(booking.backendBookingId))) {
    return 'confirmed';
  }
  return 'pending';
}

export function isConfirmed(booking: Pick<RideBookingRecord, 'status' | 'syncState' | 'backendBookingId'>): boolean {
  return getCustomerState(booking) === 'confirmed';
}

export function isPending(booking: Pick<RideBookingRecord, 'status' | 'syncState' | 'backendBookingId'>): boolean {
  return getCustomerState(booking) === 'pending';
}

export function canTransition(current: RideBookingStatus, next: RideBookingStatus): boolean {
  return current === next || ALLOWED_TRANSITIONS[current].includes(next);
}

export function validateTransition(current: RideBookingStatus, next: RideBookingStatus, bookingId: string): void {
  if (!canTransition(current, next)) {
    throw new ValidationError(
      `Invalid ride booking transition from ${current} to ${next}.`,
      { bookingId, fromStatus: current, toStatus: next },
    );
  }
}

export function makeTicketCode(): string {
  return `RIDE-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function validateBooking(record: RideBookingRecord, contractName: string): RideBookingRecord {
  return parseContract(rideBookingRecordSchema, record, contractName, RIDE_LIFECYCLE_CONTRACT_VERSION);
}
