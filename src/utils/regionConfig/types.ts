export type CountryCode =
  | 'JO'
  | 'EG'
  | 'SA'
  | 'AE'
  | 'KW'
  | 'BH'
  | 'QA'
  | 'OM'
  | 'LB'
  | 'PS'
  | 'MA'
  | 'TN'
  | 'IQ';

export interface RegionFuelConfig {
  pricePerLitre: number;
  currency: string;
  priceInJOD: number;
  efficiencyLper100km: number;
}

export type RouteTier = 1 | 2 | 3;

export interface CityRoute {
  id: string;
  from: string;
  fromAr: string;
  to: string;
  toAr: string;
  distanceKm: number;
  durationMin: number;
  hasTolls: boolean;
  tollCostLocal: number;
  tier: RouteTier;
  popular: boolean;
  packageEnabled: boolean;
  useCase: string;
  useCaseAr: string;
}

export interface CulturalRules {
  genderSegregationMandatory: boolean;
  highDemandWomenOnly: boolean;
  hijriCalendar: boolean;
  fridayWeekend: boolean;
  ramadanModeSupported: boolean;
  prayerStopsDefault: boolean;
  conservativeDress: boolean;
  cashOnArrivalThresholdJOD: number;
}

export interface RegionConfig {
  iso: CountryCode;
  name: string;
  nameAr: string;
  currency: string;
  flag: string;
  phoneCode: string;
  timezone: string;
  fuel: RegionFuelConfig;
  weekendDays: number[];
  minDriverAge: number;
  minPassengerAge: number;
  allowsCrossBorder: boolean;
  cultural: CulturalRules;
  routes: CityRoute[];
  launchStatus: 'active' | 'beta' | 'coming_soon' | 'planned';
  packageDeliveryEnabled: boolean;
  languages: string[];
}
