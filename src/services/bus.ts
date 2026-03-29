import { bookingsAPI } from './bookings';
import { tripsAPI } from './trips';

export interface BusRoute {
  id: string;
  from: string;
  to: string;
  dep: string;
  arr: string;
  price: number;
  seats: number;
  company: string;
  amenities: string[];
  color: string;
  via: string[];
  duration: string;
  frequency: string;
  punctuality: string;
  pickupPoint: string;
  dropoffPoint: string;
  summary: string;
}

export interface BusRouteQuery {
  date?: string;
  seats?: number;
  from?: string;
  to?: string;
}

export interface BusBookingPayload {
  tripId: string;
  seatsRequested: number;
  pickupStop: string;
  dropoffStop: string;
  scheduleDate: string;
  seatPreference: string;
  scheduleMode: 'depart-now' | 'schedule-later';
  totalPrice: number;
}

export interface BusBookingResult {
  source: 'server' | 'local';
  bookingId: string;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStops(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
}

function looksLikeBusTrip(item: Record<string, unknown>): boolean {
  const busTokens = ['bus', 'coach', 'intercity'];
  const candidates = [
    item.type,
    item.mode,
    item.service,
    item.transport_type,
  ].map((x) => String(x ?? '').toLowerCase());

  return candidates.some((value) => busTokens.some((token) => value.includes(token)));
}

function normalizeBusRoute(raw: Record<string, unknown>, index: number): BusRoute {
  const colors = ['#00C8E8', '#2060E8', '#00C875', '#F0A830'];
  const defaultId = `live-bus-${index + 1}`;
  const from = toText(raw.from ?? raw.origin_city, 'Amman');
  const to = toText(raw.to ?? raw.destination_city, 'Aqaba');
  const dep = toText(raw.departure_time ?? raw.dep, '07:00');
  const arr = toText(raw.arrival_time ?? raw.arr, '11:30');
  const price = toNumber(raw.price_per_seat ?? raw.price, 5);
  const seats = toNumber(raw.seats_available ?? raw.available_seats ?? raw.seats, 8);
  const via = toStops(raw.via_stops ?? raw.intermediate_stops);
  const amenities = toStops(raw.amenities);

  return {
    id: toText(raw.id, defaultId),
    from,
    to,
    dep,
    arr,
    price,
    seats,
    company: toText(raw.company, 'Wasel Express'),
    amenities: amenities.length ? amenities : ['AC', 'USB'],
    color: colors[index % colors.length],
    via: via.length ? via : ['Main Corridor'],
    duration: toText(raw.duration, '2h 00m'),
    frequency: toText(raw.frequency, 'Daily'),
    punctuality: toText(raw.punctuality, 'On-time service'),
    pickupPoint: toText(raw.pickup_stop ?? raw.pickupPoint, `${from} Main Terminal`),
    dropoffPoint: toText(raw.dropoff_stop ?? raw.dropoffPoint, `${to} Main Terminal`),
    summary: toText(raw.summary, 'Comfortable intercity coach with scheduled departures.'),
  };
}

export async function fetchBusRoutes(query: BusRouteQuery): Promise<BusRoute[]> {
  const response = await tripsAPI.searchTrips(query.from, query.to, query.date, query.seats);
  const list = Array.isArray(response)
    ? response
    : Array.isArray(response?.trips)
      ? response.trips
      : Array.isArray(response?.data)
        ? response.data
        : [];

  const mapped = list
    .filter((item: unknown) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>);

  const busOnly = mapped.filter(looksLikeBusTrip);
  const candidate = busOnly.length > 0 ? busOnly : mapped;

  return candidate.map((item, index) => normalizeBusRoute(item, index));
}

function persistLocalBusBooking(payload: BusBookingPayload): string {
  const key = 'wasel-bus-bookings';
  const bookingId = `local-${Date.now()}`;
  const draft = {
    id: bookingId,
    created_at: new Date().toISOString(),
    ...payload,
  };

  if (typeof window !== 'undefined') {
    const currentRaw = window.localStorage.getItem(key);
    const current = currentRaw ? JSON.parse(currentRaw) : [];
    const next = Array.isArray(current) ? [draft, ...current].slice(0, 50) : [draft];
    window.localStorage.setItem(key, JSON.stringify(next));
  }

  return bookingId;
}

export async function createBusBooking(payload: BusBookingPayload): Promise<BusBookingResult> {
  try {
    const server = await bookingsAPI.createBooking(
      payload.tripId,
      payload.seatsRequested,
      payload.pickupStop,
      payload.dropoffStop,
      {
        schedule_date: payload.scheduleDate,
        seat_preference: payload.seatPreference,
        schedule_mode: payload.scheduleMode,
        total_price: payload.totalPrice,
      },
    );

    const bookingId =
      server?.booking?.id ??
      server?.id ??
      `server-${Date.now()}`;

    return {
      source: 'server',
      bookingId: String(bookingId),
    };
  } catch {
    return {
      source: 'local',
      bookingId: persistLocalBusBooking(payload),
    };
  }
}
