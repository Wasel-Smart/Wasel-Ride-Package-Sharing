import { fetchWithRetry } from '@/services/core';

export interface MapPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  tags?: Record<string, string | undefined>;
}

interface OsrmRouteResponse {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
}

export async function fetchNearbyMosques(center: RoutePoint): Promise<MapPoint[]> {
  const query = `[out:json][timeout:10];node["amenity"="place_of_worship"]["religion"="muslim"](around:8000,${center.lat},${center.lng});out 20;`;
  const response = await fetchWithRetry(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    { timeout: 10_000 },
    1,
    500,
  );

  if (!response.ok) {
    throw new Error('Could not load nearby mosques.');
  }

  const data = (await response.json()) as { elements?: OverpassElement[] };

  return (data.elements ?? [])
    .filter((element): element is Required<Pick<OverpassElement, 'lat' | 'lon'>> & OverpassElement =>
      typeof element.lat === 'number' && typeof element.lon === 'number',
    )
    .map(element => ({
      lat: element.lat,
      lng: element.lon,
      name: element.tags?.name || element.tags?.['name:ar'] || 'Mosque',
    }));
}

export async function fetchDrivingRoute(points: RoutePoint[]): Promise<Array<[number, number]>> {
  if (points.length < 2) {
    return points.map(point => [point.lat, point.lng]);
  }

  const coords = points.map(point => `${point.lng},${point.lat}`).join(';');
  const response = await fetchWithRetry(
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    { timeout: 5_000 },
    1,
    500,
  );

  if (!response.ok) {
    throw new Error('Could not load driving route.');
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;

  if (!routeCoordinates?.length) {
    return points.map(point => [point.lat, point.lng]);
  }

  return routeCoordinates.map(([lng, lat]) => [lat, lng]);
}

