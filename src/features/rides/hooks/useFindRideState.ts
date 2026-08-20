import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useRideFilters } from './hooks/useRideFilters';
import { MapWrapper } from '../../components/MapWrapper';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import {
  createDemandAlert,
  getDemandStats,
  hydrateDemandAlerts,
} from '../../services/demandCapture';
import { trackGrowthEvent } from '../../services/growthEngine';
import { getConnectedRides } from '../../services/journeyLogistics';
import { getMovementPriceQuote } from '../../services/movementPricing';
import { recordMovementActivity } from '../../services/movementMembership';
import {
  createReminderFromSuggestion,
  formatRouteReminderSchedule,
  getRecurringRouteSuggestions,
  getRouteReminderForCorridor,
  getRouteReminders,
  syncRouteReminders,
} from '../../services/movementRetention';
import { notificationsAPI } from '../../services/notifications.js';
import { subscribeToRideBookingRealtime } from '../../services/rideRealtime';
import {
  getLiveCorridorSignal,
  useLiveRouteIntelligence,
} from '../../services/routeDemandIntelligence';
import {
  createRideBooking,
  getRideBookings,
  updateRideBooking,
  type RideBookingRecord,
} from '../../services/rideLifecycle';
import { walletApi } from '../../services/walletApi';
import { getCorridorOpportunity, getMarketplaceNodes } from '../../config/wasel-movement-network';
import {
  CITIES,
  RIDE_BOOKINGS_KEY,
  RIDE_SEARCHES_KEY,
  type Ride,
} from '../../pages/waselCoreRideData';
import {
  createFindRideCopy,
  parseFindRideParams,
  scoreRideForRecommendation,
} from '../../pages/waselCorePageHelpers';
import { readStoredStringList, writeStoredStringList } from '../../pages/waselCoreStorage';
import {
  DS,
  midpoint,
  pill,
  Protected,
  r,
  resolveCityCoord,
} from '../../pages/waselServiceShared';
import { C } from '../../utils/wasel-ds';
import { getFindRideStaticCopy } from './findRideContent';
import { useRideInventory } from './useRideInventory';

export type BookingSuccessState = {
  status: 'pending_driver' | 'confirmed';
  routeLabel: string;
  driverName: string;
  priceJod: number;
  ticketCode?: string;
};

export interface UseFindRideStateResult {
  // State
  tab: 'ride' | 'package';
  setTab: (tab: 'ride' | 'package') => void;
  from: string;
  setFrom: (value: string) => void;
  to: string;
  setTo: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  searched: boolean;
  setSearched: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  selected: Ride | null;
  setSelected: (ride: Ride | null) => void;
  bookingInFlightId: string | null;
  setBookingInFlightId: (id: string | null) => void;
  rideBookings: RideBookingRecord[];
  setRideBookings: (bookings: RideBookingRecord[]) => void;
  recentSearches: string[];
  setRecentSearches: (searches: string[]) => void;
  searchError: string | null;
  setSearchError: (error: string | null) => void;
  bookingMessage: string | null;
  setBookingMessage: (message: string | null) => void;
  bookingSuccess: BookingSuccessState | null;
  setBookingSuccess: (success: BookingSuccessState | null) => void;
  waitlistMessage: string | null;
  setWaitlistMessage: (message: string | null) => void;
  retentionMessage: string | null;
  setRetentionMessage: (message: string | null) => void;
  savedReminders: ReturnType<typeof getRouteReminders>;
  setSavedReminders: (reminders: ReturnType<typeof getRouteReminders>) => void;
  pkg: { from: string; to: string; weight: string; note: string; sent: boolean };
  setPkg: (pkg: { from: string; to: string; weight: string; note: string; sent: boolean }) => void;

  // Computed
  marketplaceNodes: ReturnType<typeof getMarketplaceNodes>;
  corridorPlan: ReturnType<typeof getCorridorOpportunity> | undefined;
  routeIntelligence: ReturnType<typeof useLiveRouteIntelligence>;
  selectedSignal: ReturnType<typeof getLiveCorridorSignal> | undefined;
  featuredSignals: ReturnType<typeof getLiveCorridorSignal>[];
  recurringSuggestions: ReturnType<typeof getRecurringRouteSuggestions>;
  bookingByRideId: Map<string, RideBookingRecord>;
  bookedRideIds: Set<string>;
  signalLookup: Map<string, ReturnType<typeof getLiveCorridorSignal>>;
  demandStats: ReturnType<typeof getDemandStats>;
  searchFromCoord: { lat: number; lng: number } | null;
  searchToCoord: { lat: number; lng: number } | null;
  allAvailableRides: Ride[];
  inventoryLoading: boolean;
  corridorRides: Ride[];
  nearbyCorridors: Ride[];
  filteredResults: Ride[];
  results: Ride[];
  recommendedRides: Ride[];
  bookedRides: Ride[];
  selectedPriceQuote: { finalPriceJod: number; discountJod: number } | null;
  selectedBooking: RideBookingRecord | null;

  // Handlers
  handleSearch: () => void;
  handleOpenRide: (ride: Ride) => void;
  handleBook: (ride: Ride) => void;
  handleDemandCapture: () => void;
  handleSaveReminder: (corridorId: string) => void;
  openMyTrips: () => void;
  getRideBookingStatus: (rideId: string) => 'pending_driver' | 'confirmed' | null;
  resolveSignalForRoute: (routeFrom: string, routeTo: string) => ReturnType<typeof getLiveCorridorSignal> | undefined;

  // UI state
  t: ReturnType<typeof createFindRideCopy>;
  copy: ReturnType<typeof getFindRideStaticCopy>;
  ar: boolean;
  nav: (path: string) => void;
  user: { id: string; name?: string } | null | undefined;
  permission: 'default' | 'granted' | 'denied';
  notifyTripConfirmed: (driverName: string, routeLabel: string) => Promise<void>;
  requestPermission: () => Promise<void>;
}

export function useFindRideState(location: ReturnType<typeof useLocation>): UseFindRideStateResult {
  const nav = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const { initialFrom, initialTo, initialDate, initialSearched } = parseFindRideParams(
    location.search,
  );
  const t = createFindRideCopy(ar);
  const copy = getFindRideStaticCopy(ar);

  const [tab, setTab] = useState<'ride' | 'package'>('ride');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [searched, setSearched] = useState(initialSearched);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Ride | null>(null);
  const [bookingInFlightId, setBookingInFlightId] = useState<string | null>(null);
  const [rideBookings, setRideBookings] = useState<RideBookingRecord[]>(() => getRideBookings());
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readStoredStringList(RIDE_SEARCHES_KEY),
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessState | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);
  const [savedReminders, setSavedReminders] = useState(() => getRouteReminders());
  const [pkg, setPkg] = useState({
    from: 'Amman',
    to: 'Aqaba',
    weight: '<1 kg',
    note: '',
    sent: false,
  });

  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(0, 3), []);
  const corridorPlan = useMemo(() => getCorridorOpportunity(from, to), [from, to]);
  const routeIntelligence = useLiveRouteIntelligence({ from, to });
  const selectedSignal = routeIntelligence.selectedSignal;
  const featuredSignals = routeIntelligence.featuredSignals.slice(0, 4);
  const recurringSuggestions = useMemo(
    () => getRecurringRouteSuggestions(3),
    [routeIntelligence.updatedAt],
  );
  const bookingByRideId = useMemo(() => {
    const next = new Map<string, RideBookingRecord>();

    for (const booking of rideBookings) {
      if (booking.status !== 'pending_driver' && booking.status !== 'confirmed') {
        continue;
      }

      const current = next.get(booking.rideId);
      if (
        !current ||
        new Date(current.updatedAt).getTime() < new Date(booking.updatedAt).getTime()
      ) {
        next.set(booking.rideId, booking);
      }
    }

    return next;
  }, [rideBookings]);
  const bookedRideIds = useMemo(() => new Set(bookingByRideId.keys()), [bookingByRideId]);
  const signalLookup = useMemo(() => {
    const lookup = new Map<string, ReturnType<typeof getLiveCorridorSignal>>();
    for (const signal of routeIntelligence.allSignals) {
      lookup.set(`${signal.from}::${signal.to}`, signal);
      lookup.set(`${signal.to}::${signal.from}`, signal);
    }
    return lookup;
  }, [routeIntelligence.updatedAt]);
  const demandStats = getDemandStats();

  const searchFromCoord = resolveCityCoord(from);
  const searchToCoord = resolveCityCoord(to);
  const { rides: allAvailableRides, loading: inventoryLoading } = useRideInventory({ from, to, date, searched });
  const corridorRides = allAvailableRides.filter(ride => ride.from === from && ride.to === to);
  const nearbyCorridors = allAvailableRides
    .filter(
      ride =>
        ride.id &&
        !(ride.from === from && ride.to === to) &&
        (ride.from === from || ride.to === to || ride.to === from || ride.from === to),
    )
    .slice(0, 3);

  const filteredResults: Ride[] = searched
    ? allAvailableRides.filter(
      ride =>
        (!from ||
          ride.from.toLowerCase().includes(from.toLowerCase()) ||
          ride.fromAr === from) &&
        (!to || ride.to.toLowerCase().includes(to.toLowerCase()) || ride.toAr === to) &&
        (!date || ride.date === date),
    )
    : allAvailableRides.slice(0, 4);

  const { sort, setSort, sortedRides: results } = useRideFilters(filteredResults);

  const recommendedRides = [...results]
    .sort((left, right) => scoreRideForRecommendation(right) - scoreRideForRecommendation(left))
    .slice(0, 2);
  const bookedRides = allAvailableRides.filter(ride => bookedRideIds.has(ride.id)).slice(0, 3);
  const selectedPriceQuote =
    selectedSignal?.priceQuote ??
    (corridorPlan
      ? getMovementPriceQuote({
        basePriceJod: corridorPlan.sharedPriceJod,
        corridorId: corridorPlan.id,
        forecastDemandScore: corridorPlan.predictedDemandScore,
        membership: routeIntelligence.membership,
      })
      : null);

  const resolveSignalForRoute = (routeFrom: string, routeTo: string) =>
    signalLookup.get(`${routeFrom}::${routeTo}`) ??
    getLiveCorridorSignal(routeFrom, routeTo, routeIntelligence.membership);
  const openMyTrips = () => nav('/app/my-trips?tab=rides');
  const selectedBooking = selected ? (bookingByRideId.get(selected.id) ?? null) : null;
  const getRideBookingStatus = (rideId: string): 'pending_driver' | 'confirmed' | null => {
    const status = bookingByRideId.get(rideId)?.status;
    return status === 'pending_driver' || status === 'confirmed' ? status : null;
  };

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToRideBookingRealtime({
      userId: user.id,
      rides: getConnectedRides(),
      onBookingsChange: setRideBookings,
    });
    void hydrateDemandAlerts(user.id);
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    setSavedReminders(getRouteReminders());
    void syncRouteReminders(user ?? undefined).then(delivered => {
      if (delivered.length > 0) setSavedReminders(getRouteReminders());
    });
  }, [routeIntelligence.updatedAt, user?.email, user?.phone]);

  useEffect(() => {
    writeStoredStringList(RIDE_BOOKINGS_KEY, Array.from(bookedRideIds));
  }, [bookedRideIds]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextFrom = CITIES.includes(params.get('from') ?? '') ? (params.get('from') as string) : 'Amman';
    const nextTo = CITIES.includes(params.get('to') ?? '') ? (params.get('to') as string) : 'Aqaba';
    const nextDate = params.get('date') ?? '';
    const nextSearched = params.get('search') === '1';
    setFrom(nextFrom);
    setTo(nextTo);
    setDate(nextDate);
    setSearched(nextSearched);
  }, [location.search]);

  const handleSearch = () => {
    if (from === to) {
      setSearchError(t.chooseDifferentCities);
      setSearched(false);
      return;
    }

    setSearchError(null);
    setBookingMessage(null);
    setBookingSuccess(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setRecentSearches(previous => {
        const label = `${from} to ${to}${date ? ` on ${date}` : ''}`;
        return [label, ...previous.filter(item => item !== label)].slice(0, 4);
      });
      void trackGrowthEvent({
        userId: user?.id,
        eventName: 'ride_search_executed',
        funnelStage: 'searched',
        serviceType: 'ride',
        from,
        to,
        metadata: { date: date || null },
      });
    }, 700);
  };

  const handleOpenRide = (ride: Ride) => {
    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
    const priceQuote = getMovementPriceQuote({
      basePriceJod: ride.pricePerSeat,
      corridorId: rideSignal?.id,
      forecastDemandScore: rideSignal?.forecastDemandScore,
      membership: routeIntelligence.membership,
    });
    setSelected(ride);
    void trackGrowthEvent({
      userId: user?.id,
      eventName: 'ride_match_opened',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: ride.from,
      to: ride.to,
      valueJod: priceQuote.finalPriceJod,
      metadata: {
        rideId: ride.id,
        driverName: ride.driver.name,
      },
    });
  };

  const handleBook = async (ride: Ride) => {
    if (bookingInFlightId) return;
    const existingBooking = bookingByRideId.get(ride.id);
    if (existingBooking) {
      setBookingMessage(
        existingBooking.status === 'pending_driver'
          ? `${ride.from} to ${ride.to} is already waiting for driver confirmation in My Trips.`
          : `${ride.from} to ${ride.to} is already confirmed in My Trips.`,
      );
      openMyTrips();
      return;
    }

    if (!user) {
      nav('/app/auth');
      return;
    }
    if (ride.seatsAvailable <= 0) {
      setBookingMessage(`That ride is full. ${copy.openBusFallback}.`);
      setSelected(null);
      return;
    }

    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
    const ridePriceQuote = getMovementPriceQuote({
      basePriceJod: ride.pricePerSeat,
      corridorId: rideSignal?.id,
      forecastDemandScore: rideSignal?.forecastDemandScore,
      membership: routeIntelligence.membership,
    });
    const finalPrice = ridePriceQuote.finalPriceJod;

    setBookingInFlightId(ride.id);

    try {
      const booking = await createRideBooking({
        rideId: ride.id,
        ownerId: ride.ownerId,
        passengerId: user.id,
        from: ride.from,
        to: ride.to,
        date: ride.date,
        time: ride.time,
        driverName: ride.driver.name,
        passengerName: user.name,
        seatsRequested: 1,
        pricePerSeatJod: finalPrice,
        routeMode: ride.routeMode === 'live_post' ? 'live_post' : 'network_inventory',
      });

      setRideBookings(getRideBookings());
      setSelected(null);
      setBookingSuccess({
        status: booking.status === 'pending_driver' ? 'pending_driver' : 'confirmed',
        routeLabel: `${ride.from} to ${ride.to}`,
        driverName: ride.driver.name,
        priceJod: finalPrice,
        ticketCode: booking.ticketCode,
      });
      setBookingMessage(
        booking.status === 'pending_driver'
          ? `Request sent for ${ride.from} to ${ride.to}.`
          : `Seat confirmed for ${ride.from} to ${ride.to}.`,
      );

      if (booking.status === 'confirmed') {
        try {
          await walletApi.pay(user.id, finalPrice, 'ride_booking', booking.id, {
            rideId: ride.id,
            from: ride.from,
            to: ride.to,
            seats: 1,
          });
        } catch (paymentError) {
          console.error('[Wallet] ride booking payment failed, cancelling booking:', paymentError);
          await updateRideBooking(booking.id, { status: 'cancelled' }).catch(() => {});
          setRideBookings(getRideBookings());
          setBookingSuccess(null);
          setBookingMessage(
            `Booking for ${ride.from} to ${ride.to} was cancelled because payment could not be processed. Please check your wallet balance and try again.`,
          );
          return;
        }
      } else {
        walletApi
          .pay(user.id, finalPrice, 'ride_booking', booking.id, {
            rideId: ride.id,
            from: ride.from,
            to: ride.to,
            seats: 1,
          })
          .catch(err => {
            console.warn('[Wallet] deferred payment queued for driver-confirm flow:', err);
          });
      }

      notificationsAPI
        .createNotification({
          title: booking.status === 'pending_driver' ? 'Route request sent' : t.bookingStarted,
          message:
            booking.status === 'pending_driver'
              ? `${ride.from} to ${ride.to} is waiting for driver approval at ${finalPrice} JOD.`
              : `${ride.from} to ${ride.to} at ${ride.time} is now in your trips at ${finalPrice} JOD with boarding reminders.`,
          type: 'booking',
          priority: 'high',
          action_url: '/app/my-trips?tab=rides',
        })
        .catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }

      notifyTripConfirmed(ride.driver.name, `${ride.from} to ${ride.to}`);
      void recordMovementActivity('ride_booked', corridorPlan?.id ?? null);
    } finally {
      setBookingInFlightId(null);
    }
  };

  const handleDemandCapture = () => {
    const alert = createDemandAlert({
      from,
      to,
      date: date || new Date().toISOString().slice(0, 10),
      service: 'ride',
      userId: user?.id,
    });

    setWaitlistMessage(`Alert saved for ${alert.from} to ${alert.to}.`);
    void trackGrowthEvent({
      userId: user?.id,
      eventName: 'route_demand_alert_saved',
      funnelStage: 'searched',
      serviceType: 'ride',
      from: alert.from,
      to: alert.to,
    });
  };

  const handleSaveReminder = (corridorId: string) => {
    const suggestion = recurringSuggestions.find(item => item.corridorId === corridorId);
    if (!suggestion) return;

    const reminder = createReminderFromSuggestion(suggestion);
    setSavedReminders(getRouteReminders());
    setRetentionMessage(`Reminder saved. ${formatRouteReminderSchedule(reminder)}.`);
    void trackGrowthEvent({
      userId: user?.id,
      eventName: 'route_reminder_saved',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: reminder.from,
      to: reminder.to,
    });
  };

  return {
    tab,
    setTab,
    from,
    setFrom,
    to,
    setTo,
    date,
    setDate,
    searched,
    setSearched,
    loading,
    setLoading,
    selected,
    setSelected,
    bookingInFlightId,
    setBookingInFlightId,
    rideBookings,
    setRideBookings,
    recentSearches,
    setRecentSearches,
    searchError,
    setSearchError,
    bookingMessage,
    setBookingMessage,
    bookingSuccess,
    setBookingSuccess,
    waitlistMessage,
    setWaitlistMessage,
    retentionMessage,
    setRetentionMessage,
    savedReminders,
    setSavedReminders,
    pkg,
    setPkg,
    marketplaceNodes,
    corridorPlan,
    routeIntelligence,
    selectedSignal,
    featuredSignals,
    recurringSuggestions,
    bookingByRideId,
    bookedRideIds,
    signalLookup,
    demandStats,
    searchFromCoord,
    searchToCoord,
    allAvailableRides,
    inventoryLoading,
    corridorRides,
    nearbyCorridors,
    filteredResults,
    results,
    recommendedRides,
    bookedRides,
    selectedPriceQuote,
    selectedBooking,
    handleSearch,
    handleOpenRide,
    handleBook,
    handleDemandCapture,
    handleSaveReminder,
    openMyTrips,
    getRideBookingStatus,
    resolveSignalForRoute,
    t,
    copy,
    ar,
    nav,
    user,
    permission,
    notifyTripConfirmed,
    requestPermission,
  };
}
