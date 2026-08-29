import { API_URL, fetchWithRetry, getAuthDetails } from './core';

export type MobilityTripRow = {
  trip_id: string | null;
  origin_city: string | null;
  destination_city: string | null;
  available_seats: number | null;
  total_seats: number | null;
  package_capacity: number | null;
  package_slots_remaining: number | null;
  departure_time: string | null;
  trip_status: string | null;
  allow_packages: boolean | null;
};

export type MobilityBookingRow = {
  trip_id: string;
  seats_requested: number | null;
  booking_status: string | null;
  status: string | null;
};

export type MobilityPackageRow = {
  trip_id: string | null;
  origin_name: string | null;
  origin_location: string | null;
  destination_name: string | null;
  destination_location: string | null;
  package_status: string | null;
  status: string | null;
};

export type MobilityPresenceRow = {
  trip_id: string;
  active_passengers: number;
  active_packages: number;
  last_location?: {
    lat?: number;
    lng?: number;
    lon?: number;
    city?: string;
  } | null;
  last_heartbeat_at: string;
};

export interface MobilityLiveRows {
  trips: MobilityTripRow[];
  bookings: MobilityBookingRow[];
  packages: MobilityPackageRow[];
  tripPresence: MobilityPresenceRow[];
}

export async function fetchMobilityLiveRows(): Promise<MobilityLiveRows | null> {
  const { token } = await getAuthDetails();
  const response = await fetchWithRetry(`${API_URL}/mobility-os/live-rows`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10_000,
  });

  if (!response.ok) return null;
  return response.json() as Promise<MobilityLiveRows>;
}

export function subscribeToMobilityLiveRows(
  _locale: 'ar' | 'en',
  onChange: () => void,
  onError?: () => void,
): () => void {
  const interval = window.setInterval(() => {
    try {
      onChange();
    } catch {
      onError?.();
    }
  }, 5000);

  return () => window.clearInterval(interval);
}
