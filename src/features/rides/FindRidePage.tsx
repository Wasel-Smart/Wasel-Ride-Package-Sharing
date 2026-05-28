import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Network,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
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

        <div style={{ display: 'grid', gap: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              gap: 6,
              padding: 4,
              borderRadius: r(14),
              background: DS.card,
              border: `1px solid ${DS.border}`,
              width: 'fit-content',
            }}
          >
            {([
              ['ride', Search, copy.tabRide],
              ['package', Package, copy.tabPackage],
            ] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 42,
                  padding: '0 16px',
                  borderRadius: r(11),
                  border: `1px solid ${tab === key ? `${DS.cyan}45` : 'transparent'}`,
                  background: tab === key ? 'rgba(0,200,232,0.14)' : 'transparent',
                  color: tab === key ? DS.cyan : DS.sub,
                  fontWeight: 800,
                  fontFamily: DS.F,
                  cursor: 'pointer',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'package' ? (
            <FindRidePackagePanel ar={ar} copy={copy} t={t} pkg={pkg} setPkg={setPkg} />
          ) : (
            <>
              <div
                className="sp-2col"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: DS.card,
                    border: `1px solid ${DS.border}`,
                    borderRadius: r(20),
                    padding: 22,
                    display: 'grid',
                    gap: 16,
                  }}
                >
                  <div
                    className="sp-search-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr minmax(150px, 0.7fr)',
                      gap: 12,
                    }}
                  >
                    {[
                      { label: t.from, value: from, onChange: setFrom },
                      { label: t.to, value: to, onChange: setTo },
                    ].map(field => (
                      <label key={field.label} style={{ display: 'grid', gap: 7 }}>
                        <span style={{ color: DS.muted, fontSize: '0.7rem', fontWeight: 800 }}>
                          {field.label}
                        </span>
                        <select
                          value={field.value}
                          onChange={event => field.onChange(event.target.value)}
                          style={{
                            minHeight: 46,
                            borderRadius: r(12),
                            border: `1px solid ${DS.border}`,
                            background: DS.card2,
                            color: '#fff',
                            padding: '0 12px',
                            fontFamily: DS.F,
                          }}
                        >
                          {CITIES.map(city => (
                            <option key={city} value={city} style={{ background: DS.card }}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <label style={{ display: 'grid', gap: 7 }}>
                      <span style={{ color: DS.muted, fontSize: '0.7rem', fontWeight: 800 }}>
                        {t.date}
                      </span>
                      <input
                        type="date"
                        value={date}
                        onChange={event => setDate(event.target.value)}
                        style={{
                          minHeight: 46,
                          borderRadius: r(12),
                          border: `1px solid ${DS.border}`,
                          background: DS.card2,
                          color: '#fff',
                          padding: '0 12px',
                          fontFamily: DS.F,
                          colorScheme: 'dark',
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
                      {t.dateHelp}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSearch}
                      disabled={loading}
                      style={{
                        height: 44,
                        padding: '0 20px',
                        borderRadius: r(12),
                        border: 'none',
                        background: DS.gradC,
                        color: '#fff',
                        fontWeight: 900,
                        cursor: loading ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {loading ? <RefreshCw size={16} /> : <Search size={16} />}
                      {loading ? t.searching : t.searchRides}
                    </motion.button>
                  </div>

                  {searchError ? (
                    <div style={{ borderRadius: r(12), border: `1px solid ${DS.gold}40`, background: 'rgba(240,168,48,0.10)', color: DS.gold, padding: '12px 14px', fontWeight: 700 }}>
                      {searchError}
                    </div>
                  ) : null}
                </div>

                <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: 16, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={16} color={DS.cyan} />
                    <div style={{ color: '#fff', fontWeight: 900 }}>{t.searchRoute}</div>
                  </div>
                  <MapWrapper
                    mode="static"
                    center={midpoint(searchFromCoord, searchToCoord)}
                    pickupLocation={searchFromCoord}
                    dropoffLocation={searchToCoord}
                    height={230}
                    showMosques={false}
                    showRadars={false}
                  />
                  <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.55 }}>
                    {from} to {to}. {routeReadinessLabel}
                  </div>
                </div>
              </div>

              <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { icon: <Network size={15} />, label: t.routeReady, value: routeReadinessLabel },
                  { icon: <Users size={15} />, label: t.seatsLeft, value: String(results.reduce((sum, ride) => sum + ride.seatsAvailable, 0)) },
                  { icon: <TrendingUp size={15} />, label: t.routeIntensity, value: selectedSignal ? `${selectedSignal.forecastDemandScore}/100` : `${demandStats.totalAlerts} alerts` },
                  { icon: <Calendar size={15} />, label: 'Updated', value: lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                ].map(item => (
                  <div key={item.label} style={{ borderRadius: r(16), border: `1px solid ${DS.border}`, background: DS.card, padding: 15, minHeight: 92 }}>
                    <div style={{ color: DS.cyan, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.92rem' }}>{item.value}</div>
                    <div style={{ color: DS.muted, fontSize: '0.72rem', marginTop: 5 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {bookingSuccess || bookingMessage ? (
                <CoreExperienceBanner
                  tone={bookingSuccess ? DS.green : DS.gold}
                  title={bookingSuccess ? `${bookingSuccess.routeLabel} | ${bookingSuccess.ticketCode ?? 'Saved'}` : bookingMessage ?? ''}
                  detail={bookingSuccess ? `${bookingSuccess.driverName} | ${bookingSuccess.priceJod} JOD | ${bookingSuccess.status === 'pending_driver' ? 'Waiting for driver confirmation' : t.bookingSavedBetter}` : bookingMessage ?? ''}
                />
              ) : null}

              <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 16, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div className="sp-results-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.05rem' }}>
                        {t.showing} {results.length} {results.length === 1 ? t.ride : t.rides}
                      </div>
                      <div style={{ color: DS.muted, fontSize: '0.78rem', marginTop: 4 }}>
                        {searched ? `${from} to ${to}` : t.previewCorridor}
                      </div>
                    </div>
                    <div className="sp-sort-bar" style={{ display: 'flex', gap: 8 }}>
                      {([
                        ['rating', t.topRated],
                        ['price', t.cheapest],
                        ['time', t.earliest],
                      ] as const).map(([key, label]) => (
                        <button key={key} className="sp-sort-btn" onClick={() => setSort(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: r(10), border: `1px solid ${sort === key ? `${DS.cyan}45` : DS.border}`, background: sort === key ? 'rgba(0,200,232,0.12)' : DS.card, color: sort === key ? DS.cyan : DS.sub, fontWeight: 800, cursor: 'pointer' }}>
                          <Filter size={13} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ borderRadius: r(18), border: `1px solid ${DS.border}`, background: DS.card, padding: 42, textAlign: 'center', color: DS.sub }}>
                      <RefreshCw size={28} color={DS.cyan} />
                      <div style={{ marginTop: 12, fontWeight: 800 }}>{t.searching}</div>
                    </div>
                  ) : results.length > 0 ? (
                    results.map((ride, idx) => (
                      <FindRideCard key={ride.id} ride={ride} idx={idx} bookingStatus={getRideBookingStatus(ride.id)} signal={resolveSignalForRoute(ride.from, ride.to)} onOpen={() => handleOpenRide(ride)} onOpenBooking={openMyTrips} />
                    ))
                  ) : (
                    <div style={{ borderRadius: r(18), border: `1px solid ${DS.border}`, background: DS.card, padding: 34, display: 'grid', gap: 14, textAlign: 'center' }}>
                      <div style={{ color: '#fff', fontWeight: 900 }}>{t.noRidesFound}</div>
                      <div style={{ color: DS.sub, fontSize: '0.84rem' }}>{t.tryDifferent}</div>
                      <div className="sp-empty-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 420, margin: '0 auto', width: '100%' }}>
                        <button onClick={handleDemandCapture} style={{ minHeight: 44, borderRadius: r(12), border: `1px solid ${DS.cyan}35`, background: 'rgba(0,200,232,0.12)', color: DS.cyan, fontWeight: 900, cursor: 'pointer' }}>
                          {copy.notifyMe}
                        </button>
                        <button onClick={() => nav('/app/bus')} style={{ minHeight: 44, borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                          {t.openBusFallback}
                        </button>
                      </div>
                      {waitlistMessage ? <div style={{ color: DS.green, fontWeight: 800, fontSize: '0.82rem' }}>{waitlistMessage}</div> : null}
                    </div>
                  )}
                </div>

                <div className="sp-side-column" style={{ display: 'grid', gap: 12, position: 'sticky', top: 16 }}>
                  <div style={{ borderRadius: r(16), border: `1px solid ${DS.border}`, background: DS.card, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 900, marginBottom: 12 }}>
                      <Sparkles size={15} color={DS.gold} />
                      {t.recommendedForYou}
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {recommendedRides.map(ride => (
                        <button key={ride.id} onClick={() => handleOpenRide(ride)} style={{ textAlign: 'left', borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, padding: 12, color: '#fff', cursor: 'pointer' }}>
                          <div style={{ fontWeight: 800 }}>{ride.from} to {ride.to}</div>
                          <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 5 }}>{ride.time} | {ride.pricePerSeat} JOD | {ride.seatsAvailable} seats</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderRadius: r(16), border: `1px solid ${DS.border}`, background: DS.card, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 900, marginBottom: 10 }}>
                      <Shield size={15} color={DS.green} />
                      {t.bookedTrips}
                    </div>
                    {bookedRides.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {bookedRides.map(ride => (
                          <button key={ride.id} onClick={openMyTrips} style={{ border: `1px solid ${DS.green}30`, background: 'rgba(34,197,94,0.10)', color: '#fff', borderRadius: r(12), padding: 10, textAlign: 'left', cursor: 'pointer' }}>
                            <CheckCircle2 size={13} color={DS.green} /> {ride.from} to {ride.to}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.6 }}>{t.noTripsYet}</div>
                    )}
                  </div>

                  {recentSearches.length > 0 ? (
                    <div style={{ borderRadius: r(16), border: `1px solid ${DS.border}`, background: DS.card, padding: 16 }}>
                      <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>{t.recentSearches}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {recentSearches.map(search => (
                          <span key={search} style={pill(DS.cyan)}>{search}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {recurringSuggestions.length > 0 ? (
                    <div style={{ borderRadius: r(16), border: `1px solid ${DS.border}`, background: DS.card, padding: 16 }}>
                      <div style={{ display: 'flex', gap: 8, color: '#fff', fontWeight: 900, marginBottom: 10 }}>
                        <Brain size={15} color={DS.cyan} />
                        Route reminders
                      </div>
                      {recurringSuggestions.map(suggestion => {
                        const saved = Boolean(getRouteReminderForCorridor(suggestion.corridorId)) || savedReminders.some(item => item.corridorId === suggestion.corridorId);
                        return (
                          <button key={suggestion.corridorId} onClick={() => handleSaveReminder(suggestion.corridorId)} disabled={saved} style={{ width: '100%', marginTop: 8, border: `1px solid ${saved ? `${DS.green}35` : DS.border}`, background: saved ? 'rgba(34,197,94,0.10)' : DS.card2, color: saved ? DS.green : DS.sub, borderRadius: r(12), padding: 10, textAlign: 'left', cursor: saved ? 'default' : 'pointer' }}>
                            {suggestion.from} to {suggestion.to}
                          </button>
                        );
                      })}
                      {retentionMessage ? <div style={{ marginTop: 10, color: DS.green, fontSize: '0.76rem', fontWeight: 800 }}>{retentionMessage}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

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
