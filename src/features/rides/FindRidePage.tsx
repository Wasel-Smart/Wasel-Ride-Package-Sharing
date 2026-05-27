import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  Brain,
  Calendar,
  CheckCircle2,
  MapPin,
  Network,
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
  const connectedRides = useMemo(() => {
    void routeIntelligence.updatedAt;
    return getConnectedRides().map(buildRideFromPostedRide);
  }, [routeIntelligence.updatedAt]);
  const allAvailableRides = useMemo(() => {
    const rideMap = new Map<string, Ride>();
    for (const ride of [...connectedRides, ...networkRides]) {
      rideMap.set(ride.id, ride);
    }
    return Array.from(rideMap.values());
  }, [connectedRides, networkRides]);
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
      setNetworkRides([]); // Clear old results during fetch
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [ar, date, from, searched, to, searchCount]); // searchCount acts as a refresh trigger

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
        .catch((err) => {
          console.error('[Notification Error]:', err);
        });

      if (permission === 'default') {
        requestPermission().catch((err) => {
          console.error('[Push Permission Error]:', err);
        });
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
    if (!suggestion) return;
    if (!user?.id) {
      nav('/app/auth');
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

        <CoreExperienceBanner
          title="Compare rides for one route."
          detail="Search once and compare confirmed drivers, grouped departures, and the strongest route options for this corridor."
          tone={DS.cyan}
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(
            [
              ['ride', 'Shared route'],
              ['package', copy.tabPackage],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: r(12),
                border: `1px solid ${tab === key ? DS.cyan : DS.border}`,
                background: tab === key ? `${DS.cyan}18` : DS.card,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'ride' && (
          <>
            <div
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: 24,
                border: `1px solid ${DS.border}`,
                marginBottom: 24,
              }}
            >
              <div
                className="sp-search-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 180px',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                {[
                  { label: t.from, value: from, setter: setFrom, icon: DS.green },
                  { label: t.to, value: to, setter: setTo, icon: DS.cyan },
                ].map(field => (
                  <div key={field.label}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        color: DS.muted,
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      {field.label}
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: DS.card2,
                        borderRadius: r(12),
                        padding: '0 14px',
                        border: `1px solid ${DS.border}`,
                        height: 46,
                      }}
                    >
                      <MapPin size={15} color={field.icon} />
                      <select
                        value={field.value}
                        onChange={event => field.setter(event.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          fontFamily: DS.F,
                          fontSize: '0.9rem',
                          flex: 1,
                          outline: 'none',
                        }}
                      >
                        {CITIES.map(city => (
                          <option key={city} value={city} style={{ background: DS.card }}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      color: DS.muted,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {t.date}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: DS.card2,
                      borderRadius: r(12),
                      padding: '0 14px',
                      border: `1px solid ${DS.border}`,
                      height: 46,
                    }}
                  >
                    <Calendar size={15} color={DS.muted} />
                    <input
                      type="date"
                      value={date}
                      onChange={event => setDate(event.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontFamily: DS.F,
                        fontSize: '0.85rem',
                        flex: 1,
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSearch}
                data-testid="find-ride-search"
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: r(14),
                  border: 'none',
                  background: DS.gradC,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: 20,
                      height: 20,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  <Search size={18} />
                )}
                {loading ? t.searching : 'Search rides'}
              </motion.button>

              <div
                style={{
                  marginTop: 14,
                  background: DS.card2,
                  borderRadius: r(14),
                  padding: 12,
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <p
                      style={{
                        color: DS.muted,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        margin: '0 0 4px',
                      }}
                    >
                      Route
                    </p>
                    <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>
                      {selectedSignal
                        ? `${selectedSignal.liveSearches} searches, ${selectedSignal.liveBookings} bookings, ${selectedSignal.activeDemandAlerts} alerts.`
                        : 'Check the route before booking.'}
                    </p>
                  </div>
                  <span style={{ ...pill(DS.green), fontSize: '0.72rem' }}>
                    {selectedSignal
                      ? `${selectedSignal.forecastDemandScore}/100 forecast`
                      : (corridorPlan?.density ?? 'steady density')}
                  </span>
                </div>
                <MapWrapper
                  mode="static"
                  center={midpoint(searchFromCoord, searchToCoord)}
                  pickupLocation={searchFromCoord}
                  dropoffLocation={searchToCoord}
                  height={180}
                  showMosques={false}
                  showRadars={false}
                />
              </div>

              {searchError && (
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: `${DS.gold}12`,
                    border: `1px solid ${DS.gold}30`,
                    borderRadius: r(14),
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.84rem',
                  }}
                >
                  <Shield size={16} color={DS.gold} />
                  <span>{searchError}</span>
                </div>
              )}
              {bookingMessage && (
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: 'rgba(0,200,117,0.10)',
                    border: '1px solid rgba(0,200,117,0.28)',
                    borderRadius: r(14),
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.84rem',
                  }}
                >
                  <CheckCircle2 size={16} color={DS.green} />
                  <span>{bookingMessage}</span>
                </div>
              )}
              {bookingSuccess && (
                <div
                  style={{
                    marginTop: 14,
                    background:
                      'linear-gradient(135deg, rgba(0,200,117,0.16), rgba(0,200,232,0.10))',
                    border: '1px solid rgba(0,200,117,0.28)',
                    borderRadius: r(16),
                    padding: '16px 18px',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>
                        {bookingSuccess.status === 'pending_driver'
                          ? 'Request sent'
                          : 'Seat confirmed'}
                      </div>
                      <div
                        style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.6, marginTop: 6 }}
                      >
                        {bookingSuccess.status === 'pending_driver'
                          ? `${bookingSuccess.routeLabel} is now waiting on ${bookingSuccess.driverName}. Wasel will update My Trips as soon as the driver confirms.`
                          : `${bookingSuccess.routeLabel} is secured at ${bookingSuccess.priceJod} JOD. Boarding details and ticket tracking are now ready in My Trips.`}
                      </div>
                    </div>
                    <span
                      style={{
                        ...pill(bookingSuccess.status === 'pending_driver' ? DS.gold : DS.green),
                        fontSize: '0.72rem',
                      }}
                    >
                      {bookingSuccess.status === 'pending_driver'
                        ? `${bookingSuccess.priceJod} JOD pending`
                        : `${bookingSuccess.priceJod} JOD confirmed`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={openMyTrips}
                      style={{
                        height: 42,
                        padding: '0 16px',
                        borderRadius: '999px',
                        border: 'none',
                        background: DS.gradG,
                        color: '#fff',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Open My Trips
                    </button>
                    <button
                      onClick={() => setBookingSuccess(null)}
                      style={{
                        height: 42,
                        padding: '0 16px',
                        borderRadius: '999px',
                        border: `1px solid ${DS.border}`,
                        background: DS.card2,
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Keep browsing
                    </button>
                  </div>
                  {bookingSuccess.ticketCode ? (
                    <div style={{ color: DS.muted, fontSize: '0.74rem' }}>
                      Ticket {bookingSuccess.ticketCode}
                    </div>
                  ) : null}
                </div>
              )}
              {retentionMessage && (
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: `${DS.cyan}12`,
                    border: `1px solid ${DS.cyan}30`,
                    borderRadius: r(14),
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.84rem',
                  }}
                >
                  <Sparkles size={16} color={DS.cyan} />
                  <span>{retentionMessage}</span>
                </div>
              )}

              <div
                className="sp-4col"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {[
                  {
                    label: 'Route readiness',
                    value: selectedSignal
                      ? `${selectedSignal.activeSupply} live departures`
                      : routeReadinessLabel,
                    sub: selectedSignal
                      ? `${selectedSignal.liveBookings} bookings | ${selectedSignal.activeDemandAlerts} alerts`
                      : `${corridorRides.length} live departures`,
                    tone: DS.cyan,
                  },
                  {
                    label: 'Shared price now',
                    value: selectedPriceQuote ? `${selectedPriceQuote.finalPriceJod} JOD` : '--',
                    sub: selectedPriceQuote
                      ? `${selectedPriceQuote.discountJod} JOD saved`
                      : 'Best shared fare',
                    tone: DS.green,
                  },
                  {
                    label: 'Next wave',
                    value:
                      selectedSignal?.nextWaveWindow ??
                      corridorPlan?.autoGroupWindow ??
                      'Next shared wave',
                    sub:
                      selectedSignal?.recommendedPickupPoint ??
                      corridorPlan?.pickupPoints[0] ??
                      'Pickup point shown here',
                    tone: DS.gold,
                  },
                  {
                    label: 'Route ownership',
                    value: selectedSignal
                      ? `${selectedSignal.routeOwnershipScore}/100`
                      : (corridorPlan?.routeMoat ?? 'Growing route data'),
                    sub: selectedSignal
                      ? selectedSignal.productionSources.slice(0, 2).join(' | ')
                      : `${demandStats.active} saved alerts`,
                    tone: DS.cyan,
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      background: DS.card2,
                      borderRadius: r(14),
                      padding: '14px 15px',
                      border: `1px solid ${DS.border}`,
                    }}
                  >
                    <div
                      style={{
                        color: DS.muted,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        color: item.tone,
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {item.value}
                    </div>
                    <div
                      style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 6, lineHeight: 1.55 }}
                    >
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="sp-results-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>
                {searched
                  ? `${from} to ${to} | ${results.length} route match${results.length !== 1 ? 'es' : ''}`
                  : `Popular routes | showing ${results.length} departures`}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  {selectedSignal ? (
                    <div style={{ color: DS.muted, fontSize: '0.7rem' }}>
                      Live lane price {selectedSignal.priceQuote.finalPriceJod} JOD | Next wave{' '}
                      {selectedSignal.nextWaveWindow}
                    </div>
                  ) : null}
                  <div style={{ color: DS.sub, fontSize: '0.65rem' }}>
                    {ar ? 'آخر تحديث: ' : 'Last updated: '}
                    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => setSearchCount(prev => prev + 1)}
                  disabled={loading}
                  style={{
                    background: DS.card2,
                    border: `1px solid ${DS.border}`,
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    color: DS.muted,
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="sp-sort-bar" style={{ display: 'flex', gap: 6 }}>
                {(
                  [
                    ['price', t.cheapest],
                    ['time', t.earliest],
                    ['rating', t.topRated],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '99px',
                      border: `1px solid ${sort === key ? DS.cyan : DS.border}`,
                      background: sort === key ? `${DS.cyan}15` : DS.card2,
                      color: sort === key ? DS.cyan : DS.sub,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              <AnimatePresence>
                {results.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      background: DS.card,
                      borderRadius: r(20),
                      padding: '60px 24px',
                      textAlign: 'center',
                      border: `1px solid ${DS.border}`,
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>{copy.noResultsIcon}</div>
                    <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 8 }}>
                      {t.noRidesFound}
                    </h3>
                    <p style={{ color: DS.sub, fontSize: '0.875rem' }}>
                      No ride found yet. Save this route and get alerted when one opens
                      {selectedSignal ? ` around ${selectedSignal.nextWaveWindow}` : ''}.
                    </p>
                    <div
                      className="sp-empty-actions"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                        marginTop: 18,
                      }}
                    >
                      <button
                        onClick={() => {
                          setDate('');
                          setSearchError(null);
                          setSearched(true);
                        }}
                        style={{
                          height: 44,
                          borderRadius: r(12),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {t.clearDateFilter}
                      </button>
                      <button
                        onClick={() =>
                          nav(
                            `/app/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
                          )
                        }
                        style={{
                          height: 44,
                          borderRadius: r(12),
                          border: 'none',
                          background: DS.gradG,
                          color: '#fff',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {t.openBusFallback}
                      </button>
                    </div>
                    <button
                      onClick={handleDemandCapture}
                      style={{
                        marginTop: 10,
                        width: '100%',
                        height: 44,
                        borderRadius: r(12),
                        border: `1px solid ${DS.cyan}35`,
                        background: `${DS.cyan}12`,
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {copy.notifyMe}
                    </button>
                    {(waitlistMessage || demandStats.active > 0) && (
                      <div
                        style={{
                          marginTop: 12,
                          color: DS.sub,
                          fontSize: '0.78rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {waitlistMessage ??
                          `${demandStats.active} active alert${demandStats.active === 1 ? '' : 's'}.`}
                      </div>
                    )}
                    {nearbyCorridors.length > 0 && (
                      <div style={{ marginTop: 20, textAlign: 'left' }}>
                        <div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>
                          {t.nearbyCorridors}
                        </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          {nearbyCorridors.map(ride => (
                            <button
                              key={ride.id}
                              onClick={() => handleOpenRide(ride)}
                              style={{
                                textAlign: 'left',
                                borderRadius: r(14),
                                border: `1px solid ${DS.border}`,
                                background: DS.card2,
                                padding: '12px 14px',
                                cursor: 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div>
                                  <div
                                    style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}
                                  >
                                    {ride.from} to {ride.to}
                                  </div>
                                  <div
                                    style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}
                                  >
                                    {ride.time} | {ride.driver.name}
                                  </div>
                                </div>
                                <span
                                  style={{ ...pill(ride.seatsAvailable > 0 ? DS.cyan : DS.gold) }}
                                >
                                  {ride.seatsAvailable > 0
                                    ? `${getMovementPriceQuote({ basePriceJod: ride.pricePerSeat, corridorId: resolveSignalForRoute(ride.from, ride.to)?.id, forecastDemandScore: resolveSignalForRoute(ride.from, ride.to)?.forecastDemandScore, membership: routeIntelligence.membership }).finalPriceJod} JOD`
                                    : 'Sold out'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  results.map((ride, index) => (
                    <FindRideCard
                      key={ride.id}
                      ride={ride}
                      idx={index}
                      bookingStatus={getRideBookingStatus(ride.id)}
                      signal={resolveSignalForRoute(ride.from, ride.to)}
                      onOpen={() => handleOpenRide(ride)}
                      onOpenBooking={openMyTrips}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            <div
              className="sp-2col"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.85fr',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  background: DS.card,
                  borderRadius: r(18),
                  padding: '18px 18px 16px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: r(12),
                      background: `${DS.cyan}12`,
                      border: `1px solid ${DS.cyan}28`,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Brain size={18} color={DS.cyan} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800 }}>Why it fits</div>
                    <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                      Quick route signals.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(selectedSignal
                    ? [
                        selectedSignal.recommendedReason,
                        `Next wave: ${selectedSignal.nextWaveWindow} from ${selectedSignal.recommendedPickupPoint}.`,
                        `Live feed: ${selectedSignal.productionSources.slice(0, 3).join(' | ')}.`,
                      ]
                    : (corridorPlan?.intelligenceSignals ?? [
                        'Demand builds before departure.',
                        'Pickup points stay simple.',
                        'Shared rides stay cheaper.',
                      ])
                  ).map(line => (
                    <div
                      key={line}
                      style={{
                        borderRadius: r(14),
                        border: `1px solid ${DS.border}`,
                        background: DS.card2,
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '0.82rem',
                        lineHeight: 1.65,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(corridorPlan?.movementLayers ?? ['people', 'goods', 'services']).map(layer => (
                    <span key={layer} style={pill(DS.green)}>
                      <Sparkles size={10} /> {layer}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <div
                  style={{
                    background: DS.card,
                    borderRadius: r(18),
                    padding: '18px 18px 16px',
                    border: `1px solid ${DS.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: r(12),
                        background: `${DS.gold}12`,
                        border: `1px solid ${DS.gold}28`,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <TrendingUp size={18} color={DS.gold} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>Popular now</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                        Routes with strong live activity.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {featuredSignals.map(corridor => (
                      <button
                        key={corridor.id}
                        onClick={() => {
                          setFrom(corridor.from);
                          setTo(corridor.to);
                          setSearched(true);
                        }}
                        style={{
                          textAlign: 'left',
                          borderRadius: r(14),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          padding: '12px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                              {corridor.label}
                            </div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              Demand {corridor.forecastDemandScore} |{' '}
                              {corridor.priceQuote.finalPriceJod} JOD | Owns{' '}
                              {corridor.routeOwnershipScore}
                            </div>
                          </div>
                          <span style={pill(DS.cyan)}>{corridor.pricePressure}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: DS.card,
                    borderRadius: r(18),
                    padding: '18px 18px 16px',
                    border: `1px solid ${DS.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: r(12),
                        background: `${DS.green}12`,
                        border: `1px solid ${DS.green}28`,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Network size={18} color={DS.green} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>Package-ready rides</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                        Some rides also carry packages.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {marketplaceNodes.map(node => (
                      <div
                        key={node.id}
                        style={{
                          borderRadius: r(14),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
                          {node.title}
                        </div>
                        <div
                          style={{
                            color: DS.muted,
                            fontSize: '0.74rem',
                            marginTop: 4,
                            lineHeight: 1.55,
                          }}
                        >
                          {node.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="sp-2col"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.85fr',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  background: DS.card,
                  borderRadius: r(18),
                  padding: '18px 18px 16px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>
                  Suggested reminders
                </div>
                {recurringSuggestions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {recurringSuggestions.map(suggestion => {
                      const alreadySaved = Boolean(
                        getRouteReminderForCorridor(suggestion.corridorId),
                      );
                      return (
                        <div
                          key={suggestion.corridorId}
                          style={{
                            borderRadius: r(14),
                            border: `1px solid ${DS.border}`,
                            background: DS.card2,
                            padding: '12px 14px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div>
                              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                                {suggestion.label}
                              </div>
                              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                                {suggestion.confidenceScore}/100 |{' '}
                                {suggestion.priceQuote.finalPriceJod} JOD |{' '}
                                {suggestion.weeklyFrequency} signals
                              </div>
                            </div>
                            <span style={pill(DS.green)}>{suggestion.recommendedFrequency}</span>
                          </div>
                          <div
                            style={{
                              color: DS.sub,
                              fontSize: '0.76rem',
                              lineHeight: 1.55,
                              marginTop: 8,
                            }}
                          >
                            {suggestion.reason}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                            <button
                              onClick={() => {
                                setFrom(suggestion.from);
                                setTo(suggestion.to);
                                setSearched(true);
                              }}
                              style={{
                                height: 38,
                                padding: '0 14px',
                                borderRadius: '999px',
                                border: `1px solid ${DS.border}`,
                                background: DS.card,
                                color: '#fff',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Search route
                            </button>
                            <button
                              onClick={() => handleSaveReminder(suggestion.corridorId)}
                              style={{
                                height: 38,
                                padding: '0 14px',
                                borderRadius: '999px',
                                border: 'none',
                                background: alreadySaved ? DS.gradG : DS.gradC,
                                color: '#fff',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              {alreadySaved ? 'Reminder active' : 'Save reminder'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: DS.muted, fontSize: '0.8rem' }}>
                    Book more rides to unlock reminders.
                  </div>
                )}
              </div>

              <div
                style={{
                  background: DS.card,
                  borderRadius: r(18),
                  padding: '18px 18px 16px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>
                  Saved reminders
                </div>
                {savedReminders.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {savedReminders.slice(0, 4).map(reminder => (
                      <div
                        key={reminder.id}
                        style={{
                          borderRadius: r(12),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          padding: '11px 12px',
                        }}
                      >
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                          {reminder.label}
                        </div>
                        <div style={{ color: DS.muted, fontSize: '0.73rem', marginTop: 4 }}>
                          {formatRouteReminderSchedule(reminder)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: DS.muted, fontSize: '0.8rem', lineHeight: 1.55 }}>
                    Save a route to see reminders here.
                  </div>
                )}
              </div>
            </div>

            <div
              className="sp-2col"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.85fr',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  background: DS.card,
                  borderRadius: r(18),
                  padding: '18px 18px 16px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>
                  Best ride matches
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {recommendedRides.map(ride => {
                    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
                    const ridePriceQuote = getMovementPriceQuote({
                      basePriceJod: ride.pricePerSeat,
                      corridorId: rideSignal?.id,
                      forecastDemandScore: rideSignal?.forecastDemandScore,
                      membership: routeIntelligence.membership,
                    });

                    return (
                      <button
                        key={ride.id}
                        onClick={() => handleOpenRide(ride)}
                        style={{
                          textAlign: 'left',
                          borderRadius: r(14),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          padding: '12px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                              {ride.from} to {ride.to}
                            </div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              {ride.time} | {ride.driver.name} |{' '}
                              {rideSignal
                                ? `${rideSignal.routeOwnershipScore}/100 ownership`
                                : ride.car}
                            </div>
                          </div>
                          <span
                            style={{ ...pill(bookedRideIds.has(ride.id) ? DS.green : DS.cyan) }}
                          >
                            {bookedRideIds.has(ride.id)
                              ? 'Booked'
                              : `${ridePriceQuote.finalPriceJod} JOD`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { title: t.recentSearches, items: recentSearches, empty: t.searchHelp },
                  {
                    title: t.bookedTrips,
                    items: bookedRides.map(
                      ride => `${ride.from} to ${ride.to} | ${ride.time} | ${ride.driver.name}`,
                    ),
                    empty: t.noTripsYet,
                  },
                ].map(card => (
                  <div
                    key={card.title}
                    style={{
                      background: DS.card,
                      borderRadius: r(18),
                      padding: '18px 18px 16px',
                      border: `1px solid ${DS.border}`,
                    }}
                  >
                    <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>
                      {card.title}
                    </div>
                    {card.items.length > 0 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {card.items.map(item => (
                          <div
                            key={item}
                            style={{
                              borderRadius: r(12),
                              border: `1px solid ${DS.border}`,
                              background: DS.card2,
                              padding: '11px 12px',
                              color: '#fff',
                              fontSize: '0.78rem',
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: DS.muted, fontSize: '0.8rem' }}>{card.empty}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'package' && (
          <FindRidePackagePanel ar={ar} copy={copy} t={t} pkg={pkg} setPkg={setPkg} />
        )}

        {selected && (
          <FindRideTripDetailModal
            ride={selected}
            bookingStatus={
              selectedBooking &&
              (selectedBooking.status === 'pending_driver' ||
                selectedBooking.status === 'confirmed')
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
