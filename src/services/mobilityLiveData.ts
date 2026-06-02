import { supabase } from './core';

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
  if (!supabase) {
    return null;
  }

  const [{ data: trips }, { data: bookings }, { data: packages }, { data: tripPresence }] =
    await Promise.all([
      supabase
        .from('trips')
        .select(
          'trip_id, origin_city, destination_city, available_seats, total_seats, package_capacity, package_slots_remaining, departure_time, trip_status, allow_packages',
        )
        .is('deleted_at', null)
        .in('trip_status', ['open', 'booked', 'in_progress']),
      supabase
        .from('bookings')
        .select('trip_id, seats_requested, booking_status, status')
        .in('booking_status', ['confirmed', 'pending_driver'])
        .order('created_at', { ascending: false }),
      supabase
        .from('packages')
        .select(
          'trip_id, origin_name, origin_location, destination_name, destination_location, package_status, status',
        )
        .in('package_status', ['created', 'assigned', 'in_transit']),
      supabase
        .from('trip_presence')
        .select('trip_id, active_passengers, active_packages, last_location, last_heartbeat_at'),
    ]);

  return {
    trips: (Array.isArray(trips) ? trips : []) as MobilityTripRow[],
    bookings: (Array.isArray(bookings) ? bookings : []) as MobilityBookingRow[],
    packages: (Array.isArray(packages) ? packages : []) as MobilityPackageRow[],
    tripPresence: (Array.isArray(tripPresence) ? tripPresence : []) as MobilityPresenceRow[],
  };
}

export function subscribeToMobilityLiveRows(
  locale: 'ar' | 'en',
  onChange: () => void,
  onError?: () => void,
): () => void {
  if (!supabase) {
    return () => undefined;
  }

  const channel = supabase
    .channel(`mobility-os-live-${locale}`, {
      config: { broadcast: { self: false } },
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: 'deleted_at=is.null',
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: 'booking_status!=cs.cancelled',
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'packages',
        filter: 'package_status!=cs.delivered',
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_presence',
      },
      onChange,
    )
    .subscribe((status: string) => {
      if (status === 'SUBSCRIPTION_ERROR') {
        onError?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

