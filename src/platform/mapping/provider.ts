import { withRetry } from '../resilience/retryPolicy';
import { withTimeout } from '../resilience/timeout';
import { MapResponseCache } from './responseCache';

export type MapProviderTheme = 'dark' | 'light';
export type MapTileKind = 'roadmap' | 'satellite' | 'terrain';

export interface MapTileConfig {
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  url: string;
}

export interface MapRouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapProvider {
  id: string;
  resolveTiles: (kind: MapTileKind, theme: MapProviderTheme) => MapTileConfig;
  fetchRoutePath?: (
    points: MapRouteCoordinate[],
  ) => Promise<MapRouteCoordinate[]>;
  fetchPointsOfInterest?: (
    type: 'mosque',
    bounds: string,
  ) => Promise<Array<{ latitude: number; longitude: number; label: string }>>;
}

const routingCache = new MapResponseCache<MapRouteCoordinate[]>(30_000);
const poiCache = new MapResponseCache<Array<{ latitude: number; longitude: number; label: string }>>(60_000);

const DEFAULT_ROUTE_TIMEOUT_MS = 5_000;
const DEFAULT_POI_TIMEOUT_MS = 4_000;

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const response = await withTimeout(
    () => fetch(url),
    timeoutMs,
    `Map provider request exceeded timeout of ${timeoutMs}ms`,
  );

  if (!response.ok) {
    throw new Error(`Map provider request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchRouteFromOsrm(points: MapRouteCoordinate[]): Promise<MapRouteCoordinate[]> {
  const key = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const payload = await fetchJson<{
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  }>(
    `https://router.project-osrm.org/route/v1/driving/${key}?overview=full&geometries=geojson`,
    DEFAULT_ROUTE_TIMEOUT_MS,
  );

  const coordinates = payload.routes?.[0]?.geometry?.coordinates?.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));

  if (!coordinates?.length) {
    throw new Error('OSRM returned an empty route geometry.');
  }

  return coordinates;
}

function toFallbackRoute(points: MapRouteCoordinate[]): MapRouteCoordinate[] {
  return points;
}

async function fetchMosques(bounds: string) {
  const payload = await fetchJson<{
    elements?: Array<{ lat: number; lon: number; tags?: Record<string, string> }>;
  }>(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
      `[out:json][timeout:12];node["amenity"="place_of_worship"]["religion"="muslim"](${bounds});out body 20;`,
    )}`,
    DEFAULT_POI_TIMEOUT_MS,
  );

  return payload.elements?.map((element) => ({
    latitude: element.lat,
    longitude: element.lon,
    label: element.tags?.name ?? element.tags?.['name:ar'] ?? 'Mosque | مسجد',
  })) ?? [];
}

const defaultProvider: MapProvider = {
  id: 'wasel-open-network',
  resolveTiles(kind, theme) {
    if (kind === 'roadmap') {
      return theme === 'dark'
        ? {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: 'OpenStreetMap contributors and CARTO',
            maxZoom: 19,
            subdomains: 'abcd',
          }
        : {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: 'OpenStreetMap contributors',
            maxZoom: 19,
            subdomains: 'abc',
          };
    }

    if (kind === 'satellite') {
      const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      return mapsKey
        ? {
            url: `https://maps.googleapis.com/maps/vt?lyrs=s&x={x}&y={y}&z={z}&key=${mapsKey}`,
            attribution: 'Google Maps',
            maxZoom: 21,
            subdomains: 'abc',
          }
        : {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Esri',
            maxZoom: 21,
          };
    }

    return {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'OpenStreetMap contributors and OpenTopoMap',
      maxZoom: 17,
      subdomains: 'abc',
    };
  },
  async fetchRoutePath(points) {
    const key = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
    const cached = routingCache.get(key);
    if (cached) {
      return cached;
    }

    const coordinates = await withRetry(
      () => fetchRouteFromOsrm(points),
      {
        attempts: 2,
        backoffMs: 150,
        retryDecider: () => true,
      },
    ).catch(() => toFallbackRoute(points));

    routingCache.set(key, coordinates);
    return coordinates;
  },
  async fetchPointsOfInterest(type, bounds) {
    const cacheKey = `${type}:${bounds}`;
    const cached = poiCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await withRetry(
      () => {
        if (type !== 'mosque') {
          return Promise.resolve([]);
        }
        return fetchMosques(bounds);
      },
      {
        attempts: 2,
        backoffMs: 150,
        retryDecider: () => true,
      },
    ).catch(() => []);

    poiCache.set(cacheKey, result);
    return result;
  },
};

export function getMapProvider(): MapProvider {
  return defaultProvider;
}
