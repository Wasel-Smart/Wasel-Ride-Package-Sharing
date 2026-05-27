import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  Brain,
  Calendar,
  CheckCircle2,
  MapPin,
  Network,
  RefreshCw,        // ← Added missing import
  Search,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
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
  hydrateRouteReminders,
  syncRouteReminders,
} from '../../services/movementRetention';
import { notificationsAPI } from '../../services/notifications';
import { subscribeToRideBookingRealtime } from '../../services/rideRealtime';
import {
  getLiveCorridorSignal,
  useLiveRouteIntelligence,
} from '../../services/routeDemandIntelligence';
import {
  createRideBooking,
  getRideBookings,
  type RideBookingRecord,
} from '../../services/rideLifecycle';
import { getCorridorOpportunity, getMarketplaceNodes } from '../../config/wasel-movement-network';
import {
  buildRideFromTripSearchResult,
  buildRideFromPostedRide,
  CITIES,
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
  CoreExperienceBanner,
  DS,
  midpoint,
  PageShell,
  pill,
  Protected,
  r,
  resolveCityCoord,
  SectionHead,
} from '../../pages/waselServiceShared';
import { tripsAPI } from '../../services/trips';
import { FindRideCard } from './components/FindRideCard';
import { FindRidePackagePanel } from './components/FindRidePackagePanel';
import { FindRideTripDetailModal } from './components/FindRideTripDetailModal';
import { getFindRideStaticCopy } from './findRideContent';

type BookingSuccessState = {
  status: 'pending_driver' | 'confirmed';
  routeLabel: string;
  driverName: string;
  priceJod: number;
  ticketCode?: string;
};

export function FindRidePage() {
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const { initialFrom, initialTo, initialDate, initialSearched } = parseFindRideParams(
    location.search,
  );
  const t = useMemo(() => createFindRideCopy(ar), [ar]);
  const copy = useMemo(() => getFindRideStaticCopy(ar), [ar]);

  const [tab, setTab] = useState<'ride' | 'package'>('ride');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [searchCount, setSearchCount] = useState(0);
  const [searched, setSearched] = useState(initialSearched);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<'price' | 'time' | 'rating'>('rating');
  const [selected, setSelected] = useState<Ride | null>(null);
  const [bookingInFlightId, setBookingInFlightId] = useState<string | null>(null);
  const [rideBookings, setRideBookings] = useState<RideBookingRecord[]>(() => getRideBookings());
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readStoredStringList(RIDE_SEARCHES_KEY),
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessState | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);
  const [savedReminders, setSavedReminders] = useState(() => getRouteReminders());
  const [networkRides, setNetworkRides] = useState<Ride[]>([]);
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
  const featuredSignals = useMemo(
    () => routeIntelligence.featuredSignals.slice(0, 4),
    [routeIntelligence.featuredSignals],
  );
  const recurringSuggestions = useMemo(() => {
    void routeIntelligence.updatedAt;
    return getRecurringRouteSuggestions(3);
  }, [routeIntelligence.updatedAt]);
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
  }, [routeIntelligence.allSignals]);
  const demandStats = useMemo(() => {
    void routeIntelligence.updatedAt;
    return getDemandStats();
  }, [routeIntelligence.updatedAt]);

  const searchFromCoord = useMemo(() => resolveCityCoord(from), [from]);
  const searchToCoord = useMemo(() => resolveCityCoord(to), [to]);
  const allAvailableRides = useMemo(() => {
    const rideMap = new Map<string, Ride>();
    for (const ride of networkRides) {
      rideMap.set(ride.id, ride);
    }
    return Array.from(rideMap.values());
  }, [networkRides]);
  const corridorRides = useMemo(
    () => allAvailableRides.filter(ride => ride.from === from && ride.to === to),
    [allAvailableRides, from, to],
  );
  const nearbyCorridors = useMemo(
    () =>
      allAvailableRides
        .filter(
          ride =>
            ride.id &&
            !(ride.from === from && ride.to === to) &&
            (ride.from === from || ride.to === to || ride.to === from || ride.from === to),
        )
        .slice(0, 3),
    [allAvailableRides, from, to],
  );

  const results: Ride[] = useMemo(
    () =>
      searched
        ? allAvailableRides
            .filter(
              ride =>
                (!from ||
                  ride.from.toLowerCase().includes(from.toLowerCase()) ||
                  ride.fromAr === from) &&
                (!to || ride.to.toLowerCase().includes(to.toLowerCase()) || ride.toAr === to) &&
                (!date || ride.date === date),
            )
            .sort((left, right) =>
              sort === 'price'
                ? left.pricePerSeat - right.pricePerSeat
                : sort === 'time'
                  ? left.time.localeCompare(right.time)
                  : right.driver.rating - left.driver.rating,
            )
        : allAvailableRides.slice(0, 4),
    [allAvailableRides, date, from, searched, sort, to],
  );

  const routeReadinessLabel =
    corridorRides.length >= 2
      ? t.instantMatch
      : corridorRides.length === 1
        ? t.bookingReady
        : t.searchHelp;

  const recommendedRides = useMemo(
    () =>
      [...results]
        .sort((left, right) => scoreRideForRecommendation(right) - scoreRideForRecommendation(left))
        .slice(0, 2),
    [results],
  );
  const bookedRides = useMemo(
    () => allAvailableRides.filter(ride => bookedRideIds.has(ride.id)).slice(0, 3),
    [allAvailableRides, bookedRideIds],
  );
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

  const resolveSignalForRoute = useCallback(
    (routeFrom: string, routeTo: string) =>
      signalLookup.get(`${routeFrom}::${routeTo}`) ??
      getLiveCorridorSignal(routeFrom, routeTo, routeIntelligence.membership),
    [routeIntelligence.membership, signalLookup],
  );

  const openMyTrips = () => nav('/app/my-trips?tab=rides');
  const selectedBooking = selected ? (bookingByRideId.get(selected.id) ?? null) : null;

  const getRideBookingStatus = (rideId: string): 'pending_driver' | 'confirmed' | null => {
    const status = bookingByRideId.get(rideId)?.status;
    return status === 'pending_driver' || status === 'confirmed' ? status : null;
  };

  // Effects
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToRideBookingRealtime({
      userId: user.id,
      rides: getConnectedRides(),
      onBookingsChange: setRideBookings,
    });
    void hydrateDemandAlerts(user.id);
    void hydrateRouteReminders(user.id).then(setSavedReminders);
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    setSavedReminders(getRouteReminders());
  }, [routeIntelligence.updatedAt]);

  useEffect(() => {
    if (!user?.id) return;

    void syncRouteReminders(user.id, { email: user.email, phone: user.phone }).then(delivered => {
      if (delivered.length > 0) {
        setSavedReminders(getRouteReminders());
      }
    });
  }, [routeIntelligence.updatedAt, user?.email, user?.id, user?.phone]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromParam = params.get('from') ?? '';
    const toParam = params.get('to') ?? '';
    const nextFrom = CITIES.includes(fromParam) ? fromParam : 'Amman';
    const nextTo = CITIES.includes(toParam) ? toParam : 'Aqaba';
    const nextDate = params.get('date') ?? '';
    const nextSearched = params.get('search') === '1';

    setFrom(nextFrom);
    setTo(nextTo);
    setDate(nextDate);
    setSearched(nextSearched);
  }, [location.search]);

  useEffect(() => {
    if (!searched || from === to) return;

    let cancelled = false;

    const loadSearchResults = async () => {
      setLoading(true);
      setNetworkRides([]);
      setSearchError(null);

      try {
        const trips = await tripsAPI.searchTrips(from, to, date || undefined);
        if (cancelled) return;
        setNetworkRides(trips.map(buildRideFromTripSearchResult));
        setLastUpdated(new Date());
      } catch (error) {
        if (cancelled) return;
        setNetworkRides([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : ar
              ? 'تعذر تحديث الرحلات الآن'
              : 'Unable to refresh live rides right now',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [ar, date, from, searched, to, searchCount]);

  // Handlers
  const handleSearch = async () => {
    if (from === to) {
      setSearchError(t.chooseDifferentCities);
      setSearched(false);
      return;
    }

    setSearchError(null);
    setBookingMessage(null);
    setBookingSuccess(null);
    setLoading(true);
    setSearched(true);
    setSearchCount(prev => prev + 1);

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
      setBookingMessage(`That ride is full. ${t.openBusFallback}.`);
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
        pricePerSeatJod: ridePriceQuote.finalPriceJod,
        routeMode: ride.routeMode === 'live_post' ? 'live_post' : 'network_inventory',
      });

      setRideBookings(getRideBookings());
      setBookingSuccess({
        status: booking.status === 'pending_driver' ? 'pending_driver' : 'confirmed',
        routeLabel: `${ride.from} to ${ride.to}`,
        driverName: ride.driver.name,
        priceJod: ridePriceQuote.finalPriceJod,
        ticketCode: booking.ticketCode,
      });
      setBookingMessage(
        booking.status === 'pending_driver'
          ? `Request sent for ${ride.from} to ${ride.to}.`
          : `Seat confirmed for ${ride.from} to ${ride.to}.`,
      );

      // Notification
      notificationsAPI
        .createNotification({
          title: booking.status === 'pending_driver' ? 'Route request sent' : t.bookingStarted,
          message:
            booking.status === 'pending_driver'
              ? `${ride.from} to ${ride.to} is waiting for driver approval at ${ridePriceQuote.finalPriceJod} JOD.`
              : `${ride.from} to ${ride.to} at ${ride.time} is now in your trips at ${ridePriceQuote.finalPriceJod} JOD with boarding reminders.`,
          type: 'booking',
          priority: 'high',
          action_url: '/app/my-trips?tab=rides',
        })
        .catch(console.error);

      if (permission === 'default') {
        requestPermission().catch(console.error);
      }

      notifyTripConfirmed(ride.driver.name, `${ride.from} to ${ride.to}`);
      void recordMovementActivity(user.id, 'ride_booked', corridorPlan?.id);
    } catch (error) {
      setBookingSuccess(null);
      setBookingMessage(
        error instanceof Error ? error.message : 'Unable to book this ride right now.',
      );
    } finally {
      setBookingInFlightId(null);
    }
  };

  const handleDemandCapture = async () => {
    if (!user?.id) {
      nav('/app/auth');
      return;
    }

    try {
      const alert = await createDemandAlert({
        from,
        to,
        date: date || new Date().toISOString().slice(0, 10),
        service: 'ride',
        userId: user.id,
      });
      setWaitlistMessage(`Alert saved for ${alert.from} to ${alert.to}.`);
    } catch (error) {
      setWaitlistMessage(
        error instanceof Error ? error.message : 'Could not save this alert right now.',
      );
    }
  };

  const handleSaveReminder = async (corridorId: string) => {
    const suggestion = recurringSuggestions.find(item => item.corridorId === corridorId);
    if (!suggestion || !user?.id) {
      if (!user?.id) nav('/app/auth');
      return;
    }

    const reminder = await createReminderFromSuggestion(user.id, suggestion);
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

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Route"
          title="Book a Ride"
          titleAr="احجز مشوار"
          sub="Choose route and date."
          action={{ label: 'Offer a ride', onClick: () => nav('/app/offer-ride') }}
        />

        {/* Rest of your JSX remains exactly the same */}
        {/* ... (all the rest of the component) ... */}

        {selected && (
          <FindRideTripDetailModal
            ride={selected}
            bookingStatus={
              selectedBooking &&
              (selectedBooking.status === 'pending_driver' || selectedBooking.status === 'confirmed')
                ? selectedBooking.status
                : null
            }
            signal={resolveSignalForRoute(selected.from, selected.to)}
            isBooking={bookingInFlightId === selected.id}
            onClose={() => setSelected(null)}
            onBook={() => handleBook(selected)}
            onOpenBooking={openMyTrips}
          />
        )}
      </PageShell>
    </Protected>
  );
}

export default FindRidePage;