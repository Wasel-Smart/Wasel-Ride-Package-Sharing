export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoStreamState {
  lastAcceptedAt: number | null;
  lastPoint: GeoPoint | null;
}

export interface GeoStreamConfig {
  minUpdateIntervalMs: number;
  minDistanceMeters: number;
}

export interface GeoStreamDecision {
  accepted: boolean;
  reason: 'first_point' | 'interval_elapsed' | 'distance_delta' | 'throttled';
}

export const DEFAULT_GEO_STREAM_CONFIG: GeoStreamConfig = {
  minUpdateIntervalMs: 12_000,
  minDistanceMeters: 120,
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function evaluateGeoStreamUpdate(
  state: GeoStreamState,
  nextPoint: GeoPoint,
  now: number = Date.now(),
  config: GeoStreamConfig = DEFAULT_GEO_STREAM_CONFIG,
): GeoStreamDecision {
  if (!state.lastPoint || !state.lastAcceptedAt) {
    return { accepted: true, reason: 'first_point' };
  }

  const elapsedMs = now - state.lastAcceptedAt;
  const distanceMeters = calculateDistanceMeters(state.lastPoint, nextPoint);

  if (distanceMeters >= config.minDistanceMeters) {
    return { accepted: true, reason: 'distance_delta' };
  }

  if (elapsedMs >= config.minUpdateIntervalMs) {
    return { accepted: true, reason: 'interval_elapsed' };
  }

  return { accepted: false, reason: 'throttled' };
}
