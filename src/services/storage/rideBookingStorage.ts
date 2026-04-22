import type { RideBookingRecord } from '../rideLifecycle';
import { rideBookingListSchema, rideBookingRecordSchema } from '../../contracts/rideLifecycle';

const BOOKING_KEY = 'wasel-ride-booking-records';
export const RIDE_BOOKINGS_CHANGED_EVENT = 'wasel:ride-bookings-changed';

function emitChange(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(RIDE_BOOKINGS_CHANGED_EVENT));
  } catch {}
}

function validate(records: unknown): RideBookingRecord[] {
  const parsed = rideBookingListSchema.safeParse(records);
  if (parsed.success) return parsed.data;
  if (!Array.isArray(records)) return [];
  return records.flatMap(r => {
    const item = rideBookingRecordSchema.safeParse(r);
    return item.success ? [item.data] : [];
  });
}

function sort(items: RideBookingRecord[]) {
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function readBookings(): RideBookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOKING_KEY);
    return sort(validate(raw ? JSON.parse(raw) : []));
  } catch {
    return [];
  }
}

export function writeBookings(bookings: RideBookingRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BOOKING_KEY, JSON.stringify(validate(bookings).slice(0, 100)));
  emitChange();
}

export function upsertBookings(records: RideBookingRecord[]) {
  const current = new Map(readBookings().map(b => [b.id, b]));
  for (const record of records) current.set(record.id, record);
  writeBookings(sort(Array.from(current.values())));
}
