export const APP_ENTRY_SERVICE_MODES = ['ride', 'package'] as const;

export type AppEntryServiceMode = (typeof APP_ENTRY_SERVICE_MODES)[number];

export interface AppEntryRouteDraft {
  from: string;
  to: string;
  date: string;
}

export interface AppEntryServiceModeMeta {
  panelId: string;
  tabId: string;
  queryParam: string;
}

export const APP_ENTRY_SERVICE_MODE_META: Record<
  AppEntryServiceMode,
  AppEntryServiceModeMeta
> = {
  ride: {
    panelId: 'app-entry-panel-ride',
    tabId: 'app-entry-tab-ride',
    queryParam: 'ride',
  },
  package: {
    panelId: 'app-entry-panel-package',
    tabId: 'app-entry-tab-package',
    queryParam: 'package',
  },
};

export function isAppEntryServiceMode(value: unknown): value is AppEntryServiceMode {
  return (
    typeof value === 'string' &&
    APP_ENTRY_SERVICE_MODES.includes(value as AppEntryServiceMode)
  );
}

export function buildRideSearchPath(route: AppEntryRouteDraft): string {
  const params = new URLSearchParams({
    from: route.from,
    to: route.to,
    search: '1',
  });

  if (route.date) {
    params.set('date', route.date);
  }

  return `/app/find-ride?${params.toString()}`;
}

export function buildPackagePrefillPath(route: AppEntryRouteDraft): string {
  const params = new URLSearchParams({
    from: route.from,
    to: route.to,
  });

  return `/app/packages?${params.toString()}`;
}

export function buildAppEntryPrimaryPath(
  mode: AppEntryServiceMode,
  route: AppEntryRouteDraft,
): string {
  return mode === 'ride'
    ? buildRideSearchPath(route)
    : buildPackagePrefillPath(route);
}
