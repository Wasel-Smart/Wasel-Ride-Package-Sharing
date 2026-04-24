import {
  ENTRY_CITY_OPTIONS,
  ENTRY_DEFAULT_AUTH_RETURN_TO,
  ENTRY_DEFAULT_ROUTE_DRAFT,
  ENTRY_SERVICE_MODES,
  buildEntryPrimaryPath,
  buildPackagePrefillPath,
  buildRideSearchPath,
  getAlternateEntryCity,
} from '../../contracts/entry';
import type { EntryRouteDraft, EntryServiceMode } from '../../contracts/entry';

export const APP_ENTRY_CITY_OPTIONS = ENTRY_CITY_OPTIONS;
export const APP_ENTRY_DEFAULT_RETURN_TO = ENTRY_DEFAULT_AUTH_RETURN_TO;
export const APP_ENTRY_DEFAULT_ROUTE = ENTRY_DEFAULT_ROUTE_DRAFT;
export const APP_ENTRY_SERVICE_MODES = ENTRY_SERVICE_MODES;
export const buildAppEntryPrimaryPath = buildEntryPrimaryPath;

export { buildPackagePrefillPath, buildRideSearchPath, getAlternateEntryCity };

export type AppEntryRouteDraft = EntryRouteDraft;
export type AppEntryServiceMode = EntryServiceMode;

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
