/**
 * Region Configuration — Unit Tests
 *
 * Covers: region catalogue completeness, cultural rules,
 * route data integrity, helper functions, and MENA-specific business rules.
 *
 * Standard: regionConfig is the geopolitical contract of the platform.
 * Every country entry must be structurally valid and internally consistent.
 */
import { describe, it, expect } from 'vitest';
import {
  REGIONS,
  getAllRegions,
  getActiveRegions,
  getRegion,
  getTier1Routes,
  getPopularRoutes,
  getPackageRoutes,
  findRoute,
  findCityRoutes,
  getOriginCities,
  getDestinationsFrom,
  getFuelConfig,
  isPackageDeliveryEnabled,
  getCulturalRules,
  type CountryCode,
} from '../../../src/utils/regionConfig';

const ALL_COUNTRY_CODES: CountryCode[] = [
  'JO', 'EG', 'SA', 'AE', 'KW', 'BH', 'QA', 'OM', 'LB', 'PS', 'MA', 'TN', 'IQ',
];

// ── 1. Region catalogue completeness ─────────────────────────────────────────

describe('REGIONS catalogue', () => {
  it('contains all 13 MENA countries', () => {
    expect(Object.keys(REGIONS).length).toBe(13);
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code]).toBeDefined();
    }
  });

  it('every region has required fields', () => {
    for (const code of ALL_COUNTRY_CODES) {
      const r = REGIONS[code];
      expect(r.iso).toBe(code);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.nameAr.length).toBeGreaterThan(0);
      expect(r.currency.length).toBeGreaterThan(0);
      expect(r.flag.length).toBeGreaterThan(0);
      expect(r.phoneCode).toMatch(/^\+\d+$/);
      expect(r.timezone.length).toBeGreaterThan(0);
    }
  });

  it('every region has a valid launch status', () => {
    const validStatuses = ['active', 'beta', 'coming_soon', 'planned'];
    for (const code of ALL_COUNTRY_CODES) {
      expect(validStatuses).toContain(REGIONS[code].launchStatus);
    }
  });

  it('every region has at least one route', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code].routes.length).toBeGreaterThan(0);
    }
  });

  it('every region has at least one language', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code].languages.length).toBeGreaterThan(0);
    }
  });

  it('Jordan is active (primary market)', () => {
    expect(REGIONS.JO.launchStatus).toBe('active');
  });

  it('Jordan package delivery is enabled', () => {
    expect(REGIONS.JO.packageDeliveryEnabled).toBe(true);
  });
});

// ── 2. Fuel configuration ─────────────────────────────────────────────────────

describe('Fuel configuration', () => {
  it('every region has positive fuel price per litre', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code].fuel.pricePerLitre).toBeGreaterThan(0);
    }
  });

  it('every region has positive priceInJOD', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code].fuel.priceInJOD).toBeGreaterThan(0);
    }
  });

  it('every region has realistic fuel efficiency (5-15 L/100km)', () => {
    for (const code of ALL_COUNTRY_CODES) {
      const { efficiencyLper100km } = REGIONS[code].fuel;
      expect(efficiencyLper100km).toBeGreaterThanOrEqual(5);
      expect(efficiencyLper100km).toBeLessThanOrEqual(15);
    }
  });

  it('Kuwait has world-cheapest fuel (< JOD 0.25)', () => {
    expect(REGIONS.KW.fuel.priceInJOD).toBeLessThan(0.25);
  });

  it('Lebanon fuel is in USD due to economic context', () => {
    expect(REGIONS.LB.fuel.currency).toBe('USD');
  });
});

// ── 3. Cultural rules ─────────────────────────────────────────────────────────

describe('Cultural rules', () => {
  it('every region has boolean cultural fields', () => {
    for (const code of ALL_COUNTRY_CODES) {
      const c = REGIONS[code].cultural;
      expect(typeof c.genderSegregationMandatory).toBe('boolean');
      expect(typeof c.highDemandWomenOnly).toBe('boolean');
      expect(typeof c.hijriCalendar).toBe('boolean');
      expect(typeof c.fridayWeekend).toBe('boolean');
      expect(typeof c.ramadanModeSupported).toBe('boolean');
      expect(typeof c.prayerStopsDefault).toBe('boolean');
      expect(typeof c.conservativeDress).toBe('boolean');
    }
  });

  it('Saudi Arabia hijri calendar flag is true', () => {
    expect(REGIONS.SA.cultural.hijriCalendar).toBe(true);
  });

  it('Tunisia does not use Friday weekend (Saturday+Sunday)', () => {
    expect(REGIONS.TN.cultural.fridayWeekend).toBe(false);
  });

  it('Lebanon prayer stops are not default (mixed religious society)', () => {
    expect(REGIONS.LB.cultural.prayerStopsDefault).toBe(false);
  });

  it('cash on arrival threshold is a positive number', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code].cultural.cashOnArrivalThresholdJOD).toBeGreaterThan(0);
    }
  });

  it('Ramadan mode is supported in all regions', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(REGIONS[code].cultural.ramadanModeSupported).toBe(true);
    }
  });
});

// ── 4. Route data integrity ───────────────────────────────────────────────────

describe('Route data integrity', () => {
  it('all route IDs are unique across the platform', () => {
    const ids: string[] = [];
    for (const region of Object.values(REGIONS)) {
      for (const route of region.routes) {
        ids.push(route.id);
      }
    }
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every route has positive distanceKm and durationMin', () => {
    for (const region of Object.values(REGIONS)) {
      for (const route of region.routes) {
        expect(route.distanceKm).toBeGreaterThan(0);
        expect(route.durationMin).toBeGreaterThan(0);
      }
    }
  });

  it('every route has non-empty city names in English and Arabic', () => {
    for (const region of Object.values(REGIONS)) {
      for (const route of region.routes) {
        expect(route.from.length).toBeGreaterThan(0);
        expect(route.fromAr.length).toBeGreaterThan(0);
        expect(route.to.length).toBeGreaterThan(0);
        expect(route.toAr.length).toBeGreaterThan(0);
      }
    }
  });

  it('route tier is 1, 2, or 3', () => {
    for (const region of Object.values(REGIONS)) {
      for (const route of region.routes) {
        expect([1, 2, 3]).toContain(route.tier);
      }
    }
  });

  it('toll cost is non-negative', () => {
    for (const region of Object.values(REGIONS)) {
      for (const route of region.routes) {
        expect(route.tollCostLocal).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('routes with hasTolls=true have tollCost > 0', () => {
    for (const region of Object.values(REGIONS)) {
      for (const route of region.routes) {
        if (route.hasTolls) {
          expect(route.tollCostLocal).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ── 5. Helper functions ───────────────────────────────────────────────────────

describe('getAllRegions()', () => {
  it('returns all 13 regions', () => {
    expect(getAllRegions().length).toBe(13);
  });

  it('active regions come before beta, which come before coming_soon', () => {
    const regions = getAllRegions();
    const statuses = regions.map(r => r.launchStatus);
    const order = ['active', 'beta', 'coming_soon', 'planned'];
    for (let i = 0; i < statuses.length - 1; i++) {
      expect(order.indexOf(statuses[i]!)).toBeLessThanOrEqual(order.indexOf(statuses[i + 1]!));
    }
  });
});

describe('getActiveRegions()', () => {
  it('only returns active or beta regions', () => {
    const active = getActiveRegions();
    for (const r of active) {
      expect(['active', 'beta']).toContain(r.launchStatus);
    }
  });

  it('Jordan is included', () => {
    const active = getActiveRegions();
    expect(active.some(r => r.iso === 'JO')).toBe(true);
  });
});

describe('getRegion()', () => {
  it('returns Jordan config for JO', () => {
    expect(getRegion('JO').iso).toBe('JO');
  });

  it('falls back to Jordan for unknown code', () => {
    expect(getRegion('XX').iso).toBe('JO');
  });
});

describe('getTier1Routes()', () => {
  it('returns only tier 1 routes', () => {
    const routes = getTier1Routes('JO');
    for (const r of routes) {
      expect(r.tier).toBe(1);
    }
  });

  it('Jordan has tier 1 routes (launch market)', () => {
    expect(getTier1Routes('JO').length).toBeGreaterThan(0);
  });
});

describe('getPopularRoutes()', () => {
  it('returns only popular routes', () => {
    const routes = getPopularRoutes('JO');
    for (const r of routes) {
      expect(r.popular).toBe(true);
    }
  });
});

describe('getPackageRoutes()', () => {
  it('returns only packageEnabled routes', () => {
    const routes = getPackageRoutes('JO');
    for (const r of routes) {
      expect(r.packageEnabled).toBe(true);
    }
  });
});

describe('findRoute()', () => {
  it('finds a route by ID', () => {
    const route = findRoute('JO_AMM_AQB');
    expect(route).toBeDefined();
    expect(route?.from).toBe('Amman');
    expect(route?.to).toBe('Aqaba');
  });

  it('returns undefined for unknown route ID', () => {
    expect(findRoute('UNKNOWN_ROUTE')).toBeUndefined();
  });
});

describe('findCityRoutes()', () => {
  it('finds Amman→Aqaba route', () => {
    const routes = findCityRoutes('JO', 'Amman', 'Aqaba');
    expect(routes.length).toBeGreaterThan(0);
  });

  it('returns empty for non-existent city pair', () => {
    const routes = findCityRoutes('JO', 'Amman', 'Cairo');
    expect(routes.length).toBe(0);
  });

  it('city matching is case-insensitive', () => {
    const routes = findCityRoutes('JO', 'amman', 'aqaba');
    expect(routes.length).toBeGreaterThan(0);
  });
});

describe('getOriginCities()', () => {
  it('returns unique origin cities for Jordan', () => {
    const cities = getOriginCities('JO');
    const unique = new Set(cities);
    expect(unique.size).toBe(cities.length); // no duplicates
  });

  it('includes Amman for Jordan', () => {
    expect(getOriginCities('JO')).toContain('Amman');
  });
});

describe('getDestinationsFrom()', () => {
  it('returns destinations from Amman', () => {
    const dests = getDestinationsFrom('JO', 'Amman');
    expect(dests.length).toBeGreaterThan(0);
    for (const d of dests) {
      expect(d.from.toLowerCase()).toBe('amman');
    }
  });

  it('returns empty for city with no departures', () => {
    const dests = getDestinationsFrom('JO', 'NonExistentCity');
    expect(dests.length).toBe(0);
  });
});

describe('getFuelConfig()', () => {
  it('returns fuel config for Jordan', () => {
    const fuel = getFuelConfig('JO');
    expect(fuel.currency).toBe('JOD');
    expect(fuel.pricePerLitre).toBeGreaterThan(0);
  });
});

describe('isPackageDeliveryEnabled()', () => {
  it('returns true for Jordan', () => {
    expect(isPackageDeliveryEnabled('JO')).toBe(true);
  });

  it('returns a boolean for all countries', () => {
    for (const code of ALL_COUNTRY_CODES) {
      expect(typeof isPackageDeliveryEnabled(code)).toBe('boolean');
    }
  });
});

describe('getCulturalRules()', () => {
  it('returns cultural rules for Saudi Arabia', () => {
    const rules = getCulturalRules('SA');
    expect(rules.hijriCalendar).toBe(true);
    expect(rules.prayerStopsDefault).toBe(true);
  });
});
