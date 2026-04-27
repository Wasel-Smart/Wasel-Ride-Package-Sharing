import { APP_ROUTES } from '../router/paths';

export const ENTRY_SERVICE_MODES = ['ride', 'package'] as const;

export type EntryServiceMode = (typeof ENTRY_SERVICE_MODES)[number];

export interface EntryRouteDraft {
  from: string;
  to: string;
  date: string;
}

export interface EntryCityOption {
  value: string;
  en: string;
  ar: string;
}

export const ENTRY_CITY_OPTIONS: readonly EntryCityOption[] = [
  { value: 'Amman', en: 'Amman', ar: '\u0639\u0645\u0627\u0646' },
  { value: 'Irbid', en: 'Irbid', ar: '\u0625\u0631\u0628\u062f' },
  { value: 'Aqaba', en: 'Aqaba', ar: '\u0627\u0644\u0639\u0642\u0628\u0629' },
  { value: 'Zarqa', en: 'Zarqa', ar: '\u0627\u0644\u0632\u0631\u0642\u0627\u0621' },
  { value: 'Jerash', en: 'Jerash', ar: '\u062c\u0631\u0634' },
  { value: 'Salt', en: 'Salt', ar: '\u0627\u0644\u0633\u0644\u0637' },
] as const;

export const ENTRY_DEFAULT_ROUTE_DRAFT: Readonly<EntryRouteDraft> = {
  from: 'Amman',
  to: 'Irbid',
  date: '',
};

export const ENTRY_DEFAULT_AUTH_RETURN_TO = APP_ROUTES.findRide.full;

export function getAlternateEntryCity(excluded: string): string {
  return ENTRY_CITY_OPTIONS.find((option) => option.value !== excluded)?.value ?? excluded;
}

export function buildRideSearchPath(route: EntryRouteDraft): string {
  const params = new URLSearchParams({
    from: route.from,
    to: route.to,
    search: '1',
  });

  if (route.date) {
    params.set('date', route.date);
  }

  return `${APP_ROUTES.findRide.full}?${params.toString()}`;
}

export function buildPackagePrefillPath(route: EntryRouteDraft): string {
  const params = new URLSearchParams({
    from: route.from,
    to: route.to,
  });

  return `${APP_ROUTES.packages.full}?${params.toString()}`;
}

export function buildEntryPrimaryPath(
  mode: EntryServiceMode,
  route: EntryRouteDraft,
): string {
  return mode === 'ride'
    ? buildRideSearchPath(route)
    : buildPackagePrefillPath(route);
}

export const ENTRY_DEFAULT_ROUTE_RETURN_TO = buildRideSearchPath({
  ...ENTRY_DEFAULT_ROUTE_DRAFT,
});
