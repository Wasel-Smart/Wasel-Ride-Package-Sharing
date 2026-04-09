import { type Ride } from './waselCoreRideData';
import {
  isKnownJordanLocation,
  routeEndpointsAreDistinct,
} from '../utils/jordanLocations';

export interface FindRideCopy {
  from: string;
  to: string;
  date: string;
  searchRides: string;
  searching: string;
  searchRoute: string;
  previewCorridor: string;
  clearFirstStep: string;
  popularRoutes: string;
  showing: string;
  rides: string;
  ride: string;
  found: string;
  cheapest: string;
  earliest: string;
  topRated: string;
  noRidesFound: string;
  tryDifferent: string;
  routeReady: string;
  bookingReady: string;
  recentSearches: string;
  recommendedForYou: string;
  instantMatch: string;
  searchHelp: string;
  dateHelp: string;
  bookedTrips: string;
  bookingSaved: string;
  bookingStarted: string;
  chooseDifferentCities: string;
  routeSummary: string;
  seatsLeft: string;
  routeIntensity: string;
  fallbackOptions: string;
  clearDateFilter: string;
  openBusFallback: string;
  nearbyCorridors: string;
  seatsStillMove: string;
  noTripsYet: string;
  bookingSavedBetter: string;
  busSupport: string;
  sendPackageTitle: string;
  deliveryRoute: string;
  deliveryHint: string;
  packageFriendly: string;
  weight: string;
  note: string;
  notePh: string;
  sendPackageBtn: string;
  sentTitle: string;
  sendAnother: string;
  matchingDesc: string;
}

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
  const corridorParams = new URLSearchParams(search);
  const fromParam = corridorParams.get('from');
  const toParam = corridorParams.get('to');

  return {
    initialFrom:
      typeof fromParam === 'string' && isKnownJordanLocation(fromParam)
        ? fromParam
        : 'Amman',
    initialTo:
      typeof toParam === 'string' && isKnownJordanLocation(toParam)
        ? toParam
        : 'Aqaba',
    initialDate: corridorParams.get('date') ?? '',
    initialSearched: corridorParams.get('search') === '1',
  };
}

export function createFindRideCopy(ar: boolean): FindRideCopy {
  return {
    from: ar ? 'من' : 'FROM',
    to: ar ? 'إلى' : 'TO',
    date: ar ? 'التاريخ' : 'DATE',
    searchRides: ar ? 'ابحث عن الرحلات' : 'Search Rides',
    searching: ar ? 'جارٍ البحث...' : 'Searching...',
    searchRoute: ar ? 'مسار البحث' : 'Search Route',
    previewCorridor: ar ? 'عاين المسار قبل استعراض الرحلات.' : 'Preview the corridor before browsing rides.',
    clearFirstStep: ar ? 'واضح من الخطوة الأولى' : 'Clear from the first step',
    popularRoutes: ar ? 'مسارات شائعة' : 'Popular routes',
    showing: ar ? 'عرض' : 'Showing',
    rides: ar ? 'رحلات' : 'rides',
    ride: ar ? 'رحلة' : 'ride',
    found: ar ? 'موجودة' : 'found',
    cheapest: ar ? 'الأرخص' : 'Cheapest',
    earliest: ar ? 'الأبكر' : 'Earliest',
    topRated: ar ? 'الأعلى تقييماً' : 'Top Rated',
    noRidesFound: ar ? 'لا توجد رحلات' : 'No rides found',
    tryDifferent: ar ? 'جرّب مساراً أو تاريخاً مختلفاً' : 'Try a different route or date',
    routeReady: ar ? 'جاهزية المسار' : 'Route readiness',
    bookingReady: ar ? 'جاهزية الحجز' : 'Booking readiness',
    recentSearches: ar ? 'عمليات البحث الأخيرة' : 'Recent searches',
    recommendedForYou: ar ? 'موصى بها لك' : 'Recommended for you',
    instantMatch: ar ? 'مطابقة فورية' : 'Instant match',
    searchHelp: ar ? 'اختر مدينتين مختلفتين لعرض أفضل الرحلات.' : 'Choose two different cities to unlock the best rides.',
    dateHelp: ar ? 'التاريخ اختياري، لكن إضافته تجعل النتائج أدق.' : 'Date is optional, but it makes the results more precise.',
    bookedTrips: ar ? 'رحلاتك المحجوزة' : 'Your booked trips',
    bookingSaved: ar ? 'تم حفظ الحجز في حسابك.' : 'This booking is now saved in your account.',
    bookingStarted: ar ? 'تم بدء الحجز' : 'Booking started',
    chooseDifferentCities: ar ? 'اختر مدينتين مختلفتين.' : 'Choose different origin and destination cities.',
    routeSummary: ar ? 'ملخص المسار' : 'Route summary',
    seatsLeft: ar ? 'مقاعد متبقية' : 'Seats left',
    routeIntensity: ar ? 'كثافة المسار' : 'Route intensity',
    fallbackOptions: ar ? 'خيارات بديلة' : 'Fallback options',
    clearDateFilter: ar ? 'امسح فلتر التاريخ' : 'Clear date filter',
    openBusFallback: ar ? 'افتح الباصات لهذا المسار' : 'Open bus fallback',
    nearbyCorridors: ar ? 'ممرات قريبة' : 'Nearby corridors',
    seatsStillMove: ar ? 'المقاعد تتحرك سريعاً على هذا المسار.' : 'Seats move quickly on this corridor.',
    noTripsYet: ar ? 'لا توجد رحلات محفوظة بعد. أول حجز سيظهر هنا.' : 'No trips reserved yet. Your first confirmed ride will appear here.',
    bookingSavedBetter: ar ? 'تم حفظ المقعد مع التنبيهات وتفاصيل الصعود.' : 'Seat saved with departure alerts and boarding details.',
    busSupport: ar ? 'إذا امتلأت الرحلة، افتح الباصات أو جرّب موعداً قريباً.' : 'If the ride fills up, open buses or try a nearby departure.',
    sendPackageTitle: ar ? 'أرسل طرداً مع رحلة' : 'Send a Package with a Ride',
    deliveryRoute: ar ? 'مسار التوصيل' : 'Delivery Route',
    deliveryHint: ar ? 'المسار يربط بين المرسل والراكب والمستلم في رحلة واحدة واضحة.' : 'The route connects sender, rider, and receiver in one clear trip.',
    packageFriendly: ar ? 'مناسب للطرود' : 'Package-friendly',
    weight: ar ? 'الوزن' : 'Weight',
    note: ar ? 'ملاحظة' : 'Note',
    notePh: ar ? 'قابل للكسر، يرجى التعامل بحذر...' : 'Fragile, handle with care...',
    sendPackageBtn: ar ? 'إرسال الطرد مع الرحلة' : 'Send package with ride',
    sentTitle: ar ? 'تم إرسال طلب الطرد للراكب!' : 'Package request sent to a rider',
    sendAnother: ar ? 'أرسل طرداً آخر' : 'Send Another',
    matchingDesc: ar ? 'سنطابقك مع راكب موثوق متجه إلى' : "We'll match you with a verified rider heading to",
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
    if (!routeEndpointsAreDistinct(form.from, form.to)) return 'Origin and destination need to be different locations.';
    if (!form.date) return 'Choose a departure date.';
    if (!form.time) return 'Choose a departure time.';
  }
  if (targetStep >= 2) {
    if (form.seats < 1 || form.seats > 7) return 'Seats should be between 1 and 7.';
    if (form.price < 1 || form.price > 50) return 'Price should be between 1 and 50 JOD.';
    if (!form.carModel.trim()) return 'Add the car model so riders know what to expect.';
  }
  if (targetStep >= 3 && form.acceptsPackages && !form.packageNote.trim()) {
    return 'Add a short package note when package delivery is enabled.';
  }
  return null;
}

export function createPackageComposer(): PackageComposer {
  return {
    from: 'Amman',
    to: 'Aqaba',
    weight: '<1 kg',
    recipientName: '',
    recipientPhone: '',
    note: '',
    sent: false,
    trackingId: '',
  };
}

export function validatePackageComposer(pkg: PackageComposer) {
  if (!routeEndpointsAreDistinct(pkg.from, pkg.to)) return 'Pickup and destination need to be different locations.';
  if (!pkg.recipientName.trim()) return 'Add the recipient name so the captain knows who will receive it.';
  if (pkg.recipientPhone.replace(/[^\d]/g, '').length < 9) return 'Add a valid recipient phone number.';
  return null;
}

export function scoreRideForRecommendation(ride: Ride) {
  return (ride.driver.rating * 10) + (ride.seatsAvailable * 2) + (ride.prayerStops ? 2 : 0) + (ride.pkgCapacity !== 'none' ? 1 : 0);
}
