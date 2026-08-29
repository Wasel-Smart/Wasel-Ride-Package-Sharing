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
  'JO' | 'EG' | 'SA' | 'AE' | 'KW' | 'BH' | 'QA' | 'OM' | 'LB' | 'PS' | 'MA' | 'TN' | 'IQ';

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
