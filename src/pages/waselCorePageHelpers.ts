import {
  isKnownJordanLocation,
  routeEndpointsAreDistinct,
} from '../utils/jordanLocations';

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

export function parseFindRideParams(search: string): {
  initialFrom: string;
  initialTo: string;
  initialDate: string;
  initialSearched: boolean;
} {
  const params = new URLSearchParams(search);
  const fromParam = params.get('from');
  const toParam = params.get('to');

  return {
    initialFrom:
      typeof fromParam === 'string' && isKnownJordanLocation(fromParam)
        ? fromParam
        : 'Amman',
    initialTo:
      typeof toParam === 'string' && isKnownJordanLocation(toParam)
        ? toParam
        : 'Aqaba',
    initialDate: params.get('date') ?? '',
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
