import { describe, expect, it } from 'vitest';
import {
  ENTRY_DEFAULT_AUTH_RETURN_TO,
  ENTRY_DEFAULT_ROUTE_RETURN_TO,
  buildEntryPrimaryPath,
  buildPackagePrefillPath,
  buildRideSearchPath,
  getAlternateEntryCity,
} from '@/contracts/entry';
import { APP_ROUTES } from '@/router/paths';

describe('entry contract', () => {
  it('builds canonical ride and package paths from one route draft', () => {
    const draft = { date: '2026-04-24', from: 'Amman', to: 'Irbid' };

    expect(buildRideSearchPath(draft)).toBe(
      `${APP_ROUTES.findRide.full}?from=Amman&to=Irbid&search=1&date=2026-04-24`,
    );
    expect(buildPackagePrefillPath(draft)).toBe(
      `${APP_ROUTES.packages.full}?from=Amman&to=Irbid`,
    );
    expect(buildEntryPrimaryPath('ride', draft)).toBe(buildRideSearchPath(draft));
    expect(buildEntryPrimaryPath('package', draft)).toBe(buildPackagePrefillPath(draft));
  });

  it('keeps stable default return paths and alternate corridor fallbacks', () => {
    expect(ENTRY_DEFAULT_AUTH_RETURN_TO).toBe(APP_ROUTES.findRide.full);
    expect(ENTRY_DEFAULT_ROUTE_RETURN_TO).toBe(
      `${APP_ROUTES.findRide.full}?from=Amman&to=Irbid&search=1`,
    );
    expect(getAlternateEntryCity('Amman')).toBe('Irbid');
    expect(getAlternateEntryCity('Unknown')).toBe('Amman');
  });
});
