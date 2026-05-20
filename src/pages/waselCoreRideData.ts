/**
 * waselCoreRideData.ts
 *
 * IMPORTANT: ALL_RIDES is intentionally EMPTY in production.
 * The platform uses only real rides fetched from Supabase via journeyLogistics / tripsAPI.
 *
 * Historical context: A static demo array existed here during early prototyping.
 * It was removed because mixing fake and real rides is a data-integrity violation.
 *
 * DO NOT add hardcoded rides back to this file.
 * To seed test data use: supabase/seeds/rides.sql
 */

import type { PostedRide } from '../services/journeyLogistics';
import type { TripSearchResult } from '../services/trips';

export interface Ride {
  id: string;
  ownerId?: string;
  routeMode?: 'live_post' | 'network_inventory';
  driver: {
    name: string;
    nameAr: string;
    rating: number;
    verified: boolean;
    trips: number;
    phone: string;
    avatar: string;
  };
  from: string;
  fromAr: string;
  fromPoint?: string;
  to: string;
  toAr: string;
  toPoint?: string;
  date: string;
  time: string;
  seatsAvailable: number;
  totalSeats: number;
  pricePerSeat: number;
  distance: number;
  duration: string;
  genderPref: 'mixed' | 'women_only' | 'family_only';
  amenities: string[];
  prayerStops: boolean;
  ramadan?: boolean;
  car: string;
  carColor?: string;
  pkgCapacity: 'none' | 'small' | 'medium' | 'large';
  conversationLevel: 'quiet' | 'normal' | 'talkative';
  intermediateStops?: string[];
  reviews?: { name: string; rating: number; text: string }[];
}

// ── Production data ────────────────────────────────────────────────────────────
// Real rides come from Supabase via getConnectedRides() + tripsAPI.searchTrips()
// This array is intentionally empty. Do not add demo data here.
export const ALL_RIDES: Ride[] = [];

// ── City list ──────────────────────────────────────────────────────────────────
export const CITIES = [
  'Amman',
  'Aqaba',
  'Irbid',
  'Zarqa',
  'Dead Sea',
  'Karak',
  'Madaba',
  'Petra',
  'Jerash',
  'Mafraq',
  'Salt',
];

// ── Storage keys (localStorage used only as read-through cache) ───────────────
export const RIDE_BOOKINGS_KEY = 'wasel-find-ride-bookings';
export const RIDE_SEARCHES_KEY = 'wasel-find-ride-searches';
export const OFFER_RIDE_DRAFT_KEY = 'wasel-offer-ride-draft';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createUpcomingDate(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatDateISO(date);
}

export function normalizeRideDate(date?: string, fallbackOffset = 1) {
  if (!date) return createUpcomingDate(fallbackOffset);
  const parsed = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!Number.isFinite(parsed.getTime()) || parsed < today) {
    return createUpcomingDate(fallbackOffset);
  }
  return date;
}

export function createGenderMeta(theme: { cyan: string; gold: string }) {
  return {
    mixed: { label: 'Mixed', labelAr: 'مختلط', emoji: '👥', color: theme.cyan },
    women_only: { label: 'Women Only', labelAr: 'نساء فقط', emoji: '🚺', color: '#FF69B4' },
    family_only: { label: 'Family Only', labelAr: 'عائلة', emoji: '👨‍👩‍👧', color: theme.gold },
  } as const;
}

export function buildRideFromPostedRide(ride: PostedRide): Ride {
  const capacityLabel =
    ride.packageCapacity === 'large'
      ? 'Large trunk'
      : ride.packageCapacity === 'small'
        ? 'Compact package lane'
        : 'Package lane ready';

  return {
    id: `live-${ride.id}`,
    ownerId: ride.ownerId,
    routeMode: 'live_post',
    driver: {
      name: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
      nameAr: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
      rating: 4.8,
      verified: true,
      trips: 0,
      phone: '',
      avatar: (ride.carModel || 'Wasel').slice(0, 2).toUpperCase(),
    },
    from: ride.from,
    fromAr: ride.from,
    fromPoint: 'Shared pickup point',
    to: ride.to,
    toAr: ride.to,
    toPoint: 'Shared dropoff point',
    date: normalizeRideDate(ride.date, 1),
    time: ride.time || 'Flexible',
    seatsAvailable: Math.max(1, ride.seats),
    totalSeats: Math.max(1, ride.seats),
    pricePerSeat: Math.max(0, ride.price),
    distance: 0,
    duration: 'Live route',
    genderPref:
      ride.gender === 'women_only'
        ? 'women_only'
        : ride.gender === 'family_only'
          ? 'family_only'
          : 'mixed',
    amenities: ['Live post', ride.carModel || 'Private vehicle', capacityLabel],
    prayerStops: ride.prayer,
    car: ride.carModel || 'Private vehicle',
    pkgCapacity: ride.acceptsPackages ? ride.packageCapacity : 'none',
    conversationLevel: 'normal',
    reviews: ride.note ? [{ name: 'Route note', rating: 5, text: ride.note }] : undefined,
  };
}

export function buildRideFromTripSearchResult(ride: TripSearchResult): Ride {
  const normalizedDate = normalizeRideDate(ride.date, 1);
  const normalizedSeats = Math.max(0, Number(ride.seats) || 0);
  const driverInitials =
    ride.driver.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('') || 'WD';

  return {
    id: String(ride.id),
    routeMode: 'network_inventory',
    driver: {
      name: ride.driver.name,
      nameAr: ride.driver.name,
      rating: ride.driver.rating,
      verified: ride.driver.verified,
      trips: 0,
      phone: '',
      avatar: driverInitials,
    },
    from: ride.from,
    fromAr: ride.from,
    fromPoint: 'Verified pickup point',
    to: ride.to,
    toAr: ride.to,
    toPoint: 'Verified dropoff point',
    date: normalizedDate,
    time: ride.time || 'Flexible',
    seatsAvailable: normalizedSeats,
    totalSeats: Math.max(normalizedSeats, 1),
    pricePerSeat: Math.max(0, Number(ride.price) || 0),
    distance: 0,
    duration: 'Scheduled route',
    genderPref: 'mixed',
    amenities: ['Verified route', ride.driver.verified ? 'Verified driver' : 'Driver profile'],
    prayerStops: false,
    car: 'Wasel vehicle',
    pkgCapacity: 'none',
    conversationLevel: 'normal',
  };
}
