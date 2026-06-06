import { bookingsAPI } from './bookings';
import { BackendRequestError } from './backendWorkflow';
import { trackGrowthEvent } from './growthEngine';
import { tripsAPI } from './trips';
import { OFFICIAL_JORDAN_BUS_ROUTES } from '../data/jordanBusNetwork';

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
  departureTimes?: string[];
  scheduleDays?: string;
  serviceLevel?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  dataSource?: 'live' | 'official';
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
  departureTime: string;
  seatPreference: string;
  scheduleMode: 'depart-now' | 'schedule-later';
  totalPrice: number;
}

export interface BusBookingResult {
  source: 'server' | 'local';
  bookingId: string;
  ticketCode: string;
}

export interface StoredBusBooking extends BusBookingPayload {
  id: string;
  created_at: string;
  ticket_code: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  source?: 'server' | 'local';
  backend_booking_id?: string;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[|,;/]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function looksLikeBusTrip(item: Record<string, unknown>): boolean {
  const busTokens = ['bus', 'coach', 'intercity', 'shuttle'];
  const candidates = [
    item.type,
    item.mode,
    item.service,
    item.transport_type,
    item.route_type,
    item.company,
    item.title,
    item.summary,
  ].map(x => String(x ?? '').toLowerCase());

  return candidates.some(value => busTokens.some(token => value.includes(token)));
}

export function normalizeBusRoute(raw: Record<string, unknown>, index: number): BusRoute {
  const colors = ['#00C8E8', '#2060E8', '#00C875', '#F0A830'];
  const defaultId = `live-bus-${index + 1}`;
  const from = toText(raw.from ?? raw.origin_city, 'Amman');
  const to = toText(raw.to ?? raw.destination_city, 'Aqaba');
  const dep = toText(raw.departure_time ?? raw.dep, '07:00');
  const arr = toText(raw.arrival_time ?? raw.arr, '11:30');
  const price = toNumber(raw.price_per_seat ?? raw.price, 5);
  const seats = Math.max(
    0,
    Math.floor(toNumber(raw.seats_available ?? raw.available_seats ?? raw.seats, 8)),
  );
  const via = toStringList(raw.via_stops ?? raw.intermediate_stops ?? raw.via);
  const amenities = toStringList(raw.amenities ?? raw.features);

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
    color: colors[index % colors.length] ?? colors[0]!,
    via: via.length ? via : ['Main Corridor'],
    duration: toText(raw.duration, '2h 00m'),
    frequency: toText(raw.frequency, 'Daily'),
    punctuality: toText(raw.punctuality, 'On-time service'),
    pickupPoint: toText(raw.pickup_stop ?? raw.pickupPoint, `${from} Main Terminal`),
    dropoffPoint: toText(raw.dropoff_stop ?? raw.dropoffPoint, `${to} Main Terminal`),
    departureTimes: [dep],
    scheduleDays: toText(raw.schedule_days ?? raw.scheduleDays, 'Selected date'),
    serviceLevel: toText(raw.service_level ?? raw.serviceLevel, 'Standard'),
    summary: toText(
      raw.summary,
      `Scheduled ${from} to ${to} coach with digital boarding details and clear seat availability.`,
    ),
    dataSource: 'live',
  };
}

function matchOfficialRoute(route: BusRoute, query: BusRouteQuery): boolean {
  if (query.from && route.from !== query.from) return false;
  if (query.to && route.to !== query.to) return false;
  if (query.seats && route.seats < query.seats) return false;
  return true;
}

export function getOfficialBusRoutes(query: BusRouteQuery = {}): BusRoute[] {
  const exact = OFFICIAL_JORDAN_BUS_ROUTES.filter(route => matchOfficialRoute(route, query));
  if (exact.length > 0) return exact;

  if (query.from || query.to) {
    const close = OFFICIAL_JORDAN_BUS_ROUTES.filter(route => {
      if (query.seats && route.seats < query.seats) return false;
      return (
        route.from === query.from ||
        route.to === query.to ||
        route.to === query.from ||
        route.from === query.to
      );
    });
    if (close.length > 0) return close;
  }

  return OFFICIAL_JORDAN_BUS_ROUTES.filter(route => !query.seats || route.seats >= query.seats);
}

export async function fetchBusRoutes(query: BusRouteQuery): Promise<BusRoute[]> {
  const officialRoutes = getOfficialBusRoutes(query);

  try {
    const response = await tripsAPI.searchTrips(query.from, query.to, query.date, query.seats);
    const list = Array.isArray(response) ? response : [];

    const mapped = list
      .filter((item: unknown) => item && typeof item === 'object')
      .map(item => item as unknown as Record<string, unknown>);

    const busOnly = mapped
      .filter(looksLikeBusTrip)
      .map((item, index) => normalizeBusRoute(item, index));

    return busOnly.length > 0 ? busOnly : officialRoutes;
  } catch {
    return officialRoutes;
  }
}

function persistBusBooking(booking: StoredBusBooking): StoredBusBooking {
  const key = 'wasel-bus-bookings';

  if (typeof window !== 'undefined') {
    const current: StoredBusBooking[] = (() => {
      try {
      const currentRaw = window.localStorage.getItem(key);
      const parsed = currentRaw ? JSON.parse(currentRaw) : [];
        return Array.isArray(parsed) ? (parsed as StoredBusBooking[]) : [];
      } catch {
        return [];
      }
    })();
    const next = [booking, ...current.filter(item => item.id !== booking.id)].slice(0, 50);
    window.localStorage.setItem(key, JSON.stringify(next));
  }

  return booking;
}

function buildBusTicketCode(bookingId: string): string {
  return `BUS-${bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
}

function shouldUseLocalBusFallback(error: unknown): boolean {
  if (error instanceof BackendRequestError) {
    return error.recoverable || error.status === 404;
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('temporarily unavailable') ||
    message.includes('Auth session missing') ||
    message.includes('backend transport is not configured') ||
    message.includes('secure backend') ||
    message.includes('Supabase client is not initialised')
  );
}

function createLocalBusBooking(payload: BusBookingPayload): BusBookingResult {
  const bookingId = `local-bus-${Date.now()}`;
  const ticketCode = buildBusTicketCode(bookingId);

  persistBusBooking({
    ...payload,
    id: bookingId,
    created_at: new Date().toISOString(),
    ticket_code: ticketCode,
    status: 'confirmed',
    source: 'local',
  });

  void trackGrowthEvent({
    eventName: 'bus_booking_created',
    funnelStage: 'booked',
    serviceType: 'bus',
    from: payload.pickupStop,
    to: payload.dropoffStop,
    valueJod: payload.totalPrice,
    metadata: {
      tripId: payload.tripId,
      source: 'local',
      scheduleDate: payload.scheduleDate,
    },
  });

  return {
    source: 'local',
    bookingId,
    ticketCode,
  };
}

export function getStoredBusBookings(): StoredBusBooking[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('wasel-bus-bookings');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
        departure_time: payload.departureTime,
        seat_preference: payload.seatPreference,
        schedule_mode: payload.scheduleMode,
        total_price: payload.totalPrice,
      },
    );

    const bookingId = server?.booking?.id ?? server?.id ?? `server-${Date.now()}`;

    const result: BusBookingResult = {
      source: 'server',
      bookingId: String(bookingId),
      ticketCode: buildBusTicketCode(String(bookingId)),
    };

    persistBusBooking({
      ...payload,
      id: String(bookingId),
      backend_booking_id: String(bookingId),
      created_at: new Date().toISOString(),
      ticket_code: result.ticketCode,
      status: 'confirmed',
      source: 'server',
    });

    void trackGrowthEvent({
      eventName: 'bus_booking_created',
      funnelStage: 'booked',
      serviceType: 'bus',
      from: payload.pickupStop,
      to: payload.dropoffStop,
      valueJod: payload.totalPrice,
      metadata: {
        tripId: payload.tripId,
        source: 'server',
        scheduleDate: payload.scheduleDate,
      },
    });
    return result;
  } catch (error) {
    if (shouldUseLocalBusFallback(error)) {
      return createLocalBusBooking(payload);
    }

    throw error instanceof Error
      ? error
      : new Error(
          'Bus booking is temporarily unavailable because the secure booking backend could not confirm the seat.',
        );
  }
}
