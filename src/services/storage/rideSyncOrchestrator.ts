import type { RideBookingRecord, RideBookingSyncState } from '../rideLifecycle';
import { createDirectBooking, updateDirectBookingStatus } from '../directSupabase';
import { readBookings, writeBookings, upsertBookings } from './rideBookingStorage';
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
      pendingSync: syncState === 'syncing' || syncState === 'sync-error',
      syncedAt: syncState === 'synced' ? new Date().toISOString() : booking.syncedAt,
    },
    'ride.booking.state',
  );
}

async function attemptSync(entry: PendingSyncEntry): Promise<void> {
  try {
    const { booking: persisted } = await createDirectBooking({
      tripId: entry.rideId,
      userId: entry.passengerId,
      seatsRequested: entry.seatsRequested,
      pickup: entry.from,
      dropoff: entry.to,
      bookingStatus: entry.status,
      metadata: { total_price: entry.totalPriceJod ?? entry.seatsRequested },
    });

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
  try {
    const { booking: persisted } = await createDirectBooking({
      tripId: booking.rideId,
      userId: passengerId,
      seatsRequested: booking.seatsRequested,
      pickup: booking.from,
      dropoff: booking.to,
      bookingStatus: booking.status,
      metadata: { total_price: booking.totalPriceJod ?? booking.seatsRequested },
    });

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
  await updateDirectBookingStatus(backendBookingId, status);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void drainPendingSyncs());
}
