import { API_URL, fetchWithRetry, getAuthDetails } from './core';

type LatLng = {
  lat: number;
  lng: number;
};

type LiveTripStatus =
  | 'en_route_to_pickup'
  | 'driver_arrived'
  | 'en_route'
  | 'arriving'
  | 'completed';

export interface LiveTripSnapshot {
  bookingId: string;
  tripId: string;
  status: LiveTripStatus;
  from: string;
  fromAr?: string;
  fromCoord: LatLng;
  to: string;
  toAr?: string;
  toCoord: LatLng;
  driver: {
    id: string;
    name: string;
    nameAr?: string;
    rating: number;
    trips: number;
    img: string;
    phone: string;
    initials: string;
  };
  vehicle: {
    model: string;
    color: string;
    plate: string;
    year: number;
  };
  price: number;
  startedAt: string;
  estimatedArrival: string;
  totalDistanceKm: number;
  passengers: number;
  shareCode: string;
  progress: number;
  timeLeftMinutes: number;
  driverPosition: LatLng;
  waypoints: Array<{
    label: string;
    coord: LatLng;
  }>;
  heartbeatAt: string | null;
  telemetryFresh: boolean;
}

async function fetchLiveTripSnapshot(): Promise<LiveTripSnapshot | null> {
  const { token } = await getAuthDetails();
  const response = await fetchWithRetry(`${API_URL}/live-trip`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10_000,
  });

  if (!response.ok) return null;
  const body = await response.json();
  return (body.snapshot ?? null) as LiveTripSnapshot | null;
}

export function subscribeToLiveTripPresence(
  _authUserId: string,
  onSnapshot: (snapshot: LiveTripSnapshot | null) => void,
): () => void {
  let active = true;
  let refreshing: Promise<void> | null = null;

  const refresh = () => {
    if (!active || refreshing) return;

    refreshing = fetchLiveTripSnapshot()
      .then(snapshot => {
        if (active) onSnapshot(snapshot);
      })
      .catch(() => {
        if (active) onSnapshot(null);
      })
      .finally(() => {
        refreshing = null;
      });
  };

  refresh();
  const interval = window.setInterval(refresh, 5000);

  return () => {
    active = false;
    window.clearInterval(interval);
  };
}
