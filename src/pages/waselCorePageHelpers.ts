import { CITIES, type Ride } from './waselCoreRideData';

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

export function parseFindRideParams(search: string) {
  const corridorParams = new URLSearchParams(search);
  return {
    initialFrom: CITIES.includes(corridorParams.get('from') ?? '')
      ? (corridorParams.get('from') ?? '')
      : 'Amman',
    initialTo: CITIES.includes(corridorParams.get('to') ?? '')
      ? (corridorParams.get('to') ?? '')
      : 'Aqaba',
    initialDate: corridorParams.get('date') ?? '',
    initialSearched: corridorParams.get('search') === '1',
  };
}

function tr(ar: boolean, en: string, arText: string): string {
  return ar ? arText : en;
}

export function createFindRideCopy(ar: boolean): FindRideCopy {
  return {
    from: tr(ar, 'FROM', 'من'),
    to: tr(ar, 'TO', 'إلى'),
    date: tr(ar, 'DATE', 'التاريخ'),
    searchRides: tr(ar, 'Search Rides', 'ابحث عن الرحلات'),
    searching: tr(ar, 'Searching...', 'جارٍ البحث...'),
    searchRoute: tr(ar, 'Search Route', 'مسار البحث'),
    previewCorridor: tr(
      ar,
      'Preview the corridor before browsing rides.',
      'عاين المسار قبل استعراض الرحلات.',
    ),
    clearFirstStep: tr(ar, 'Clear from the first step', 'واضح من الخطوة الأولى'),
    popularRoutes: tr(ar, 'Popular routes', 'مسارات شائعة'),
    showing: tr(ar, 'Showing', 'عرض'),
    rides: tr(ar, 'rides', 'رحلات'),
    ride: tr(ar, 'ride', 'رحلة'),
    found: tr(ar, 'found', 'موجودة'),
    cheapest: tr(ar, 'Cheapest', 'الأرخص'),
    earliest: tr(ar, 'Earliest', 'الأبكر'),
    topRated: tr(ar, 'Top Rated', 'الأعلى تقييماً'),
    noRidesFound: tr(ar, 'No rides found', 'لا توجد رحلات'),
    tryDifferent: tr(ar, 'Try a different route or date', 'جرّب مساراً أو تاريخاً مختلفاً'),
    routeReady: tr(ar, 'Route readiness', 'جاهزية المسار'),
    bookingReady: tr(ar, 'Booking readiness', 'جاهزية الحجز'),
    recentSearches: tr(ar, 'Recent searches', 'عمليات البحث الأخيرة'),
    recommendedForYou: tr(ar, 'Recommended for you', 'موصى بها لك'),
    instantMatch: tr(ar, 'Instant match', 'مطابقة فورية'),
    searchHelp: tr(
      ar,
      'Choose two different cities to unlock the best rides.',
      'اختر مدينتين مختلفتين لعرض أفضل الرحلات.',
    ),
    dateHelp: tr(
      ar,
      'Date is optional, but it makes the results more precise.',
      'التاريخ اختياري، لكن إضافته تجعل النتائج أدق.',
    ),
    bookedTrips: tr(ar, 'Your booked trips', 'رحلاتك المحجوزة'),
    bookingSaved: tr(ar, 'This booking is now saved in your account.', 'تم حفظ الحجز في حسابك.'),
    bookingStarted: tr(ar, 'Booking started', 'تم بدء الحجز'),
    chooseDifferentCities: tr(
      ar,
      'Choose different origin and destination cities.',
      'اختر مدينتين مختلفتين.',
    ),
    routeSummary: tr(ar, 'Route summary', 'ملخص المسار'),
    seatsLeft: tr(ar, 'Seats left', 'مقاعد متبقية'),
    routeIntensity: tr(ar, 'Route intensity', 'كثافة المسار'),
    fallbackOptions: tr(ar, 'Fallback options', 'خيارات بديلة'),
    clearDateFilter: tr(ar, 'Clear date filter', 'امسح فلتر التاريخ'),
    openBusFallback: tr(ar, 'Open bus fallback', 'افتح الباصات لهذا المسار'),
    nearbyCorridors: tr(ar, 'Nearby corridors', 'ممرات قريبة'),
    seatsStillMove: tr(
      ar,
      'Seats move quickly on this corridor.',
      'المقاعد تتحرك سريعاً على هذا المسار.',
    ),
    noTripsYet: tr(
      ar,
      'No trips reserved yet. Your first confirmed ride will appear here.',
      'لا توجد رحلات محفوظة بعد. أول حجز سيظهر هنا.',
    ),
    bookingSavedBetter: tr(
      ar,
      'Seat saved with departure alerts and boarding details.',
      'تم حفظ المقعد مع التنبيهات وتفاصيل الصعود.',
    ),
    busSupport: tr(
      ar,
      'If the ride fills up, open buses or try a nearby departure.',
      'إذا امتلأت الرحلة، افتح الباصات أو جرّب موعداً قريباً.',
    ),
    sendPackageTitle: tr(ar, 'Send a Package with a Ride', 'أرسل طرداً مع رحلة'),
    deliveryRoute: tr(ar, 'Delivery Route', 'مسار التوصيل'),
    deliveryHint: tr(
      ar,
      'The route connects sender, rider, and receiver in one clear trip.',
      'المسار يربط بين المرسل والراكب والمستلم في رحلة واحدة واضحة.',
    ),
    packageFriendly: tr(ar, 'Package-friendly', 'مناسب للطرود'),
    weight: tr(ar, 'Weight', 'الوزن'),
    note: tr(ar, 'Note', 'ملاحظة'),
    notePh: tr(ar, 'Fragile, handle with care...', 'قابل للكسر، يرجى التعامل بحذر...'),
    sendPackageBtn: tr(ar, 'Send package with ride', 'إرسال الطرد مع الرحلة'),
    sentTitle: tr(ar, 'Package request sent to a rider', 'تم إرسال طلب الطرد للراكب!'),
    sendAnother: tr(ar, 'Send Another', 'أرسل طرداً آخر'),
    matchingDesc: tr(
      ar,
      "We'll match you with a verified rider heading to",
      'سنطابقك مع راكب موثوق متجه إلى',
    ),
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
    if (form.from === form.to) {return 'Origin and destination need to be different.';}
    if (!form.date) {return 'Choose a departure date.';}
    if (!form.time) {return 'Choose a departure time.';}
  }
  if (targetStep >= 2) {
    if (form.seats < 1 || form.seats > 7) {return 'Seats should be between 1 and 7.';}
    if (form.price < 1 || form.price > 50) {return 'Price should be between 1 and 50 JOD.';}
    if (!form.carModel.trim()) {return 'Add the car model so riders know what to expect.';}
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
  if (pkg.from === pkg.to) {return 'Pickup and destination need to be different cities.';}
  if (!pkg.recipientName.trim())
    {return 'Add the recipient name so the captain knows who will receive it.';}
  if (pkg.recipientPhone.replace(/[^\d]/g, '').length < 9)
    {return 'Add a valid recipient phone number.';}
  return null;
}

export function scoreRideForRecommendation(ride: Ride) {
  return (
    ride.driver.rating * 10 +
    ride.seatsAvailable * 2 +
    (ride.prayerStops ? 2 : 0) +
    (ride.pkgCapacity !== 'none' ? 1 : 0)
  );
}
