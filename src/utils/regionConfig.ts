/**
 * MENA Region Configuration — Wasel | واصل
 * Single source of truth for all country-specific configurations:
 *   fuel prices, popular city-to-city routes, cultural rules,
 *   package delivery availability, and launch status.
 *
 * Countries: JO, EG, SA, AE, KW, BH, QA, OM, LB, PS, MA, TN, IQ
 *
 * Package delivery (Raje3) is ALWAYS secondary to carpooling trips.
 * A package can only travel on an existing trip — never standalone.
 */

// ─── Country Code ─────────────────────────────────────────────────────────────

export type CountryCode =
  | 'JO' | 'EG' | 'SA' | 'AE' | 'KW'
  | 'BH' | 'QA' | 'OM' | 'LB' | 'PS'
  | 'MA' | 'TN' | 'IQ';

// ─── Fuel Config ──────────────────────────────────────────────────────────────

export interface RegionFuelConfig {
  /** Price in local currency per litre */
  pricePerLitre: number;
  /** Local currency ISO code */
  currency: string;
  /** JOD equivalent (for cross-country cost calculations) */
  priceInJOD: number;
  /** Average L/100km — varies by road quality and car type */
  efficiencyLper100km: number;
}

// ─── City Route ───────────────────────────────────────────────────────────────

export type RouteTier = 1 | 2 | 3;

export interface CityRoute {
  id: string;
  from: string;
  fromAr: string;
  to: string;
  toAr: string;
  distanceKm: number;
  /** Driving time in minutes (excludes prayer/rest stops) */
  durationMin: number;
  hasTolls: boolean;
  /** Toll cost in local currency */
  tollCostLocal: number;
  /** Tier 1 = launch routes, 2 = expansion, 3 = future */
  tier: RouteTier;
  popular: boolean;
  /** Package delivery supported on this route */
  packageEnabled: boolean;
  /** Typical use case label */
  useCase: string;
  useCaseAr: string;
}

// ─── Cultural Rules ───────────────────────────────────────────────────────────

export interface CulturalRules {
  /** Gender segregation is mandatory or strongly preferred */
  genderSegregationMandatory: boolean;
  /** Women-only rides are a significant user demand */
  highDemandWomenOnly: boolean;
  /** Hijri calendar used as primary */
  hijriCalendar: boolean;
  /** Friday + Saturday weekend */
  fridayWeekend: boolean;
  /** Ramadan operational changes apply */
  ramadanModeSupported: boolean;
  /** Prayer stop UI enabled by default */
  prayerStopsDefault: boolean;
  /** Conservative dress code expectations */
  conservativeDress: boolean;
  /** Cash on arrival accepted at higher trust threshold */
  cashOnArrivalThresholdJOD: number;
}

// ─── Region Config ────────────────────────────────────────────────────────────

export interface RegionConfig {
  iso: CountryCode;
  name: string;
  nameAr: string;
  currency: string;
  flag: string;
  phoneCode: string;
  timezone: string;
  fuel: RegionFuelConfig;
  /** ISO weekday numbers that are weekend: 5=Fri, 6=Sat, 0=Sun */
  weekendDays: number[];
  minDriverAge: number;
  minPassengerAge: number;
  allowsCrossBorder: boolean;
  cultural: CulturalRules;
  routes: CityRoute[];
  launchStatus: 'active' | 'beta' | 'coming_soon' | 'planned';
  /** Raje3 package delivery available in this region */
  packageDeliveryEnabled: boolean;
  /** Languages supported (primary first) */
  languages: string[];
}

// ─── Jordan ───────────────────────────────────────────────────────────────────

const JORDAN: RegionConfig = {
  iso: 'JO',
  name: 'Jordan',
  nameAr: 'الأردن',
  currency: 'JOD',
  flag: '🇯🇴',
  phoneCode: '+962',
  timezone: 'Asia/Amman',
  fuel: {
    pricePerLitre: 0.90,
    currency: 'JOD',
    priceInJOD: 0.90,
    efficiencyLper100km: 8,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 20,
  },
  launchStatus: 'active',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    // Tier 1 — Launch routes
    {
      id: 'JO_AMM_AQB',
      from: 'Amman', fromAr: 'عمّان', to: 'Aqaba', toAr: 'العقبة',
      distanceKm: 330, durationMin: 240, hasTolls: true, tollCostLocal: 2,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Beach weekends, port visits', useCaseAr: 'نهايات الأسبوع والميناء',
    },
    {
      id: 'JO_AMM_IRB',
      from: 'Amman', fromAr: 'عمّان', to: 'Irbid', toAr: 'إربد',
      distanceKm: 85, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'University students (Yarmouk)', useCaseAr: 'طلاب اليرموك',
    },
    {
      id: 'JO_AMM_DSA',
      from: 'Amman', fromAr: 'عمّان', to: 'Dead Sea', toAr: 'البحر الميت',
      distanceKm: 60, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Tourists, spa visits', useCaseAr: 'سياحة ومنتجعات',
    },
    {
      id: 'JO_AMM_ZRQ',
      from: 'Amman', fromAr: 'عمّان', to: 'Zarqa', toAr: 'الزرقاء',
      distanceKm: 30, durationMin: 35, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Daily commuters, family', useCaseAr: 'موظفون وعائلات',
    },
    // Tier 2 — Expansion
    {
      id: 'JO_AMM_PTR',
      from: 'Amman', fromAr: 'عمّان', to: 'Petra', toAr: 'البتراء',
      distanceKm: 250, durationMin: 180, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: true, packageEnabled: false,
      useCase: 'Tourism, heritage sites', useCaseAr: 'سياحة وتراث',
    },
    {
      id: 'JO_AMM_WRM',
      from: 'Amman', fromAr: 'عمّان', to: 'Wadi Rum', toAr: 'وادي رم',
      distanceKm: 320, durationMin: 240, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: false,
      useCase: 'Camping, desert tourism', useCaseAr: 'تخييم وسياحة صحراوية',
    },
    {
      id: 'JO_AMM_MDB',
      from: 'Amman', fromAr: 'عمّان', to: 'Madaba', toAr: 'مادبا',
      distanceKm: 33, durationMin: 40, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Religious tourism, day trips', useCaseAr: 'سياحة دينية',
    },
    {
      id: 'JO_AMM_MAN',
      from: 'Amman', fromAr: 'عمّان', to: "Ma'an", toAr: 'معان',
      distanceKm: 210, durationMin: 150, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Trade, business', useCaseAr: 'تجارة وأعمال',
    },
    {
      id: 'JO_IRB_AQB',
      from: 'Irbid', fromAr: 'إربد', to: 'Aqaba', toAr: 'العقبة',
      distanceKm: 380, durationMin: 300, hasTolls: true, tollCostLocal: 2,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Students returning home', useCaseAr: 'طلاب عائدون لبيوتهم',
    },
  ],
};

// ─── Egypt ────────────────────────────────────────────────────────────────────

const EGYPT: RegionConfig = {
  iso: 'EG',
  name: 'Egypt',
  nameAr: 'مصر',
  currency: 'EGP',
  flag: '🇪🇬',
  phoneCode: '+20',
  timezone: 'Africa/Cairo',
  fuel: {
    pricePerLitre: 13.75,       // EGP 13.75/L (95 octane, 2026)
    currency: 'EGP',
    priceInJOD: 0.20,           // ≈ JOD 0.20/L
    efficiencyLper100km: 9,     // Slightly higher — stop-go city traffic
  },
  weekendDays: [5, 6],
  minDriverAge: 21,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 15,
  },
  launchStatus: 'beta',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    // Tier 1 — Egypt launch routes
    {
      id: 'EG_CAI_ALX',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Alexandria', toAr: 'الإسكندرية',
      distanceKm: 220, durationMin: 150, hasTolls: true, tollCostLocal: 20,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Summer vacations, business', useCaseAr: 'إجازات صيفية وأعمال',
    },
    {
      id: 'EG_CAI_SHM',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Sharm El-Sheikh', toAr: 'شرم الشيخ',
      distanceKm: 480, durationMin: 360, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Tourism, diving, Red Sea', useCaseAr: 'سياحة وغوص',
    },
    {
      id: 'EG_CAI_HRG',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Hurghada', toAr: 'الغردقة',
      distanceKm: 390, durationMin: 300, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Tourism, Red Sea resorts', useCaseAr: 'منتجعات البحر الأحمر',
    },
    {
      id: 'EG_CAI_PSA',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Port Said', toAr: 'بورسعيد',
      distanceKm: 180, durationMin: 120, hasTolls: true, tollCostLocal: 10,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Trade, family visits', useCaseAr: 'تجارة وعائلة',
    },
    {
      id: 'EG_CAI_SUZ',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Suez', toAr: 'السويس',
      distanceKm: 130, durationMin: 90, hasTolls: true, tollCostLocal: 8,
      tier: 1, popular: false, packageEnabled: true,
      useCase: 'Industrial, canal workers', useCaseAr: 'صناعة وقناة السويس',
    },
    {
      id: 'EG_CAI_ISM',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Ismailia', toAr: 'الإسماعيلية',
      distanceKm: 120, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: false, packageEnabled: true,
      useCase: 'Canal Zone, family', useCaseAr: 'منطقة القناة والعائلة',
    },
    // Tier 2
    {
      id: 'EG_CAI_LXR',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Luxor', toAr: 'الأقصر',
      distanceKm: 650, durationMin: 480, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: true, packageEnabled: false,
      useCase: 'Ancient Egypt tourism', useCaseAr: 'سياحة مصر القديمة',
    },
    {
      id: 'EG_CAI_ASW',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Aswan', toAr: 'أسوان',
      distanceKm: 880, durationMin: 600, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: false,
      useCase: 'Nile tourism, heritage', useCaseAr: 'سياحة النيل',
    },
    {
      id: 'EG_CAI_MNS',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Mansoura', toAr: 'المنصورة',
      distanceKm: 120, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: true, packageEnabled: true,
      useCase: 'University students (Mansoura Uni)', useCaseAr: 'طلاب جامعة المنصورة',
    },
    {
      id: 'EG_CAI_FYM',
      from: 'Cairo', fromAr: 'القاهرة', to: 'Fayoum', toAr: 'الفيوم',
      distanceKm: 100, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Day trips, ecotourism', useCaseAr: 'نزهات ورحلات بيئية',
    },
    {
      id: 'EG_ALX_PSA',
      from: 'Alexandria', fromAr: 'الإسكندرية', to: 'Port Said', toAr: 'بورسعيد',
      distanceKm: 240, durationMin: 180, hasTolls: true, tollCostLocal: 12,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Coastal route, trade', useCaseAr: 'طريق ساحلي وتجارة',
    },
  ],
};

// ─── Saudi Arabia ─────────────────────────────────────────────────────────────

const SAUDI_ARABIA: RegionConfig = {
  iso: 'SA',
  name: 'Saudi Arabia',
  nameAr: 'المملكة العربية السعودية',
  currency: 'SAR',
  flag: '🇸🇦',
  phoneCode: '+966',
  timezone: 'Asia/Riyadh',
  fuel: {
    pricePerLitre: 2.18,        // SAR 2.18/L (91 octane, subsidized)
    currency: 'SAR',
    priceInJOD: 0.41,
    efficiencyLper100km: 10,    // Higher — highway driving, big cars
  },
  weekendDays: [5, 6],
  minDriverAge: 21,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,  // Post-2019 reforms
    highDemandWomenOnly: true,
    hijriCalendar: true,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: true,
    cashOnArrivalThresholdJOD: 30,
  },
  launchStatus: 'coming_soon',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    {
      id: 'SA_RYD_JED',
      from: 'Riyadh', fromAr: 'الرياض', to: 'Jeddah', toAr: 'جدة',
      distanceKm: 950, durationMin: 540, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Business, Hajj/Umrah prep', useCaseAr: 'أعمال وحج وعمرة',
    },
    {
      id: 'SA_RYD_DMM',
      from: 'Riyadh', fromAr: 'الرياض', to: 'Dammam', toAr: 'الدمام',
      distanceKm: 400, durationMin: 240, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Eastern Province, oil workers', useCaseAr: 'المنطقة الشرقية',
    },
    {
      id: 'SA_JED_MEC',
      from: 'Jeddah', fromAr: 'جدة', to: 'Mecca', toAr: 'مكة المكرمة',
      distanceKm: 80, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Umrah, religious visits', useCaseAr: 'عمرة وزيارات دينية',
    },
    {
      id: 'SA_JED_MED',
      from: 'Jeddah', fromAr: 'جدة', to: 'Medina', toAr: 'المدينة المنورة',
      distanceKm: 420, durationMin: 270, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Religious pilgrimage', useCaseAr: 'زيارة المدينة النبوية',
    },
    {
      id: 'SA_RYD_MED',
      from: 'Riyadh', fromAr: 'الرياض', to: 'Medina', toAr: 'المدينة المنورة',
      distanceKm: 980, durationMin: 600, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Long-distance pilgrimage route', useCaseAr: 'رحلة دينية طويلة',
    },
    {
      id: 'SA_JED_TAF',
      from: 'Jeddah', fromAr: 'جدة', to: 'Taif', toAr: 'الطائف',
      distanceKm: 90, durationMin: 80, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: true, packageEnabled: true,
      useCase: 'Mountain city escape, roses', useCaseAr: 'الهروب للجبل والورود',
    },
    {
      id: 'SA_DMM_KHB',
      from: 'Dammam', fromAr: 'الدمام', to: 'Khobar', toAr: 'الخبر',
      distanceKm: 15, durationMin: 20, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Daily commuters, Eastern Province', useCaseAr: 'موظفون المنطقة الشرقية',
    },
  ],
};

// ─── UAE ──────────────────────────────────────────────────────────────────────

const UAE: RegionConfig = {
  iso: 'AE',
  name: 'United Arab Emirates',
  nameAr: 'الإمارات العربية المتحدة',
  currency: 'AED',
  flag: '🇦🇪',
  phoneCode: '+971',
  timezone: 'Asia/Dubai',
  fuel: {
    pricePerLitre: 3.03,       // AED 3.03/L (Special 95, monthly update)
    currency: 'AED',
    priceInJOD: 0.58,
    efficiencyLper100km: 9,
  },
  weekendDays: [5, 6],
  minDriverAge: 21,
  minPassengerAge: 18,
  allowsCrossBorder: true,   // Emirate-to-emirate is intra-country
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: true,
    cashOnArrivalThresholdJOD: 40,
  },
  launchStatus: 'coming_soon',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    {
      id: 'AE_DXB_AUH',
      from: 'Dubai', fromAr: 'دبي', to: 'Abu Dhabi', toAr: 'أبوظبي',
      distanceKm: 150, durationMin: 90, hasTolls: true, tollCostLocal: 4,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Business, government offices', useCaseAr: 'أعمال ودوائر حكومية',
    },
    {
      id: 'AE_DXB_SHJ',
      from: 'Dubai', fromAr: 'دبي', to: 'Sharjah', toAr: 'الشارقة',
      distanceKm: 30, durationMin: 45, hasTolls: true, tollCostLocal: 4,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Daily commuters (most common UAE route)', useCaseAr: 'موظفون يومياً',
    },
    {
      id: 'AE_DXB_AJM',
      from: 'Dubai', fromAr: 'دبي', to: 'Ajman', toAr: 'عجمان',
      distanceKm: 50, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Commuters, affordable living', useCaseAr: 'موظفون وسكن رخيص',
    },
    {
      id: 'AE_AUH_ALN',
      from: 'Abu Dhabi', fromAr: 'أبوظبي', to: 'Al Ain', toAr: 'العين',
      distanceKm: 150, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'University, family', useCaseAr: 'جامعة وعائلة',
    },
    {
      id: 'AE_DXB_FUJ',
      from: 'Dubai', fromAr: 'دبي', to: 'Fujairah', toAr: 'الفجيرة',
      distanceKm: 130, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: true, packageEnabled: false,
      useCase: 'Beach weekends, East Coast', useCaseAr: 'شواطئ الساحل الشرقي',
    },
    {
      id: 'AE_DXB_ALN',
      from: 'Dubai', fromAr: 'دبي', to: 'Al Ain', toAr: 'العين',
      distanceKm: 180, durationMin: 120, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Garden city, university', useCaseAr: 'المدينة الخضراء',
    },
  ],
};

// ─── Kuwait ───────────────────────────────────────────────────────────────────

const KUWAIT: RegionConfig = {
  iso: 'KW',
  name: 'Kuwait',
  nameAr: 'الكويت',
  currency: 'KWD',
  flag: '🇰🇼',
  phoneCode: '+965',
  timezone: 'Asia/Kuwait',
  fuel: {
    pricePerLitre: 0.085,      // KWD 0.085/L — world's cheapest fuel
    currency: 'KWD',
    priceInJOD: 0.20,
    efficiencyLper100km: 10,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: true,
    cashOnArrivalThresholdJOD: 25,
  },
  launchStatus: 'coming_soon',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    {
      id: 'KW_KWT_AHM',
      from: 'Kuwait City', fromAr: 'مدينة الكويت', to: 'Ahmadi', toAr: 'الأحمدي',
      distanceKm: 35, durationMin: 40, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Oil workers, KOC employees', useCaseAr: 'موظفو شركة النفط',
    },
    {
      id: 'KW_KWT_JAH',
      from: 'Kuwait City', fromAr: 'مدينة الكويت', to: 'Jahra', toAr: 'الجهراء',
      distanceKm: 30, durationMin: 35, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Daily commuters', useCaseAr: 'موظفون يومياً',
    },
    {
      id: 'KW_KWT_FAH',
      from: 'Kuwait City', fromAr: 'مدينة الكويت', to: 'Fahaheel', toAr: 'الفحيحيل',
      distanceKm: 25, durationMin: 30, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Commercial district, commuters', useCaseAr: 'منطقة تجارية',
    },
  ],
};

// ─── Bahrain ──────────────────────────────────────────────────────────────────

const BAHRAIN: RegionConfig = {
  iso: 'BH',
  name: 'Bahrain',
  nameAr: 'البحرين',
  currency: 'BHD',
  flag: '🇧🇭',
  phoneCode: '+973',
  timezone: 'Asia/Bahrain',
  fuel: {
    pricePerLitre: 0.205,
    currency: 'BHD',
    priceInJOD: 0.39,
    efficiencyLper100km: 8,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 20,
  },
  launchStatus: 'coming_soon',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    {
      id: 'BH_MNM_RIF',
      from: 'Manama', fromAr: 'المنامة', to: 'Riffa', toAr: 'الرفاع',
      distanceKm: 15, durationMin: 20, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Royal capital commuters', useCaseAr: 'موظفو العاصمة',
    },
    {
      id: 'BH_MNM_HMD',
      from: 'Manama', fromAr: 'المنامة', to: 'Hamad Town', toAr: 'مدينة حمد',
      distanceKm: 20, durationMin: 25, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Residential, daily commuters', useCaseAr: 'سكنية يومية',
    },
  ],
};

// ─── Qatar ────────────────────────────────────────────────────────────────────

const QATAR: RegionConfig = {
  iso: 'QA',
  name: 'Qatar',
  nameAr: 'قطر',
  currency: 'QAR',
  flag: '🇶🇦',
  phoneCode: '+974',
  timezone: 'Asia/Qatar',
  fuel: {
    pricePerLitre: 2.00,
    currency: 'QAR',
    priceInJOD: 0.39,
    efficiencyLper100km: 10,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: true,
    cashOnArrivalThresholdJOD: 35,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    {
      id: 'QA_DOH_RAY',
      from: 'Doha', fromAr: 'الدوحة', to: 'Al Rayyan', toAr: 'الريان',
      distanceKm: 10, durationMin: 20, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Sports City, education city', useCaseAr: 'مدينة الرياضة والتعليم',
    },
    {
      id: 'QA_DOH_WAK',
      from: 'Doha', fromAr: 'الدوحة', to: 'Al Wakrah', toAr: 'الوكرة',
      distanceKm: 25, durationMin: 30, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Southern suburbs, daily commuters', useCaseAr: 'الضواحي الجنوبية',
    },
    {
      id: 'QA_DOH_KHR',
      from: 'Doha', fromAr: 'الدوحة', to: 'Al Khor', toAr: 'الخور',
      distanceKm: 50, durationMin: 45, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Northern Qatar, World Cup legacy', useCaseAr: 'شمال قطر',
    },
  ],
};

// ─── Oman ─────────────────────────────────────────────────────────────────────

const OMAN: RegionConfig = {
  iso: 'OM',
  name: 'Oman',
  nameAr: 'عُمان',
  currency: 'OMR',
  flag: '🇴🇲',
  phoneCode: '+968',
  timezone: 'Asia/Muscat',
  fuel: {
    pricePerLitre: 0.195,
    currency: 'OMR',
    priceInJOD: 0.37,
    efficiencyLper100km: 9,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: true,
    cashOnArrivalThresholdJOD: 25,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en'],
  routes: [
    {
      id: 'OM_MCT_NZW',
      from: 'Muscat', fromAr: 'مسقط', to: 'Nizwa', toAr: 'نزوى',
      distanceKm: 170, durationMin: 120, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Heritage tourism, interior Oman', useCaseAr: 'سياحة تراثية',
    },
    {
      id: 'OM_MCT_SOH',
      from: 'Muscat', fromAr: 'مسقط', to: 'Sohar', toAr: 'صحار',
      distanceKm: 200, durationMin: 120, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: false, packageEnabled: true,
      useCase: 'Industrial port city', useCaseAr: 'مدينة صناعية وميناء',
    },
    {
      id: 'OM_MCT_SUR',
      from: 'Muscat', fromAr: 'مسقط', to: 'Sur', toAr: 'صور',
      distanceKm: 280, durationMin: 180, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: false,
      useCase: 'Turtle Beach, Ras Al Jinz', useCaseAr: 'شاطئ السلاحف',
    },
  ],
};

// ─── Lebanon ──────────────────────────────────────────────────────────────────

const LEBANON: RegionConfig = {
  iso: 'LB',
  name: 'Lebanon',
  nameAr: 'لبنان',
  currency: 'USD',               // USD used in practice due to LBP hyperinflation
  flag: '🇱🇧',
  phoneCode: '+961',
  timezone: 'Asia/Beirut',
  fuel: {
    pricePerLitre: 1.70,         // USD ~$1.70/L (cash, 2026)
    currency: 'USD',
    priceInJOD: 1.21,
    efficiencyLper100km: 8,
  },
  weekendDays: [6, 0],           // Sat + Sun (Christian majority influenced)
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: false,  // More liberal society
    hijriCalendar: false,
    fridayWeekend: false,        // Saturday+Sunday weekend
    ramadanModeSupported: true,
    prayerStopsDefault: false,   // Mixed religious society
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 20,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar', 'en', 'fr'],
  routes: [
    {
      id: 'LB_BEY_TRP',
      from: 'Beirut', fromAr: 'بيروت', to: 'Tripoli', toAr: 'طرابلس',
      distanceKm: 85, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Second city, business', useCaseAr: 'المدينة الثانية وأعمال',
    },
    {
      id: 'LB_BEY_SID',
      from: 'Beirut', fromAr: 'بيروت', to: 'Sidon', toAr: 'صيدا',
      distanceKm: 45, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'South Lebanon, commerce', useCaseAr: 'جنوب لبنان وتجارة',
    },
    {
      id: 'LB_BEY_ZAH',
      from: 'Beirut', fromAr: 'بيروت', to: 'Zahlé', toAr: 'زحلة',
      distanceKm: 55, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Bekaa Valley, wine country', useCaseAr: 'سهل البقاع والنبيذ',
    },
    {
      id: 'LB_BEY_BYB',
      from: 'Beirut', fromAr: 'بيروت', to: 'Byblos', toAr: 'جبيل',
      distanceKm: 40, durationMin: 50, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: true, packageEnabled: false,
      useCase: 'Tourism, Phoenician heritage', useCaseAr: 'سياحة فينيقية',
    },
  ],
};

// ─── Palestine ────────────────────────────────────────────────────────────────

const PALESTINE: RegionConfig = {
  iso: 'PS',
  name: 'Palestine',
  nameAr: 'فلسطين',
  currency: 'JOD',              // JOD used in West Bank
  flag: '🇵🇸',
  phoneCode: '+970',
  timezone: 'Asia/Hebron',
  fuel: {
    pricePerLitre: 1.10,        // JOD ~1.10/L (West Bank)
    currency: 'JOD',
    priceInJOD: 1.10,
    efficiencyLper100km: 8,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 15,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar'],
  routes: [
    {
      id: 'PS_RAM_NAB',
      from: 'Ramallah', fromAr: 'رام الله', to: 'Nablus', toAr: 'نابلس',
      distanceKm: 60, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Students, business', useCaseAr: 'طلاب وأعمال',
    },
    {
      id: 'PS_RAM_HBR',
      from: 'Ramallah', fromAr: 'رام الله', to: 'Hebron', toAr: 'الخليل',
      distanceKm: 35, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Commerce, daily commuters', useCaseAr: 'تجارة ويومي',
    },
  ],
};

// ─── Morocco ──────────────────────────────────────────────────────────────────

const MOROCCO: RegionConfig = {
  iso: 'MA',
  name: 'Morocco',
  nameAr: 'المغرب',
  currency: 'MAD',
  flag: '🇲🇦',
  phoneCode: '+212',
  timezone: 'Africa/Casablanca',
  fuel: {
    pricePerLitre: 14.50,       // MAD 14.50/L (95 SP, 2026)
    currency: 'MAD',
    priceInJOD: 1.03,
    efficiencyLper100km: 7,     // Smaller cars, mountainous roads
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 15,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar', 'fr', 'en'],
  routes: [
    {
      id: 'MA_CAS_MAR',
      from: 'Casablanca', fromAr: 'الدار البيضاء', to: 'Marrakech', toAr: 'مراكش',
      distanceKm: 240, durationMin: 150, hasTolls: true, tollCostLocal: 80,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Tourism capital, business', useCaseAr: 'السياحة والأعمال',
    },
    {
      id: 'MA_CAS_RAB',
      from: 'Casablanca', fromAr: 'الدار البيضاء', to: 'Rabat', toAr: 'الرباط',
      distanceKm: 90, durationMin: 60, hasTolls: true, tollCostLocal: 30,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Capital, government, business', useCaseAr: 'العاصمة والحكومة',
    },
    {
      id: 'MA_CAS_FEZ',
      from: 'Casablanca', fromAr: 'الدار البيضاء', to: 'Fez', toAr: 'فاس',
      distanceKm: 300, durationMin: 210, hasTolls: true, tollCostLocal: 90,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Imperial city, heritage', useCaseAr: 'المدينة الإمبراطورية',
    },
    {
      id: 'MA_MAR_AGA',
      from: 'Marrakech', fromAr: 'مراكش', to: 'Agadir', toAr: 'أكادير',
      distanceKm: 260, durationMin: 180, hasTolls: true, tollCostLocal: 70,
      tier: 2, popular: true, packageEnabled: false,
      useCase: 'Beach resort, Souss Valley', useCaseAr: 'منتجع وسوس',
    },
    {
      id: 'MA_CAS_TAN',
      from: 'Casablanca', fromAr: 'الدار البيضاء', to: 'Tangier', toAr: 'طنجة',
      distanceKm: 340, durationMin: 210, hasTolls: true, tollCostLocal: 100,
      tier: 2, popular: true, packageEnabled: true,
      useCase: 'Port city, Europe gateway', useCaseAr: 'ميناء وبوابة أوروبا',
    },
  ],
};

// ─── Tunisia ──────────────────────────────────────────────────────────────────

const TUNISIA: RegionConfig = {
  iso: 'TN',
  name: 'Tunisia',
  nameAr: 'تونس',
  currency: 'TND',
  flag: '🇹🇳',
  phoneCode: '+216',
  timezone: 'Africa/Tunis',
  fuel: {
    pricePerLitre: 2.44,        // TND 2.44/L (super 95, 2026)
    currency: 'TND',
    priceInJOD: 0.54,
    efficiencyLper100km: 7,
  },
  weekendDays: [6, 0],          // Sat + Sun
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: false,  // Most liberal Arab country
    hijriCalendar: false,
    fridayWeekend: false,
    ramadanModeSupported: true,
    prayerStopsDefault: false,
    conservativeDress: false,
    cashOnArrivalThresholdJOD: 12,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar', 'fr', 'en'],
  routes: [
    {
      id: 'TN_TUN_SFA',
      from: 'Tunis', fromAr: 'تونس', to: 'Sfax', toAr: 'صفاقس',
      distanceKm: 270, durationMin: 180, hasTolls: true, tollCostLocal: 8,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Second city, business', useCaseAr: 'المدينة الثانية',
    },
    {
      id: 'TN_TUN_SOS',
      from: 'Tunis', fromAr: 'تونس', to: 'Sousse', toAr: 'سوسة',
      distanceKm: 140, durationMin: 90, hasTolls: true, tollCostLocal: 5,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Beach resort, tourism', useCaseAr: 'منتجع وسياحة',
    },
    {
      id: 'TN_TUN_HAM',
      from: 'Tunis', fromAr: 'تونس', to: 'Hammamet', toAr: 'الحمامات',
      distanceKm: 60, durationMin: 60, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Beach resort, weekends', useCaseAr: 'شاطئ ونهايات أسبوع',
    },
    {
      id: 'TN_SFA_GAB',
      from: 'Sfax', fromAr: 'صفاقس', to: 'Gabès', toAr: 'قابس',
      distanceKm: 130, durationMin: 90, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Southern trade route', useCaseAr: 'طريق تجاري جنوبي',
    },
  ],
};

// ─── Iraq ─────────────────────────────────────────────────────────────────────

const IRAQ: RegionConfig = {
  iso: 'IQ',
  name: 'Iraq',
  nameAr: 'العراق',
  currency: 'IQD',
  flag: '🇮🇶',
  phoneCode: '+964',
  timezone: 'Asia/Baghdad',
  fuel: {
    pricePerLitre: 650,         // IQD 650/L (subsidized, 2026)
    currency: 'IQD',
    priceInJOD: 0.35,           // Very cheap fuel
    efficiencyLper100km: 9,
  },
  weekendDays: [5, 6],
  minDriverAge: 18,
  minPassengerAge: 18,
  allowsCrossBorder: false,
  cultural: {
    genderSegregationMandatory: false,
    highDemandWomenOnly: true,
    hijriCalendar: false,
    fridayWeekend: true,
    ramadanModeSupported: true,
    prayerStopsDefault: true,
    conservativeDress: true,
    cashOnArrivalThresholdJOD: 15,
  },
  launchStatus: 'planned',
  packageDeliveryEnabled: true,
  languages: ['ar', 'ku'],
  routes: [
    {
      id: 'IQ_BGD_BSR',
      from: 'Baghdad', fromAr: 'بغداد', to: 'Basra', toAr: 'البصرة',
      distanceKm: 550, durationMin: 360, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: true,
      useCase: 'Oil city, Southern Iraq', useCaseAr: 'مدينة النفط والجنوب',
    },
    {
      id: 'IQ_BGD_NJF',
      from: 'Baghdad', fromAr: 'بغداد', to: 'Najaf', toAr: 'النجف',
      distanceKm: 160, durationMin: 120, hasTolls: false, tollCostLocal: 0,
      tier: 1, popular: true, packageEnabled: false,
      useCase: 'Religious pilgrimage, Imam Ali Shrine', useCaseAr: 'زيارة دينية',
    },
    {
      id: 'IQ_BGD_ERB',
      from: 'Baghdad', fromAr: 'بغداد', to: 'Erbil', toAr: 'أربيل',
      distanceKm: 350, durationMin: 240, hasTolls: false, tollCostLocal: 0,
      tier: 2, popular: false, packageEnabled: true,
      useCase: 'Kurdistan region, business', useCaseAr: 'إقليم كردستان والأعمال',
    },
  ],
};

// ─── Master Region Map ────────────────────────────────────────────────────────

export const REGIONS: Record<CountryCode, RegionConfig> = {
  JO: JORDAN,
  EG: EGYPT,
  SA: SAUDI_ARABIA,
  AE: UAE,
  KW: KUWAIT,
  BH: BAHRAIN,
  QA: QATAR,
  OM: OMAN,
  LB: LEBANON,
  PS: PALESTINE,
  MA: MOROCCO,
  TN: TUNISIA,
  IQ: IRAQ,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get config for a country code. Falls back to Jordan. */
export function getRegion(iso: CountryCode | string): RegionConfig {
  return REGIONS[iso as CountryCode] ?? REGIONS.JO;
}

/** Get all active / beta regions */
export function getActiveRegions(): RegionConfig[] {
  return Object.values(REGIONS).filter(
    (r) => r.launchStatus === 'active' || r.launchStatus === 'beta',
  );
}

/** Get all regions (for admin / country picker) */
export function getAllRegions(): RegionConfig[] {
  return Object.values(REGIONS).sort((a, b) => {
    const order = { active: 0, beta: 1, coming_soon: 2, planned: 3 };
    return order[a.launchStatus] - order[b.launchStatus];
  });
}

/** Get Tier 1 (launch-priority) routes for a country */
export function getTier1Routes(iso: CountryCode): CityRoute[] {
  return getRegion(iso).routes.filter((r) => r.tier === 1);
}

/** Get all popular routes for a country */
export function getPopularRoutes(iso: CountryCode): CityRoute[] {
  return getRegion(iso).routes.filter((r) => r.popular);
}

/** Get all package-enabled routes for a country */
export function getPackageRoutes(iso: CountryCode): CityRoute[] {
  return getRegion(iso).routes.filter((r) => r.packageEnabled);
}

/** Find a specific route by its ID */
export function findRoute(routeId: string): CityRoute | undefined {
  for (const region of Object.values(REGIONS)) {
    const route = region.routes.find((r) => r.id === routeId);
    if (route) {return route;}
  }
  return undefined;
}

/** Find all routes between two cities in a country */
export function findCityRoutes(
  iso: CountryCode,
  fromCity: string,
  toCity: string,
): CityRoute[] {
  const region = getRegion(iso);
  return region.routes.filter(
    (r) =>
      (r.from.toLowerCase() === fromCity.toLowerCase() &&
        r.to.toLowerCase() === toCity.toLowerCase()) ||
      (r.from.toLowerCase() === toCity.toLowerCase() &&
        r.to.toLowerCase() === fromCity.toLowerCase()),
  );
}

/** Get all unique origin cities for a country */
export function getOriginCities(iso: CountryCode): string[] {
  const region = getRegion(iso);
  return [...new Set(region.routes.map((r) => r.from))];
}

/** Get destination cities from a given origin */
export function getDestinationsFrom(iso: CountryCode, fromCity: string): CityRoute[] {
  const region = getRegion(iso);
  return region.routes.filter(
    (r) => r.from.toLowerCase() === fromCity.toLowerCase(),
  );
}

/** Get fuel config for a country */
export function getFuelConfig(iso: CountryCode): RegionFuelConfig {
  return getRegion(iso).fuel;
}

/** Check if package delivery is enabled for a country */
export function isPackageDeliveryEnabled(iso: CountryCode): boolean {
  return getRegion(iso).packageDeliveryEnabled;
}

/** Get cultural rules for a country */
export function getCulturalRules(iso: CountryCode): CulturalRules {
  return getRegion(iso).cultural;
}
