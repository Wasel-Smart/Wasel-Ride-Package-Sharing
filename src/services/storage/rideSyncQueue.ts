import type { RideBookingStatus } from '../rideLifecycle';

const PENDING_SYNCS_KEY = 'wasel-pending-booking-syncs';

export interface PendingSyncEntry {
  bookingId: string;
  passengerId: string;
  rideId: string;
  seatsRequested: number;
  from: string;
  to: string;
  status: RideBookingStatus;
  totalPriceJod?: number;
  pricePerSeatJod?: number;
  retries: number;
  queuedAt: number;
}

export function loadPendingSyncs(): PendingSyncEntry[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PENDING_SYNCS_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingSyncs(entries: PendingSyncEntry[]): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(entries.slice(0, 50)));
    }
  } catch {}
}

export function enqueuePendingSync(entry: Omit<PendingSyncEntry, 'retries' | 'queuedAt'>): void {
  const existing = loadPendingSyncs();
  const filtered = existing.filter(e => e.bookingId !== entry.bookingId);
  savePendingSyncs([...filtered, { ...entry, retries: 0, queuedAt: Date.now() }]);
}

export function removePendingSync(bookingId: string): void {
  savePendingSyncs(loadPendingSyncs().filter(e => e.bookingId !== bookingId));
}

export function incrementRetry(bookingId: string): void {
  const all = loadPendingSyncs();
  const updated = all.map(e => e.bookingId === bookingId ? { ...e, retries: e.retries + 1 } : e);
  savePendingSyncs(updated.filter(e => e.retries < 10));
}
