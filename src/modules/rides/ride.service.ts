import { getConnectedRides } from '../../services/journeyLogistics';
import {
  createRideBooking,
  getRideBookings,
  hydrateRideBookings,
  type RideBookingRecord,
} from '../../services/rideLifecycle';
import { transitionRide } from '../../services/rideStateMachine';
import { tripsAPI, type TripSearchResult } from '../../services/trips';
import {
  JORDAN_CITY_OPTIONS,
  JORDAN_LOCATION_OPTIONS,
  resolveJordanLocationCoord,
  routeMatchesLocationPair,
} from '../../utils/jordanLocations';
import { logger } from '../../utils/logging';
import { rideQueue } from './ride.queue';
import type {
  RideLocationField,
  RideRequestPayload,
  RideRequestResult,
  RideResult,
  RideSearchParams,
  RideSuggestion,
  RideType,
} from './ride.types';

const DEFAULT_SUGGESTIONS = JORDAN_LOCATION_OPTIONS.slice(0, 6);
const RECENT_RIDE_SEARCHES_KEY = 'wasel-ride-recent-searches';
const MAX_RECENT_RIDE_SEARCHES = 8;

interface RecentRideSearch {
  from: string;
  to: string;
  createdAt: string;
}

interface SuggestionContext {
  exclude?: string;
  counterpart?: string;
  field: RideLocationField;
  messages?: {
    liveCorridor: (count: number) => string;
    recentSearch: string;
    cityPickup: string;
    regionalCorridor: string;
  };
}

function loadRecentRideSearches(): RecentRideSearch[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_RIDE_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is RecentRideSearch =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as RecentRideSearch).from === 'string' &&
            typeof (entry as RecentRideSearch).to === 'string' &&
            typeof (entry as RecentRideSearch).createdAt === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

function saveRecentRideSearches(searches: RecentRideSearch[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      RECENT_RIDE_SEARCHES_KEY,
      JSON.stringify(searches.slice(0, MAX_RECENT_RIDE_SEARCHES)),
    );
  } catch {
    // Local storage is an optimization, not a requirement.
  }
}

function formatArrivalLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min ETA`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h ETA` : `${hours}h ${remainingMinutes}m ETA`;
}

function estimateEtaMinutes(from: string, to: string) {
  const start = resolveJordanLocationCoord(from);
  const end = resolveJordanLocationCoord(to);
  const latDistance = (start.lat - end.lat) * 111;
  const lngDistance = (start.lng - end.lng) * 96;
  const straightDistanceKm = Math.sqrt(latDistance ** 2 + lngDistance ** 2);
  return Math.max(25, Math.round((straightDistanceKm / 72) * 60));
}

function inferRideType(vehicleType: string): Exclude<RideType, 'any'> {
  const normalized = vehicleType.toLowerCase();
  if (normalized.includes('family') || normalized.includes('van') || normalized.includes('suv')) {
    return 'family';
  }
  if (
    normalized.includes('camry') ||
    normalized.includes('tucson') ||
    normalized.includes('sportage')
  ) {
    return 'comfort';
  }
  return 'economy';
}

function deriveVehicleType(trip?: TripSearchResult) {
  if (trip?.price && trip.price >= 10) return 'Comfort Sedan';
  if (trip?.price && trip.price >= 7) return 'Executive Ride';
  return 'Standard Sedan';
}

function toRideResultFromTrip(trip: TripSearchResult): RideResult {
  const etaMinutes = estimateEtaMinutes(trip.from, trip.to);
  const vehicleType = deriveVehicleType(trip);
  return {
    id: trip.id,
    from: trip.from,
    to: trip.to,
    date: trip.date,
    time: trip.time,
    seatsAvailable: trip.seats,
    pricePerSeat: trip.price,
    driver: {
      ...trip.driver,
      trips: Math.max(24, Math.round(trip.driver.rating * 140)),
    },
    routeMode: 'network_inventory',
    vehicleType,
    carModel: vehicleType,
    etaMinutes,
    estimatedArrivalLabel: formatArrivalLabel(etaMinutes),
    recommendedReason: trip.driver.verified ? 'Top verified driver' : undefined,
    rideType: inferRideType(vehicleType),
    supportsPackages: false,
    totalSeats: trip.seats,
    durationLabel: formatArrivalLabel(etaMinutes).replace(' ETA', ''),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function dedupeResults(results: RideResult[]) {
  const seen = new Set<string>();
  return results.filter(ride => {
    if (seen.has(ride.id)) return false;
    seen.add(ride.id);
    return true;
  });
}

function scoreRide(ride: RideResult) {
  const availabilityScore = ride.seatsAvailable > 0 ? 30 : -100;
  const ratingScore = ride.driver.rating * 10;
  const etaScore = Math.max(0, 40 - Math.min(ride.etaMinutes, 40));
  const priceScore = Math.max(0, 25 - ride.pricePerSeat);
  return availabilityScore + ratingScore + etaScore + priceScore;
}

function getCorridorMatchCount(
  _option: string,
  _counterpart: string | undefined,
  _field: RideLocationField,
) {
  return 0;
}

function getRecentSearchScore(
  option: string,
  counterpart: string | undefined,
  field: RideLocationField,
  recentSearches: RecentRideSearch[],
) {
  return recentSearches.reduce((score, search, index) => {
    const isFieldMatch =
      field === 'from'
        ? search.from === option && (!counterpart || search.to === counterpart)
        : search.to === option && (!counterpart || search.from === counterpart);

    return isFieldMatch ? score + Math.max(4, 16 - index * 2) : score;
  }, 0);
}

function buildSuggestionSupportingText(
  option: string,
  corridorMatches: number,
  recentSearchMatches: number,
  counterpart: string | undefined,
  messages: NonNullable<SuggestionContext['messages']>,
) {
  if (corridorMatches > 0 && counterpart) {
    return messages.liveCorridor(corridorMatches);
  }

  if (recentSearchMatches > 0) {
    return messages.recentSearch;
  }

  return JORDAN_CITY_OPTIONS.includes(option) ? messages.cityPickup : messages.regionalCorridor;
}

function indexRequestsByRideId(bookings: RideBookingRecord[]) {
  return bookings.reduce<Record<string, RideBookingRecord>>((accumulator, booking) => {
    if (!booking.rideId) return accumulator;

    const existing = accumulator[booking.rideId];
    if (
      !existing ||
      new Date(existing.updatedAt).getTime() < new Date(booking.updatedAt).getTime()
    ) {
      accumulator[booking.rideId] = booking;
    }

    return accumulator;
  }, {});
}

export const rideService = {
  async searchRides(params: RideSearchParams): Promise<RideResult[]> {
    try {
      const liveTrips = await tripsAPI.searchTrips(params.from, params.to, params.date, params.seats);
      return dedupeResults(
        liveTrips
          .filter(
            trip =>
              routeMatchesLocationPair(trip.from, trip.to, params.from, params.to, {
                allowReverse: false,
              }) && trip.seats > 0,
          )
          .map(toRideResultFromTrip),
      )
        .filter(
          ride =>
            params.rideType === undefined ||
            params.rideType === 'any' ||
            ride.rideType === params.rideType,
        )
        .sort((left, right) => scoreRide(right) - scoreRide(left));
    } catch (error) {
      logger.error('[rideService] ride search failed', error, {
        operation: 'ride.search.backend_failure',
        from: params.from,
        to: params.to,
        date: params.date,
      });
      throw new Error('Unable to search rides right now.');
    }
  },

  rememberRecentSearch(from: string, to: string) {
    const normalizedFrom = from.trim();
    const normalizedTo = to.trim();
    if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
      return;
    }

    const nextSearch: RecentRideSearch = {
      from: normalizedFrom,
      to: normalizedTo,
      createdAt: new Date().toISOString(),
    };

    const existing = loadRecentRideSearches().filter(
      search => !(search.from === normalizedFrom && search.to === normalizedTo),
    );

    saveRecentRideSearches([nextSearch, ...existing]);
  },

  async getLocationSuggestions(
    query: string,
    context: SuggestionContext,
  ): Promise<RideSuggestion[]> {
    const normalized = query.trim().toLowerCase();
    const recentSearches = loadRecentRideSearches();
    const messages = context.messages ?? {
      liveCorridor: (count: number) =>
        `${count} live ride${count === 1 ? '' : 's'} on this corridor`,
      recentSearch: 'Recent search shortcut',
      cityPickup: 'City pickup point',
      regionalCorridor: 'Regional corridor',
    };

    const options = normalized
      ? JORDAN_LOCATION_OPTIONS.filter(option => option.toLowerCase().includes(normalized))
      : Array.from(
          new Set([
            ...DEFAULT_SUGGESTIONS,
            ...recentSearches.flatMap(search => [search.from, search.to]),
          ]),
        );

    return options
      .filter(option => option !== context.exclude)
      .map(option => {
        const queryScore = normalized ? (option.toLowerCase().startsWith(normalized) ? 50 : 24) : 8;
        const corridorMatches = getCorridorMatchCount(option, context.counterpart, context.field);
        const recentSearchMatches = getRecentSearchScore(
          option,
          context.counterpart,
          context.field,
          recentSearches,
        );
        const score = queryScore + corridorMatches * 12 + recentSearchMatches;

        return {
          value: option,
          label: option,
          supportingText: buildSuggestionSupportingText(
            option,
            corridorMatches,
            recentSearchMatches,
            context.counterpart,
            messages,
          ),
          score,
        };
      })
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
      .slice(0, 6)
      .map(({ score: _score, ...suggestion }) => suggestion);
  },

  async detectOrigin(): Promise<string> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return 'Amman';
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 1000 * 60 * 5,
      });
    }).catch(() => null);

    if (!position) {
      return 'Amman';
    }

    let bestMatch = 'Amman';
    let bestScore = Number.POSITIVE_INFINITY;

    for (const city of JORDAN_CITY_OPTIONS) {
      const candidate = resolveJordanLocationCoord(city);
      const score =
        Math.abs(candidate.lat - position.coords.latitude) +
        Math.abs(candidate.lng - position.coords.longitude);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = city;
      }
    }

    return bestMatch;
  },

  async createRideRequest(payload: RideRequestPayload): Promise<RideRequestResult> {
    const booking = await createRideBooking({
      rideId: payload.ride.id,
      ownerId: payload.ride.ownerId,
      driverPhone: payload.ride.driver.phone,
      driverEmail: payload.ride.driver.email,
      passengerId: payload.passengerId,
      from: payload.ride.from,
      to: payload.ride.to,
      date: payload.ride.date,
      time: payload.ride.time,
      driverName: payload.ride.driver.name,
      passengerName: payload.passengerName ?? 'Wasel rider',
      passengerPhone: payload.passengerPhone,
      passengerEmail: payload.passengerEmail,
      seatsRequested: 1,
      pricePerSeatJod: payload.ride.pricePerSeat,
      routeMode: payload.ride.routeMode,
    });

    const queueJobId = await rideQueue.matchDriver(payload.ride.id, booking.id);

    let lifecycleSynced = true;

    try {
      await transitionRide({
        rideId: payload.ride.id,
        toStatus: 'REQUESTED',
        actorId: payload.passengerId,
        payload: {
          alreadyQueued: true,
          bookingId: booking.id,
          passengerId: payload.passengerId,
          queueJobId,
          from: payload.ride.from,
          to: payload.ride.to,
          routeMode: payload.ride.routeMode,
        },
        idempotencyKey: `ride:request:${booking.id}`,
      });
    } catch (error) {
      lifecycleSynced = false;
      logger.warning('[rideService] ride lifecycle sync failed', {
        error: error instanceof Error ? error.message : String(error),
        bookingId: booking.id,
        rideId: payload.ride.id,
      });
    }

    return { booking, queueJobId, lifecycleSynced };
  },

  getRecommendedRideId(results: RideResult[]) {
    return [...results].sort((left, right) => scoreRide(right) - scoreRide(left))[0]?.id;
  },

  async getRideById(rideId: string): Promise<RideResult | null> {
    try {
      const trip = await tripsAPI.getTripById(rideId);
      return toRideResultFromTrip(trip);
    } catch {
      return null;
    }
  },

  getActiveRideRequest(rideId: string): RideBookingRecord | null {
    return getRideBookings().find(booking => booking.rideId === rideId) ?? null;
  },

  getRideRequestsIndex(rideIds?: string[]) {
    const allowedRideIds = rideIds ? new Set(rideIds) : null;
    const bookings = allowedRideIds
      ? getRideBookings().filter(booking => allowedRideIds.has(booking.rideId))
      : getRideBookings();

    return indexRequestsByRideId(bookings);
  },

  async hydrateRideRequests(passengerId: string, rideIds?: string[]) {
    await hydrateRideBookings(passengerId, getConnectedRides());
    return indexRequestsByRideId(
      rideIds
        ? getRideBookings().filter(booking => rideIds.includes(booking.rideId))
        : getRideBookings(),
    );
  },
};
