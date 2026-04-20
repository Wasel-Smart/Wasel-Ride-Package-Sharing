export type JordanLocationKind = 'city' | 'governorate';
export type JordanRouteScope =
  | 'city_to_city'
  | 'city_to_governorate'
  | 'governorate_to_city'
  | 'governorate_to_governorate';

type JordanLocation = {
  label: string;
  kind: JordanLocationKind;
  governorate: string;
  lat: number;
  lng: number;
  representativeCity: string;
  aliases?: string[];
};

const CITY_LOCATIONS: JordanLocation[] = [
  { label: 'Amman', kind: 'city', governorate: 'Amman Governorate', lat: 31.9539, lng: 35.9106, representativeCity: 'Amman' },
  { label: 'Aqaba', kind: 'city', governorate: 'Aqaba Governorate', lat: 29.5321, lng: 35.0060, representativeCity: 'Aqaba' },
  { label: 'Irbid', kind: 'city', governorate: 'Irbid Governorate', lat: 32.5568, lng: 35.8479, representativeCity: 'Irbid' },
  { label: 'Zarqa', kind: 'city', governorate: 'Zarqa Governorate', lat: 32.0728, lng: 36.0880, representativeCity: 'Zarqa' },
  { label: 'Dead Sea', kind: 'city', governorate: 'Balqa Governorate', lat: 31.5590, lng: 35.4732, representativeCity: 'Salt', aliases: ['Deadsea'] },
  { label: 'Karak', kind: 'city', governorate: 'Karak Governorate', lat: 31.1854, lng: 35.7048, representativeCity: 'Karak' },
  { label: 'Madaba', kind: 'city', governorate: 'Madaba Governorate', lat: 31.7196, lng: 35.7939, representativeCity: 'Madaba' },
  { label: 'Petra', kind: 'city', governorate: "Ma'an Governorate", lat: 30.3285, lng: 35.4444, representativeCity: "Ma'an" },
  { label: 'Jerash', kind: 'city', governorate: 'Jerash Governorate', lat: 32.2744, lng: 35.8961, representativeCity: 'Jerash' },
  { label: 'Mafraq', kind: 'city', governorate: 'Mafraq Governorate', lat: 32.3429, lng: 36.2080, representativeCity: 'Mafraq' },
  { label: 'Salt', kind: 'city', governorate: 'Balqa Governorate', lat: 32.0392, lng: 35.7272, representativeCity: 'Salt' },
  { label: 'Wadi Rum', kind: 'city', governorate: 'Aqaba Governorate', lat: 29.5734, lng: 35.4196, representativeCity: 'Aqaba' },
  { label: 'Ajloun', kind: 'city', governorate: 'Ajloun Governorate', lat: 32.3333, lng: 35.7528, representativeCity: 'Ajloun' },
  { label: "Ma'in", kind: 'city', governorate: 'Madaba Governorate', lat: 31.6796, lng: 35.6217, representativeCity: 'Madaba', aliases: ['Main'] },
  { label: 'Tafila', kind: 'city', governorate: 'Tafilah Governorate', lat: 30.8375, lng: 35.6042, representativeCity: 'Tafila', aliases: ['Tafilah'] },
  { label: "Ma'an", kind: 'city', governorate: "Ma'an Governorate", lat: 30.1962, lng: 35.7360, representativeCity: "Ma'an", aliases: ['Maan'] },
];

const GOVERNORATE_LOCATIONS: JordanLocation[] = [
  { label: 'Amman Governorate', kind: 'governorate', governorate: 'Amman Governorate', lat: 31.9539, lng: 35.9106, representativeCity: 'Amman', aliases: ['Amman Gov'] },
  { label: 'Aqaba Governorate', kind: 'governorate', governorate: 'Aqaba Governorate', lat: 29.5267, lng: 35.0081, representativeCity: 'Aqaba', aliases: ['Aqaba Gov'] },
  { label: 'Irbid Governorate', kind: 'governorate', governorate: 'Irbid Governorate', lat: 32.5568, lng: 35.8479, representativeCity: 'Irbid', aliases: ['Irbid Gov'] },
  { label: 'Zarqa Governorate', kind: 'governorate', governorate: 'Zarqa Governorate', lat: 32.0728, lng: 36.0880, representativeCity: 'Zarqa', aliases: ['Zarqa Gov'] },
  { label: 'Balqa Governorate', kind: 'governorate', governorate: 'Balqa Governorate', lat: 32.0392, lng: 35.7272, representativeCity: 'Salt', aliases: ['Balqa Gov'] },
  { label: 'Karak Governorate', kind: 'governorate', governorate: 'Karak Governorate', lat: 31.1854, lng: 35.7048, representativeCity: 'Karak', aliases: ['Karak Gov'] },
  { label: 'Madaba Governorate', kind: 'governorate', governorate: 'Madaba Governorate', lat: 31.7196, lng: 35.7939, representativeCity: 'Madaba', aliases: ['Madaba Gov'] },
  { label: 'Jerash Governorate', kind: 'governorate', governorate: 'Jerash Governorate', lat: 32.2744, lng: 35.8961, representativeCity: 'Jerash', aliases: ['Jerash Gov'] },
  { label: 'Mafraq Governorate', kind: 'governorate', governorate: 'Mafraq Governorate', lat: 32.3429, lng: 36.2080, representativeCity: 'Mafraq', aliases: ['Mafraq Gov'] },
  { label: 'Ajloun Governorate', kind: 'governorate', governorate: 'Ajloun Governorate', lat: 32.3333, lng: 35.7528, representativeCity: 'Ajloun', aliases: ['Ajloun Gov'] },
  { label: "Ma'an Governorate", kind: 'governorate', governorate: "Ma'an Governorate", lat: 30.1962, lng: 35.7360, representativeCity: "Ma'an", aliases: ['Maan Governorate', "Ma'an Gov"] },
  { label: 'Tafilah Governorate', kind: 'governorate', governorate: 'Tafilah Governorate', lat: 30.8375, lng: 35.6042, representativeCity: 'Tafila', aliases: ['Tafila Governorate', 'Tafilah Gov'] },
];

const ALL_LOCATIONS = [...CITY_LOCATIONS, ...GOVERNORATE_LOCATIONS];
const FALLBACK_LOCATION = CITY_LOCATIONS[0];

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value: string) {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const LOCATION_MAP = new Map<string, JordanLocation>();

for (const location of ALL_LOCATIONS) {
  LOCATION_MAP.set(normalizeKey(location.label), location);
  for (const alias of location.aliases ?? []) {
    LOCATION_MAP.set(normalizeKey(alias), location);
  }
}

export const JORDAN_LOCATION_OPTIONS = ALL_LOCATIONS.map((location) => location.label);
export const JORDAN_CITY_OPTIONS = CITY_LOCATIONS.map((location) => location.label);

export function getJordanLocation(value: string | null | undefined): JordanLocation | null {
  if (!value) {return null;}
  return LOCATION_MAP.get(normalizeKey(value)) ?? null;
}

export function isKnownJordanLocation(value: string | null | undefined): boolean {
  return Boolean(getJordanLocation(value));
}

export function normalizeJordanLocation(value: string | null | undefined, fallback = FALLBACK_LOCATION.label): string {
  return getJordanLocation(value)?.label ?? fallback;
}

export function resolveJordanLocationCoord(value: string | null | undefined) {
  const location = getJordanLocation(value) ?? FALLBACK_LOCATION;
  return { lat: location.lat, lng: location.lng };
}

export function getJordanLocationKind(value: string | null | undefined): JordanLocationKind | null {
  return getJordanLocation(value)?.kind ?? null;
}

export function resolveRepresentativeCity(value: string | null | undefined): string {
  return getJordanLocation(value)?.representativeCity ?? FALLBACK_LOCATION.representativeCity;
}

export function locationsOverlap(left: string | null | undefined, right: string | null | undefined): boolean {
  const leftLocation = getJordanLocation(left);
  const rightLocation = getJordanLocation(right);
  if (!leftLocation || !rightLocation) {return normalizeKey(String(left ?? '')) === normalizeKey(String(right ?? ''));}
  if (leftLocation.label === rightLocation.label) {return true;}
  if (leftLocation.kind === 'governorate' && leftLocation.governorate === rightLocation.governorate) {return true;}
  if (rightLocation.kind === 'governorate' && rightLocation.governorate === leftLocation.governorate) {return true;}
  return false;
}

export function routeEndpointsAreDistinct(from: string | null | undefined, to: string | null | undefined): boolean {
  return !locationsOverlap(from, to);
}

export function getJordanRouteScope(from: string | null | undefined, to: string | null | undefined): JordanRouteScope {
  const fromKind = getJordanLocationKind(from) ?? 'city';
  const toKind = getJordanLocationKind(to) ?? 'city';
  if (fromKind === 'governorate' && toKind === 'governorate') {return 'governorate_to_governorate';}
  if (fromKind === 'governorate') {return 'governorate_to_city';}
  if (toKind === 'governorate') {return 'city_to_governorate';}
  return 'city_to_city';
}

function endpointsMatch(left: string | null | undefined, right: string | null | undefined) {
  return locationsOverlap(left, right);
}

export function routeMatchesLocationPair(
  leftFrom: string | null | undefined,
  leftTo: string | null | undefined,
  rightFrom: string | null | undefined,
  rightTo: string | null | undefined,
  options?: { allowReverse?: boolean },
): boolean {
  const allowReverse = options?.allowReverse !== false;
  const direct = endpointsMatch(leftFrom, rightFrom) && endpointsMatch(leftTo, rightTo);
  if (direct) {return true;}
  return allowReverse && endpointsMatch(leftFrom, rightTo) && endpointsMatch(leftTo, rightFrom);
}

export function routeTouchesLocation(
  routeFrom: string | null | undefined,
  routeTo: string | null | undefined,
  location: string | null | undefined,
): boolean {
  return endpointsMatch(routeFrom, location) || endpointsMatch(routeTo, location);
}

export function buildJordanCorridorKey(from: string | null | undefined, to: string | null | undefined) {
  return `${slugify(normalizeJordanLocation(from))}__${slugify(normalizeJordanLocation(to, FALLBACK_LOCATION.representativeCity))}`;
}
