export type GoogleTrafficSnapshot = {
  speedKph: number;
  congestion: number;
  updatedAt: string;
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  amman: { lat: 31.9454, lng: 35.9284 },
  aqaba: { lat: 29.532, lng: 35.0063 },
  irbid: { lat: 32.5556, lng: 35.85 },
  zarqa: { lat: 32.0728, lng: 36.088 },
  mafraq: { lat: 32.3406, lng: 36.208 },
  jerash: { lat: 32.2803, lng: 35.8993 },
  ajloun: { lat: 32.3326, lng: 35.7519 },
  madaba: { lat: 31.7197, lng: 35.7936 },
  karak: { lat: 31.1853, lng: 35.7048 },
  tafila: { lat: 30.8375, lng: 35.6042 },
  maan: { lat: 30.1962, lng: 35.736 },
  salt: { lat: 32.0392, lng: 35.7272 },
};

const TRAFFIC_CACHE_TTL_MS = 2 * 60 * 1000;
const trafficCache = new Map<string, { expiresAt: number; snapshot: GoogleTrafficSnapshot }>();

function getGoogleMapsApiKey(): string | null {
  const key = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!key || key.length < 10) return null;
  return key;
}

function parseGoogleDurationSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : null;
}

export async function fetchGoogleTrafficSnapshot(
  routeId: string,
  from: string,
  to: string,
): Promise<GoogleTrafficSnapshot | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  const origin = CITY_COORDS[from];
  const destination = CITY_COORDS[to];
  if (!origin || !destination) return null;

  const cached = trafficCache.get(routeId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        departureTime: new Date().toISOString(),
      }),
    });

    if (!response.ok) return null;
    const json = await response.json();
    const route = Array.isArray(json?.routes) ? json.routes[0] : null;
    const durationSeconds = parseGoogleDurationSeconds(route?.duration);
    const staticDurationSeconds = parseGoogleDurationSeconds(route?.staticDuration);
    const distanceMeters = Number(route?.distanceMeters ?? 0);

    if (!durationSeconds || distanceMeters <= 0) return null;

    const speedKph = Math.max(18, Math.round((distanceMeters / durationSeconds) * 3.6));
    const trafficRatio =
      staticDurationSeconds && staticDurationSeconds > 0
        ? durationSeconds / staticDurationSeconds
        : 1;
    const congestion = Math.max(0.05, Math.min(0.98, (trafficRatio - 1) / 0.65));
    const snapshot = {
      speedKph,
      congestion,
      updatedAt: new Date().toISOString(),
    };

    trafficCache.set(routeId, {
      expiresAt: Date.now() + TRAFFIC_CACHE_TTL_MS,
      snapshot,
    });

    return snapshot;
  } catch {
    return null;
  }
}

