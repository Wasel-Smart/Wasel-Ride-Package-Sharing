/**
 * useFindRide — single source of truth for all FindRidePage state & logic.
 *
 * Extracted from the 700-line monolith so the page component stays a
 * thin view layer and every unit of behaviour is independently testable.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useLiveRouteIntelligence, getLiveCorridorSignal } from '../../../services/routeDemandIntelligence';
import { createDemandAlert, getDemandStats, hydrateDemandAlerts } from '../../../services/demandCapture';
import { trackGrowthEvent } from '../../../services/growthEngine';
import { getConnectedRides } from '../../../services/journeyLogistics';
import { getMovementPriceQuote } from '../../../services/movementPricing';
import { recordMovementActivity } from '../../../services/movementMembership';
import {
  createReminderFromSuggestion,
  formatRouteReminderSchedule,
  getRecurringRouteSuggestions,
  getRouteReminderForCorridor,
  getRouteReminders,
  syncRouteReminders,
} from '../../../services/movementRetention';
import { notificationsAPI } from '../../../services/notifications.js';
import { subscribeToRideBookingRealtime } from '../../../services/rideRealtime';
import { createRideBooking, getRideBookings, type RideBookingRecord } from '../../../services/rideLifecycle';
import { getCorridorOpportunity, getMarketplaceNodes } from '../../../config/wasel-movement-network';
import {
  ALL_RIDES,
  buildRideFromPostedRide,
  CITIES,
  RIDE_BOOKINGS_KEY,
  RIDE_SEARCHES_KEY,
  type Ride,
} from '../../../pages/waselCoreRideData';
import { createFindRideCopy, parseFindRideParams, scoreRideForRecommendation } from '../../../pages/waselCorePageHelpers';
import { readStoredStringList, writeStoredStringList } from '../../../pages/waselCoreStorage';

export type BookingSuccessState = {
  status: 'pending_driver' | 'confirmed';
  routeLabel: string;
  driverName: string;
  priceJod: number;
  ticketCode?: string;
};

export type SortKey = 'price' | 'time' | 'rating';
export type TabKey = 'ride' | 'package';

export interface PackageFormState {
  from: string;
  to: string;
  weight: string;
  note: string;
  sent: boolean;
}

export function useFindRide() {
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const { initialFrom, initialTo, initialDate, initialSearched } = parseFindRideParams(location.search);
  const t = createFindRideCopy(ar);

  const [tab, setTab] = useState<TabKey>('ride');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [searched, setSearched] = useState(initialSearched);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>('rating');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ride | null>(null);
  const [bookingInFlightId, setBookingInFlightId] = useState<string | null>(null);
  const [rideBookings, setRideBookings] = useState<RideBookingRecord[]>(() => getRideBookings());
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessState | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);
  const [savedReminders, setSavedReminders] = useState(() => getRouteReminders());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readStoredStringList(RIDE_SEARCHES_KEY));
  const [pkg, setPkg] = useState<PackageFormState>({ from: 'Amman', to: 'Aqaba', weight: '<1 kg', note: '', sent: false });

  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(0, 3), []);
  const corridorPlan = useMemo(() => getCorridorOpportunity(from, to), [from, to]);
  const routeIntelligence = useLiveRouteIntelligence({ from, to });
  const selectedSignal = routeIntelligence.selectedSignal;
  const featuredSignals = routeIntelligence.featuredSignals.slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recurringSuggestions = useMemo(() => getRecurringRouteSuggestions(3), [routeIntelligence.updatedAt]);

  const bookingByRideId = useMemo(() => {
    const next = new Map<string, RideBookingRecord>();
    for (const booking of rideBookings) {
      if (booking.status !== 'pending_driver' && booking.status !== 'confirmed') continue;
      const current = next.get(booking.rideId);
      if (!current || new Date(current.updatedAt).getTime() < new Date(booking.updatedAt).getTime()) {
        next.set(booking.rideId, booking);
      }
    }
    return next;
  }, [rideBookings]);

  const bookedRideIds = useMemo(() => new Set(bookingByRideId.keys()), [bookingByRideId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const signalLookup = useMemo(() => {
    const lookup = new Map<string, ReturnType<typeof getLiveCorridorSignal>>();
    for (const signal of routeIntelligence.allSignals) {
      lookup.set(`${signal.from}::${signal.to}`, signal);
      lookup.set(`${signal.to}::${signal.from}`, signal);
    }
    return lookup;
  }, [routeIntelligence.updatedAt]);

  const demandStats = getDemandStats();
  const connectedRides = getConnectedRides().map(buildRideFromPostedRide);
  const allAvailableRides = [...connectedRides, ...ALL_RIDES];
  const corridorRides = allAvailableRides.filter(r => r.from === from && r.to === to);
  const nearbyCorridors = allAvailableRides
    .filter(r => r.id && !(r.from === from && r.to === to) && (r.from === from || r.to === to || r.to === from || r.from === to))
    .slice(0, 3);

  const results: Ride[] = searched
    ? allAvailableRides
        .filter(r =>
          (!from || r.from.toLowerCase().includes(from.toLowerCase()) || r.fromAr === from) &&
          (!to || r.to.toLowerCase().includes(to.toLowerCase()) || r.toAr === to) &&
          (!date || r.date === date),
        )
        .sort((a, b) =>
          sort === 'price' ? a.pricePerSeat - b.pricePerSeat :
          sort === 'time'  ? a.time.localeCompare(b.time) :
          b.driver.rating - a.driver.rating,
        )
    : allAvailableRides.slice(0, 4);

  const recommendedRides = [...results].sort((a, b) => scoreRideForRecommendation(b) - scoreRideForRecommendation(a)).slice(0, 2);
  const bookedRides = allAvailableRides.filter(r => bookedRideIds.has(r.id)).slice(0, 3);
  const selectedPriceQuote = selectedSignal?.priceQuote ?? (corridorPlan ? getMovementPriceQuote({ basePriceJod: corridorPlan.sharedPriceJod, corridorId: corridorPlan.id, forecastDemandScore: corridorPlan.predictedDemandScore, membership: routeIntelligence.membership }) : null);
  const selectedBooking = selected ? (bookingByRideId.get(selected.id) ?? null) : null;

  const resolveSignalForRoute = useCallback(
    (routeFrom: string, routeTo: string) =>
      signalLookup.get(`${routeFrom}::${routeTo}`) ?? getLiveCorridorSignal(routeFrom, routeTo, routeIntelligence.membership),
    [signalLookup, routeIntelligence.membership],
  );

  const getRideBookingStatus = useCallback(
    (rideId: string): 'pending_driver' | 'confirmed' | null => {
      const status = bookingByRideId.get(rideId)?.status;
      return status === 'pending_driver' || status === 'confirmed' ? status : null;
    },
    [bookingByRideId],
  );

  const openMyTrips = useCallback(() => nav('/app/my-trips?tab=rides'), [nav]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToRideBookingRealtime({ userId: user.id, rides: getConnectedRides(), onBookingsChange: setRideBookings });
    void hydrateDemandAlerts(user.id);
    return unsub;
  }, [user?.id]);

  useEffect(() => { setSavedReminders(getRouteReminders()); }, [routeIntelligence.updatedAt]);

  useEffect(() => {
    void syncRouteReminders(user ?? undefined).then(delivered => { if (delivered.length > 0) setSavedReminders(getRouteReminders()); });
  }, [routeIntelligence.updatedAt, user?.email, user?.phone]);

  useEffect(() => { writeStoredStringList(RIDE_BOOKINGS_KEY, Array.from(bookedRideIds)); }, [bookedRideIds]);
  useEffect(() => { writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches); }, [recentSearches]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextFrom = CITIES.includes(params.get('from') ?? '') ? params.get('from')! : 'Amman';
    const nextTo = CITIES.includes(params.get('to') ?? '') ? params.get('to')! : 'Aqaba';
    setFrom(nextFrom);
    setTo(nextTo);
    setDate(params.get('date') ?? '');
    setSearched(params.get('search') === '1');
  }, [location.search]);

  const handleSearch = useCallback(() => {
    if (from === to) { setSearchError(t.chooseDifferentCities); setSearched(false); return; }
    setSearchError(null); setBookingMessage(null); setBookingSuccess(null); setLoading(true);
    setTimeout(() => {
      setLoading(false); setSearched(true);
      setRecentSearches(prev => {
        const label = `${from} to ${to}${date ? ` on ${date}` : ''}`;
        return [label, ...prev.filter(i => i !== label)].slice(0, 4);
      });
      void trackGrowthEvent({ userId: user?.id, eventName: 'ride_search_executed', funnelStage: 'searched', serviceType: 'ride', from, to, metadata: { date: date || null } });
    }, 700);
  }, [from, to, date, user?.id, t]);

  const handleOpenRide = useCallback((ride: Ride) => {
    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
    const priceQuote = getMovementPriceQuote({ basePriceJod: ride.pricePerSeat, corridorId: rideSignal?.id, forecastDemandScore: rideSignal?.forecastDemandScore, membership: routeIntelligence.membership });
    setSelected(ride);
    void trackGrowthEvent({ userId: user?.id, eventName: 'ride_match_opened', funnelStage: 'selected', serviceType: 'ride', from: ride.from, to: ride.to, valueJod: priceQuote.finalPriceJod, metadata: { rideId: ride.id, driverName: ride.driver.name } });
  }, [resolveSignalForRoute, routeIntelligence.membership, user?.id]);

  const handleBook = useCallback(async (ride: Ride) => {
    const existing = bookingByRideId.get(ride.id);
    if (existing) { setBookingMessage(`${ride.from} to ${ride.to} already ${existing.status === 'pending_driver' ? 'pending' : 'confirmed'}.`); openMyTrips(); return; }
    if (!user) { nav('/app/auth'); return; }
    if (ride.seatsAvailable <= 0) { setBookingMessage(`That ride is full. ${t.openBusFallback}.`); setSelected(null); return; }
    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
    const quote = getMovementPriceQuote({ basePriceJod: ride.pricePerSeat, corridorId: rideSignal?.id, forecastDemandScore: rideSignal?.forecastDemandScore, membership: routeIntelligence.membership });
    setBookingInFlightId(ride.id);
    try {
      const booking = await createRideBooking({ rideId: ride.id, ownerId: ride.ownerId, passengerId: user.id, from: ride.from, to: ride.to, date: ride.date, time: ride.time, driverName: ride.driver.name, passengerName: user.name, seatsRequested: 1, pricePerSeatJod: quote.finalPriceJod, routeMode: ride.routeMode === 'live_post' ? 'live_post' : 'network_inventory' });
      setRideBookings(getRideBookings());
      setBookingSuccess({ status: booking.status === 'pending_driver' ? 'pending_driver' : 'confirmed', routeLabel: `${ride.from} to ${ride.to}`, driverName: ride.driver.name, priceJod: quote.finalPriceJod, ticketCode: booking.ticketCode });
      setBookingMessage(booking.status === 'pending_driver' ? `Request sent for ${ride.from} to ${ride.to}.` : `Seat confirmed for ${ride.from} to ${ride.to}.`);
      notificationsAPI.createNotification({ title: booking.status === 'pending_driver' ? 'Route request sent' : t.bookingStarted, message: `${ride.from} to ${ride.to} at ${quote.finalPriceJod} JOD.`, type: 'booking', priority: 'high', action_url: '/app/my-trips?tab=rides' }).catch(() => {});
      if (permission === 'default') requestPermission().catch(() => {});
      notifyTripConfirmed(ride.driver.name, `${ride.from} to ${ride.to}`);
      void recordMovementActivity('ride_booked', corridorPlan?.id ?? null);
    } catch (error) {
      setBookingSuccess(null);
      setBookingMessage(error instanceof Error ? error.message : 'Unable to book this ride right now.');
    } finally { setBookingInFlightId(null); }
  }, [bookingByRideId, user, nav, resolveSignalForRoute, routeIntelligence.membership, t, openMyTrips, permission, requestPermission, notifyTripConfirmed, corridorPlan]);

  const handleDemandCapture = useCallback(() => {
    const alert = createDemandAlert({ from, to, date: date || new Date().toISOString().slice(0, 10), service: 'ride', userId: user?.id });
    setWaitlistMessage(`Alert saved for ${alert.from} to ${alert.to}.`);
    void trackGrowthEvent({ userId: user?.id, eventName: 'route_demand_alert_saved', funnelStage: 'searched', serviceType: 'ride', from: alert.from, to: alert.to });
  }, [from, to, date, user?.id]);

  const handleSaveReminder = useCallback((corridorId: string) => {
    const suggestion = recurringSuggestions.find(s => s.corridorId === corridorId);
    if (!suggestion) return;
    const reminder = createReminderFromSuggestion(suggestion);
    setSavedReminders(getRouteReminders());
    setRetentionMessage(`Reminder saved. ${formatRouteReminderSchedule(reminder)}.`);
    void trackGrowthEvent({ userId: user?.id, eventName: 'route_reminder_saved', funnelStage: 'selected', serviceType: 'ride', from: reminder.from, to: reminder.to });
  }, [recurringSuggestions, user?.id]);

  return {
    tab, from, to, date, searched, loading, sort, searchError,
    selected, bookingInFlightId, bookingMessage, bookingSuccess,
    waitlistMessage, retentionMessage, savedReminders, recentSearches, pkg, ar, t,
    results, recommendedRides, bookedRides, nearbyCorridors, corridorRides,
    marketplaceNodes, corridorPlan, routeIntelligence, selectedSignal, featuredSignals,
    recurringSuggestions, bookingByRideId, bookedRideIds, demandStats, selectedPriceQuote, selectedBooking,
    setTab, setFrom, setTo, setDate, setSort, setPkg,
    handleSearch, handleOpenRide, handleBook, handleDemandCapture, handleSaveReminder,
    resolveSignalForRoute, getRideBookingStatus, openMyTrips,
    clearBookingSuccess: () => setBookingSuccess(null),
    getRouteReminderForCorridor, nav,
  };
}
