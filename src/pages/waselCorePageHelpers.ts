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
  routePreview: string;
  routeActivity: (searches: number, bookings: number, alerts: number) => string;
  selectRouteSignals: string;
  demandScore: string;
  openMyTrips: string;
  keepBrowsing: string;
  availableDepartures: string;
  departureCount: (count: number) => string;
  departuresOnRoute: string;
  sharedSeatPrice: string;
  savingsVsSolo: (amount: number) => string;
  priceAfterSearch: string;
  nextDepartureWindow: string;
  checkAfterSearch: string;
  pickupPointShown: string;
  routeReliability: string;
  growing: string;
  savedAlerts: (count: number) => string;
  resultsTitle: (from: string, to: string, count: number) => string;
  popularRoutesTitle: (count: number) => string;
  bestPrice: (amount: number) => string;
  nextDeparture: (window: string) => string;
  noRideYet: (window?: string) => string;
  activeAlerts: (count: number) => string;
  soldOut: string;
  whyRouteFits: string;
  demandSignalsFor: (from: string, to: string) => string;
  nextWaveFrom: (window: string, pickup: string) => string;
  basedOn: (sources: string) => string;
  demandBuildsBeforeDeparture: string;
  pickupPointsStaySimple: string;
  sharedRidesStayCheaper: string;
  popularRoutesHeading: string;
  strongestDemandOutlook: string;
  ridesCarryPackages: string;
  ridesAcceptParcels: string;
  suggestedReminders: string;
  searchRouteButton: string;
  reminderActive: string;
  saveReminder: string;
  bookMoreForReminders: string;
  savedReminders: string;
  saveRouteForReminders: string;
  bestRideMatches: string;
  ownershipScore: string;
  booked: string;
  weeklySignals: (count: number) => string;
  formatCurrency: (amount: number) => string;
  routeLabel: (from: string, to: string) => string;
  rideFullMessage: (from: string, to: string, busFallback: string) => string;
  bookingRequestSent: (from: string, to: string) => string;
  seatConfirmed: (from: string, to: string) => string;
  paymentFailed: (from: string, to: string) => string;
  routeRequestNotification: (from: string, to: string, amount: string) => string;
  seatConfirmedNotification: (from: string, to: string, time: string, amount: string) => string;
  bookingFailed: (from: string, to: string) => string;
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
  const formatCurrency = (amount: number) => new Intl.NumberFormat(ar ? 'ar-JO' : 'en-JO', {
    style: 'currency', currency: 'JOD', maximumFractionDigits: 2,
  }).format(amount);

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
    routePreview: tr(ar, 'Route preview', 'معاينة المسار'),
    routeActivity: (searches, bookings, alerts) => ar
      ? `نشاط المسار: ${searches} بحث · ${bookings} حجز · ${alerts} تنبيه`
      : `Your route activity: ${searches} searches · ${bookings} bookings · ${alerts} alerts`,
    selectRouteSignals: tr(ar, 'Select a route above to see demand signals.', 'اختر مساراً لعرض مؤشرات الطلب.'),
    demandScore: tr(ar, 'demand score', 'مؤشر الطلب'),
    openMyTrips: tr(ar, 'Open My Trips', 'رحلاتي'),
    keepBrowsing: tr(ar, 'Keep Browsing', 'متابعة التصفح'),
    availableDepartures: tr(ar, 'Available departures', 'الرحلات المتاحة'),
    departureCount: count => ar ? `${count} رحلة` : `${count} departure${count === 1 ? '' : 's'}`,
    departuresOnRoute: tr(ar, 'Departures listed on this route', 'رحلة على هذا المسار'),
    sharedSeatPrice: tr(ar, 'Shared seat price', 'سعر المقعد المشترك'),
    savingsVsSolo: amount => ar ? `وفّر ${formatCurrency(amount)} مقارنة برحلة خاصة` : `Save ${formatCurrency(amount)} vs solo`,
    priceAfterSearch: tr(ar, 'Price shown after search', 'يظهر السعر بعد البحث'),
    nextDepartureWindow: tr(ar, 'Next departure window', 'موعد الانطلاق القادم'),
    checkAfterSearch: tr(ar, 'Check after search', 'تحقق بعد البحث'),
    pickupPointShown: tr(ar, 'Pickup point shown here', 'سيظهر موقع الالتقاء هنا'),
    routeReliability: tr(ar, 'Route reliability', 'موثوقية المسار'),
    growing: tr(ar, 'Growing', 'في نمو'),
    savedAlerts: count => ar ? `${count} تنبيه محفوظ` : `${count} saved alerts`,
    resultsTitle: (from, to, count) => ar
      ? `من ${from} إلى ${to} · ${count} رحلة`
      : `${from} → ${to} · ${count} ride${count === 1 ? '' : 's'} found`,
    popularRoutesTitle: count => ar ? `مسارات شائعة · ${count} رحلة` : `Popular routes · ${count} departures`,
    bestPrice: amount => ar ? `أفضل سعر ${formatCurrency(amount)}` : `Best price ${formatCurrency(amount)}`,
    nextDeparture: window => ar ? `الانطلاق القادم ${window}` : `Next departure ${window}`,
    noRideYet: window => ar
      ? `لا توجد رحلة متاحة حالياً. احفظ المسار لتصلك رسالة عند توفر رحلة${window ? ` قرب ${window}` : ''}.`
      : `No ride found yet. Save this route and get alerted when one opens${window ? ` around ${window}` : ''}.`,
    activeAlerts: count => ar ? `${count} تنبيه نشط` : `${count} active alert${count === 1 ? '' : 's'}.`,
    soldOut: tr(ar, 'Sold out', 'نفدت المقاعد'),
    whyRouteFits: tr(ar, 'Why this route fits', 'لماذا يناسبك هذا المسار'),
    demandSignalsFor: (from, to) => ar ? `مؤشرات الطلب من ${from} إلى ${to}.` : `Demand signals for ${from} → ${to}.`,
    nextWaveFrom: (window, pickup) => ar ? `الموعد القادم: ${window} من ${pickup}.` : `Next wave: ${window} from ${pickup}.`,
    basedOn: sources => ar ? `بناءً على: ${sources}.` : `Based on: ${sources}.`,
    demandBuildsBeforeDeparture: tr(ar, 'Demand builds before departure.', 'يزداد الطلب قبل موعد الانطلاق.'),
    pickupPointsStaySimple: tr(ar, 'Pickup points stay simple.', 'نقاط الالتقاء واضحة وسهلة.'),
    sharedRidesStayCheaper: tr(ar, 'Shared rides stay cheaper.', 'الرحلات المشتركة أقل تكلفة.'),
    popularRoutesHeading: tr(ar, 'Popular routes', 'المسارات الشائعة'),
    strongestDemandOutlook: tr(ar, 'Routes with the strongest demand outlook.', 'المسارات ذات توقعات الطلب الأعلى.'),
    ridesCarryPackages: tr(ar, 'Rides that also carry packages', 'رحلات تنقل الطرود أيضاً'),
    ridesAcceptParcels: tr(ar, 'Some rides accept parcels on the same route.', 'بعض الرحلات تستقبل الطرود على المسار نفسه.'),
    suggestedReminders: tr(ar, 'Suggested reminders', 'تذكيرات مقترحة'),
    searchRouteButton: tr(ar, 'Search route', 'ابحث عن المسار'),
    reminderActive: tr(ar, 'Reminder active', 'التذكير مفعّل'),
    saveReminder: tr(ar, 'Save reminder', 'احفظ التذكير'),
    bookMoreForReminders: tr(ar, 'Book more rides to unlock reminders.', 'احجز رحلات أكثر لتفعيل التذكيرات.'),
    savedReminders: tr(ar, 'Saved reminders', 'التذكيرات المحفوظة'),
    saveRouteForReminders: tr(ar, 'Save a route to see reminders here.', 'احفظ مساراً لعرض تذكيراته هنا.'),
    bestRideMatches: tr(ar, 'Best ride matches', 'أفضل الرحلات المطابقة'),
    ownershipScore: tr(ar, 'route strength', 'قوة المسار'),
    booked: tr(ar, 'Booked', 'محجوزة'),
    weeklySignals: count => ar ? `${count} مؤشرات أسبوعية` : `${count} signals`,
    formatCurrency,
    routeLabel: (from, to) => ar ? `من ${from} إلى ${to}` : `${from} to ${to}`,
    rideFullMessage: (from, to, busFallback) => ar
      ? `اكتملت مقاعد الرحلة من ${from} إلى ${to}. ${busFallback}.`
      : `That ride from ${from} to ${to} is full. ${busFallback}.`,
    bookingRequestSent: (from, to) => ar
      ? `تم إرسال طلب الرحلة من ${from} إلى ${to}.`
      : `Request sent for ${from} to ${to}.`,
    seatConfirmed: (from, to) => ar
      ? `تم تأكيد مقعدك في رحلة ${from} إلى ${to}.`
      : `Seat confirmed for ${from} to ${to}.`,
    paymentFailed: (from, to) => ar
      ? `أُلغِي حجز الرحلة من ${from} إلى ${to} لأن الدفع لم يكتمل. تحقّق من رصيد محفظتك وحاول مرة أخرى.`
      : `Booking for ${from} to ${to} was cancelled because payment could not be processed. Please check your wallet balance and try again.`,
    routeRequestNotification: (from, to, amount) => ar
      ? `بانتظار موافقة السائق على طلبك لرحلة ${from} إلى ${to}. السعر ${amount}.`
      : `${from} to ${to} is waiting for driver approval at ${amount}.`,
    seatConfirmedNotification: (from, to, time, amount) => ar
      ? `أُضيفت رحلة ${from} إلى ${to} الساعة ${time} إلى رحلاتك. السعر ${amount}.`
      : `${from} to ${to} at ${time} is now in your trips at ${amount} with boarding reminders.`,
    bookingFailed: (from, to) => ar
      ? `تعذّر إكمال حجز الرحلة من ${from} إلى ${to}. تحقّق من اتصالك وحاول مرة أخرى.`
      : `Could not complete booking for ${from} to ${to}. Please check your connection and try again.`,
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

export function validateOfferRideStep(form: OfferRideForm, targetStep: number, ar = false) {
  // Step 1: basic route info + seat validation
  if (targetStep >= 1) {
    if (form.from === form.to) {
      return tr(ar, 'Origin and destination need to be different.', 'يجب أن تختلف مدينة الانطلاق عن مدينة الوصول.');
    }
    // Seats must be between 1 and 7 on step 1
    if (form.seats < 1 || form.seats > 7) {
      return tr(ar, 'Seats should be between 1 and 7.', 'يجب أن يكون عدد المقاعد بين ١ و٧.');
    }
    // NOTE: date and time are only required from step 2 onward (tests expect step 1 to pass without them)
  }

  // Step 2: schedule details (date & time)
  if (targetStep >= 2) {
    if (!form.date) {return tr(ar, 'Choose a departure date.', 'اختر تاريخ المغادرة.');}
    if (!form.time) {return tr(ar, 'Choose a departure time.', 'اختر وقت المغادرة.');}
  }

  // Step 3: vehicle & pricing details
  if (targetStep >= 3) {
    if (form.price < 1 || form.price > 50) {return tr(ar, 'Price should be between 1 and 50 JOD.', 'يجب أن يكون السعر بين ١ و٥٠ ديناراً أردنياً.');}
    if (!form.carModel?.trim()) {return tr(ar, 'Add the car model so riders know what to expect.', 'أضف طراز السيارة ليعرف الركاب ما يتوقعونه.');}
  }

  // Step 4: optional package note
  if (targetStep >= 4 && form.acceptsPackages && !form.packageNote?.trim()) {
    return tr(ar, 'Add a short package note when package delivery is enabled.', 'أضف ملاحظة قصيرة عن الطرود عند تفعيل خدمة التوصيل.');
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
