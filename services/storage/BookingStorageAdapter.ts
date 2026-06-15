/**
 * BookingStorageAdapter — unified façade
 *
 * This project already had four focused storage modules:
 *   • rideBookingStorage.ts   — localStorage read/write/upsert
 *   • rideSyncQueue.ts        — pending sync queue management
 *   • rideBookingLogic.ts     — state machine, validation helpers
 *   • rideSyncOrchestrator.ts — async sync, drain, backoff
 *
 * This file is a single, stable import surface over all four.
 * Callers import from here; internal reorganisation of the four
 * modules does not break anything upstream.
 *
 * @example
 * import { readBookings, writeBookings, enqueuePendingSync }
 *   from '@/services/storage/BookingStorageAdapter';
 */

// ─── Storage (read / write / upsert) ─────────────────────────────────────────
export {
  RIDE_BOOKINGS_CHANGED_EVENT,
  readBookings,
  upsertBookings,
  writeBookings,
} from './rideBookingStorage';

// ─── Pending sync queue ───────────────────────────────────────────────────────
export {
  enqueuePendingSync,
  loadPendingSyncs,
  removePendingSync,
  savePendingSyncs,
} from './rideSyncQueue';

export type { PendingSyncEntry } from './rideSyncQueue';

// ─── incrementSyncRetry: stable alias for incrementRetry ─────────────────────
// rideSyncQueue exports `incrementRetry`; we expose it under the
// more descriptive name used throughout rideLifecycle.ts.
export { incrementRetry as incrementSyncRetry } from './rideSyncQueue';

// ─── Sync orchestration ───────────────────────────────────────────────────────
export {
  drainPendingSyncs as drainPendingBookingSyncs,
  markSyncState,
  syncStatusUpdate,
  syncToBackend,
} from './rideSyncOrchestrator';

// ─── Business logic helpers ───────────────────────────────────────────────────
export {
  canTransition,
  getCustomerState,
  isConfirmed,
  isPending,
  makeTicketCode,
  validateBooking,
  validateTransition,
} from './rideBookingLogic';
