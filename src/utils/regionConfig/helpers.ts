// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get config for a country code. Falls back to Jordan. */
export function getRegion(iso: CountryCode | string): RegionConfig {
  return REGIONS[iso as CountryCode] ?? REGIONS.JO;
}

/** Get all active / beta regions */
export function getActiveRegions(): RegionConfig[] {
  return Object.values(REGIONS).filter(
    r => r.launchStatus === 'active' || r.launchStatus === 'beta',
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
  return getRegion(iso).routes.filter(r => r.tier === 1);
}

/** Get all popular routes for a country */
export function getPopularRoutes(iso: CountryCode): CityRoute[] {
  return getRegion(iso).routes.filter(r => r.popular);
}

/** Get all package-enabled routes for a country */
export function getPackageRoutes(iso: CountryCode): CityRoute[] {
  return getRegion(iso).routes.filter(r => r.packageEnabled);
}

/** Find a specific route by its ID */
export function findRoute(routeId: string): CityRoute | undefined {
  for (const region of Object.values(REGIONS)) {
    const route = region.routes.find(r => r.id === routeId);
    if (route) return route;
  }
  return undefined;
}

/** Find all routes between two cities in a country */
export function findCityRoutes(iso: CountryCode, fromCity: string, toCity: string): CityRoute[] {
  const region = getRegion(iso);
  return region.routes.filter(
    r =>
      (r.from.toLowerCase() === fromCity.toLowerCase() &&
        r.to.toLowerCase() === toCity.toLowerCase()) ||
      (r.from.toLowerCase() === toCity.toLowerCase() &&
        r.to.toLowerCase() === fromCity.toLowerCase()),
  );
}

/** Get all unique origin cities for a country */
export function getOriginCities(iso: CountryCode): string[] {
  const region = getRegion(iso);
  return [...new Set(region.routes.map(r => r.from))];
}

/** Get destination cities from a given origin */
export function getDestinationsFrom(iso: CountryCode, fromCity: string): CityRoute[] {
  const region = getRegion(iso);
  return region.routes.filter(r => r.from.toLowerCase() === fromCity.toLowerCase());
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

