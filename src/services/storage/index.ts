/**
 * services/storage — barrel export
 *
 * All storage adapters for the Wasel service layer.
 * Import from here rather than from individual adapter files
 * so internal module reorganisation never breaks callers.
 *
 * ─── Booking storage ─────────────────────────────────────────────────────────
 * @see BookingStorageAdapter — unified façade over four focused modules:
 *   rideBookingStorage · rideSyncQueue · rideBookingLogic · rideSyncOrchestrator
 *
 * ─── Wallet storage ──────────────────────────────────────────────────────────
 * @see WalletStorageAdapter — snapshot TTL cache + demo payment intent helpers
 */

// ─── Booking ──────────────────────────────────────────────────────────────────
export {
  canTransition,
  drainPendingBookingSyncs,
  enqueuePendingSync,
  getCustomerState,
  incrementSyncRetry,
  isConfirmed,
  isPending,
  loadPendingSyncs,
  makeTicketCode,
  markSyncState,
  RIDE_BOOKINGS_CHANGED_EVENT,
  readBookings,
  removePendingSync,
  savePendingSyncs,
  syncStatusUpdate,
  syncToBackend,
  upsertBookings,
  validateBooking,
  validateTransition,
  writeBookings,
} from './BookingStorageAdapter';

export type { PendingSyncEntry } from './BookingStorageAdapter';

// ─── Wallet ───────────────────────────────────────────────────────────────────
export {
  makeReliabilityMeta,
  persistDemoIntent,
  persistWalletSnapshot,
  readDemoIntent,
  readDemoIntentStatus,
  readPersistedWalletSnapshot,
  settleDemoIntent,
} from './WalletStorageAdapter';

export type { PersistedPaymentIntent } from './WalletStorageAdapter';
