import {
  isKnownJordanLocation,
  routeEndpointsAreDistinct,
} from '../utils/jordanLocations';
import type { RideSearchMode, RideType } from '../modules/rides/ride.types';

export interface OfferRideForm {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  gender: string;
  prayer: boolean;
  carModel: string;
  note: string;
  acceptsPackages: boolean;
  packageCapacity: 'small' | 'medium' | 'large';
  packageNote: string;
}

export interface PackageComposer {
  from: string;
  to: string;
  weight: string;
  recipientName: string;
  recipientPhone: string;
  note: string;
  sent: boolean;
  trackingId: string;
}

/**
 * Returns the local calendar date (YYYY-MM-DD) adjusted for the user's
 * timezone offset so that the comparison is consistent with minDate produced
 * by todayIsoDate() in ride.hooks.ts.
 */
function localTodayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * FIX [Issue 1]: Validate that a date string coming from URL params is not in
 * the past. Past dates cause the form's date field to show a value below its
 * `min` attribute (which equals today), confusing the user and blocking any
 * attempt to switch to schedule mode without first clearing the field manually.
 */
function sanitizeUrlDate(raw: string | null): string {
  if (!raw) return '';
  const today = localTodayIsoDate();
  // Keep the date only if it is today or in the future.
  return raw >= today ? raw : '';
}

function sanitizeSearchMode(
  raw: string | null,
  date: string,
): RideSearchMode {
  if (raw === 'schedule') {
    return date ? 'schedule' : 'now';
  }
  if (raw === 'now') {
    return 'now';
  }
  return date ? 'schedule' : 'now';
}

function sanitizeRideType(raw: string | null): RideType {
  switch (raw) {
    case 'economy':
    case 'comfort':
    case 'family':
      return raw;
    default:
      return 'any';
  }
}

export function parseFindRideParams(search: string): {
  initialFrom: string;
  initialTo: string;
  initialDate: string;
  initialMode: RideSearchMode;
  initialRideType: RideType;
  initialSearched: boolean;
} {
  const params = new URLSearchParams(search);
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const initialDate = sanitizeUrlDate(params.get('date'));
  const initialMode = sanitizeSearchMode(params.get('mode'), initialDate);

  return {
    initialFrom:
      typeof fromParam === 'string' && isKnownJordanLocation(fromParam)
        ? fromParam
        : 'Amman',
    initialTo:
      typeof toParam === 'string' && isKnownJordanLocation(toParam)
        ? toParam
        : 'Aqaba',
    initialDate: initialMode === 'schedule' ? initialDate : '',
    initialMode,
    initialRideType: sanitizeRideType(params.get('rideType')),
    initialSearched: params.get('search') === '1',
  };
}

export function parsePackagePrefillParams(search: string): {
  initialFrom: string;
  initialTo: string;
  initialRideId: string;
} {
  const params = new URLSearchParams(search);
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const rideIdParam = params.get('rideId');

  return {
    initialFrom:
      typeof fromParam === 'string' && isKnownJordanLocation(fromParam)
        ? fromParam
        : 'Amman',
    initialTo:
      typeof toParam === 'string' && isKnownJordanLocation(toParam)
        ? toParam
        : 'Aqaba',
    initialRideId: typeof rideIdParam === 'string' ? rideIdParam.trim() : '',
  };
}

export function createOfferRideDefaultForm(): OfferRideForm {
  return {
    from: 'Amman',
    to: 'Aqaba',
    date: '',
    time: '07:00',
    seats: 3,
    price: 8,
    gender: 'mixed',
    prayer: false,
    carModel: '',
    note: '',
    acceptsPackages: true,
    packageCapacity: 'medium',
    packageNote: 'Small and medium parcels accepted on this trip.',
  };
}

export function validateOfferRideStep(form: OfferRideForm, targetStep: number) {
  if (targetStep >= 1) {
    if (!routeEndpointsAreDistinct(form.from, form.to)) {
      return 'Origin and destination need to be different locations.';
    }
    if (!form.date) {
      return 'Choose a departure date.';
    }
    if (!form.time) {
      return 'Choose a departure time.';
    }
  }

  if (targetStep >= 2) {
    if (form.seats < 1 || form.seats > 7) {
      return 'Seats should be between 1 and 7.';
    }
    if (form.price < 1 || form.price > 50) {
      return 'Price should be between 1 and 50 JOD.';
    }
    if (!form.carModel.trim()) {
      return 'Add the car model so riders know what to expect.';
    }
  }

  if (targetStep >= 3 && form.acceptsPackages && !form.packageNote.trim()) {
    return 'Add a short package note when package delivery is enabled.';
  }

  return null;
}

export function createPackageComposer(
  overrides?: Partial<Pick<PackageComposer, 'from' | 'to'>>,
): PackageComposer {
  return {
    from: overrides?.from ?? 'Amman',
    to: overrides?.to ?? 'Aqaba',
    weight: '<1 kg',
    recipientName: '',
    recipientPhone: '',
    note: '',
    sent: false,
    trackingId: '',
  };
}

export function validatePackageComposer(pkg: PackageComposer) {
  if (!routeEndpointsAreDistinct(pkg.from, pkg.to)) {
    return 'Pickup and destination need to be different locations.';
  }
  if (!pkg.recipientName.trim()) {
    return 'Add the recipient name so the rider knows who will receive it.';
  }
  if (pkg.recipientPhone.replace(/[^\d]/g, '').length < 9) {
    return 'Add a valid recipient phone number.';
  }

  return null;
}
