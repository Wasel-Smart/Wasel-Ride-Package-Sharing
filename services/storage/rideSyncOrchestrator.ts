import type { RideBookingRecord, RideBookingSyncState } from '../rideLifecycle';
import { bookingsAPI } from '../bookings';
import { readBookings, writeBookings } from './rideBookingStorage';
import { loadPendingSyncs, removePendingSync, incrementRetry, type PendingSyncEntry } from './rideSyncQueue';
import { validateBooking, isConfirmed } from './rideBookingLogic';
import { triggerRideBookingEmails } from '../transactionalEmailTriggers';
import { getTransactionalEmailAppUrl } from '../transactionalEmailTriggers';
import { allowLocalPersistenceFallback } from '../runtimePolicy';

export function markSyncState(booking: RideBookingRecord, syncState: RideBookingSyncState): RideBookingRecord {
  return validateBooking(
    {
      ...booking,
      syncState,
      pendingSync: syncState !== 'synced',
      syncedAt: syncState === 'synced' ? new Date().toISOString() : booking.syncedAt,
    },
    'ride.booking.state',
  );
}

async function attemptSync(entry: PendingSyncEntry): Promise<void> {
  try {
    const persisted = await bookingsAPI.createBooking(
      entry.rideId,
      entry.seatsRequested,
      entry.from,
      entry.to,
      { total_price: entry.totalPriceJod ?? entry.seatsRequested },
    );

    const backendId = String(persisted.booking_id ?? persisted.id ?? '');
    const bookings = readBookings();
    const idx = bookings.findIndex(b => b.id === entry.bookingId);
    if (idx !== -1) {
      const current = bookings[idx];
      if (!current) {
        removePendingSync(entry.bookingId);
        return;
      }
      const synced = markSyncState(
        { ...current, backendBookingId: backendId, updatedAt: new Date().toISOString() },
        'synced',
      );
      bookings[idx] = synced;
      writeBookings(bookings);
      if (synced.passengerEmail && !isConfirmed(current) && isConfirmed(synced)) {
        triggerRideBookingEmails({
          booking: synced,
          passengerEmail: synced.passengerEmail,
          driverEmail: synced.driverEmail,
          priceJod: synced.totalPriceJod ?? 0,
          appUrl: getTransactionalEmailAppUrl(),
        });
      }
    }
    removePendingSync(entry.bookingId);
  } catch {
    const bookings = readBookings();
    const idx = bookings.findIndex(b => b.id === entry.bookingId);
    if (idx !== -1) {
      bookings[idx] = markSyncState({ ...bookings[idx], updatedAt: new Date().toISOString() }, 'sync-error');
      writeBookings(bookings);
    }
    incrementRetry(entry.bookingId);
  }
}

export async function drainPendingSyncs(): Promise<void> {
  if (!allowLocalPersistenceFallback()) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const pending = loadPendingSyncs();
  if (pending.length === 0) return;

  for (const entry of pending) {
    await attemptSync(entry);
    await new Promise(r => setTimeout(r, 150));
  }
}

export async function syncToBackend(
  booking: RideBookingRecord,
  passengerId: string,
): Promise<RideBookingRecord> {
  void passengerId;

  try {
    const persisted = await bookingsAPI.createBooking(
      booking.rideId,
      booking.seatsRequested,
      booking.from,
      booking.to,
      { total_price: booking.totalPriceJod ?? booking.seatsRequested },
    );

    return markSyncState(
      {
        ...booking,
        backendBookingId: String(persisted.booking_id ?? persisted.id ?? ''),
        updatedAt: new Date().toISOString(),
      },
      'synced',
    );
  } catch {
    return markSyncState({ ...booking, updatedAt: new Date().toISOString() }, 'sync-error');
  }
}

export async function syncStatusUpdate(
  backendBookingId: string,
  status: 'accepted' | 'rejected' | 'cancelled',
): Promise<void> {
  await bookingsAPI.updateBookingStatus(backendBookingId, status);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void drainPendingSyncs());
}
