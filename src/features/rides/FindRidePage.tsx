import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { getCorridorMovementQuote, useCorridorTruth } from '../../services/corridorTruth';
import { createDemandAlert, getDemandStats, hydrateDemandAlerts } from '../../services/demandCapture';
import { trackGrowthEvent } from '../../services/growthEngine';
import { getConnectedRides } from '../../services/journeyLogistics';
import { recordMovementActivity } from '../../services/movementMembership';
import {
  createReminderFromSuggestion,
  formatRouteReminderSchedule,
  getRecurringRouteSuggestions,
  getRouteReminders,
  hydrateRouteReminders,
  syncRouteReminders,
} from '../../services/movementRetention';
import { notificationsAPI } from '../../services/notifications.js';
import { createRideBooking, hydrateRideBookings } from '../../services/rideLifecycle';
import { getWaselCategoryPosition } from '../../config/wasel-movement-network';
import {
  ALL_RIDES,
  buildRideFromPostedRide,
  CITIES,
  RIDE_BOOKINGS_KEY,
  RIDE_SEARCHES_KEY,
  type Ride,
} from '../../pages/waselCoreRideData';
import {
  createFindRideCopy,
  parseFindRideParams,
} from '../../pages/waselCorePageHelpers';
import { readStoredStringList, writeStoredStringList } from '../../pages/waselCoreStorage';
import {
  ClarityBand,
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  r,
  resolveCityCoord,
  SectionHead,
} from '../../pages/waselServiceShared';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { FindRidePackagePanel } from './components/FindRidePackagePanel';
import { FindRideRideTab } from './components/FindRideRideTab';
import { FindRideTripDetailModal } from './components/FindRideTripDetailModal';
import { getFindRideStaticCopy } from './findRideContent';
import {
  routeEndpointsAreDistinct,
  routeMatchesLocationPair,
  routeTouchesLocation,
} from '../../utils/jordanLocations';

export function FindRidePage() {
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const { initialFrom, initialTo, initialDate, initialSearched } = parseFindRideParams(location.search);
  const t = createFindRideCopy(ar);
  const copy = getFindRideStaticCopy(ar);

  const [tab, setTab] = useState<'ride' | 'package'>('ride');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [searched, setSearched] = useState(initialSearched);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<'price' | 'time' | 'rating'>('rating');
  const [selected, setSelected] = useState<Ride | null>(null);
  const [booked, setBooked] = useState<Set<string>>(() => new Set(readStoredStringList(RIDE_BOOKINGS_KEY)));
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readStoredStringList(RIDE_SEARCHES_KEY));
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);
  const [savedReminders, setSavedReminders] = useState(() => getRouteReminders());
  const [pkg, setPkg] = useState({ from: 'Amman', to: 'Aqaba', weight: '<1 kg', note: '', sent: false });
  const searchTimerRef = useRef<number | null>(null);

  const category = useMemo(() => getWaselCategoryPosition(), []);
  const corridorTruth = useCorridorTruth({ from, to, featuredLimit: 4 });
  const { allSignals, corridorPlan, featuredSignals, membership, selectedPriceQuote, selectedSignal } = corridorTruth;
  const recurringSuggestions = useMemo(
    () => getRecurringRouteSuggestions(3),
    [],
  );
  const signalLookup = useMemo(() => {
    const lookup = new Map<string, (typeof allSignals)[number]>();
    for (const signal of allSignals) {
      lookup.set(`${signal.from}::${signal.to}`, signal);
      lookup.set(`${signal.to}::${signal.from}`, signal);
    }
    return lookup;
  }, [allSignals]);
  const demandStats = getDemandStats();

  const searchFromCoord = resolveCityCoord(from);
  const searchToCoord = resolveCityCoord(to);
  const connectedRides = useMemo(
    () => getConnectedRides().map(buildRideFromPostedRide),
    [],
  );
  const allAvailableRides = useMemo(
    () => [...connectedRides, ...ALL_RIDES],
    [connectedRides],
  );
  const corridorRides = useMemo(
    () => allAvailableRides.filter((ride) => routeMatchesLocationPair(ride.from, ride.to, from, to, { allowReverse: false })),
    [allAvailableRides, from, to],
  );
  const nearbyCorridors = useMemo(
    () =>
      allAvailableRides
        .filter(
          (ride) =>
            ride.id &&
            !routeMatchesLocationPair(ride.from, ride.to, from, to, { allowReverse: false }) &&
            (routeTouchesLocation(ride.from, ride.to, from) || routeTouchesLocation(ride.from, ride.to, to)),
        )
        .slice(0, 3),
    [allAvailableRides, from, to],
  );

  const results: Ride[] = useMemo(
    () =>
      searched
        ? allAvailableRides
            .filter(
              (ride) =>
                (!from || routeMatchesLocationPair(ride.from, ride.to, from, ride.to, { allowReverse: false })) &&
                (!to || routeMatchesLocationPair(ride.from, ride.to, ride.from, to, { allowReverse: false })) &&
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

  const routeReadinessLabel = corridorRides.length >= 2 ? t.instantMatch : corridorRides.length === 1 ? t.bookingReady : t.searchHelp;
  const bookedRides = useMemo(
    () => allAvailableRides.filter((ride) => booked.has(ride.id)).slice(0, 3),
    [allAvailableRides, booked],
  );
  const hasSelectedPriceQuote = typeof selectedPriceQuote?.finalPriceJod === 'number';
  const savedReminderIds = useMemo(
    () => new Set(savedReminders.map((reminder) => reminder.corridorId)),
    [savedReminders],
  );
  const bookedRideSummaries = useMemo(
    () => bookedRides.map((ride) => `${ride.from} to ${ride.to} | ${ride.time} | ${ride.driver.name}`),
    [bookedRides],
  );

  const resolveSignalForRoute = useCallback(
    (routeFrom: string, routeTo: string) =>
      signalLookup.get(`${routeFrom}::${routeTo}`) ??
      getCorridorMovementQuote({ from: routeFrom, to: routeTo, basePriceJod: 0, membership }).signal,
    [membership, signalLookup],
  );
  const nearbyCorridorCards = useMemo(
    () => nearbyCorridors.map((ride) => {
      const routeQuote = getCorridorMovementQuote({
        from: ride.from,
        to: ride.to,
        basePriceJod: ride.pricePerSeat,
        membership,
        signal: resolveSignalForRoute(ride.from, ride.to),
      });
      const priceLabel = ride.seatsAvailable > 0
        ? `${routeQuote.priceQuote.finalPriceJod} JOD`
        : 'Sold out';
      return { ride, priceLabel };
    }),
    [membership, nearbyCorridors, resolveSignalForRoute],
  );

  useEffect(() => {
    if (!user?.id) return;
    void hydrateRideBookings(user.id, getConnectedRides());
    void hydrateDemandAlerts(user.id);
  }, [user?.id]);

  useEffect(() => {
    setSavedReminders(getRouteReminders());
  }, [selectedSignal?.freshestSignalAt]);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateRouteReminders(user.id).then((reminders) => {
      setSavedReminders(reminders);
    });
  }, [selectedSignal?.freshestSignalAt, user?.id]);

  useEffect(() => {
    void syncRouteReminders(user ?? undefined).then((delivered) => {
      if (delivered.length > 0) {
        setSavedReminders(getRouteReminders());
      }
    });
  }, [selectedSignal?.freshestSignalAt, user]);

  useEffect(() => {
    writeStoredStringList(RIDE_BOOKINGS_KEY, Array.from(booked));
  }, [booked]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromParam = params.get('from');
    const toParam = params.get('to');
    const nextFrom = fromParam && CITIES.includes(fromParam) ? fromParam : 'Amman';
    const nextTo = toParam && CITIES.includes(toParam) ? toParam : 'Aqaba';
    const nextDate = params.get('date') ?? '';
    const nextSearched = params.get('search') === '1';
    setFrom(nextFrom);
    setTo(nextTo);
    setDate(nextDate);
    setSearched(nextSearched);
  }, [location.search]);

  useEffect(() => () => {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }
  }, []);

  const handleSearch = () => {
    if (!routeEndpointsAreDistinct(from, to)) {
      setSearchError(t.chooseDifferentCities);
      setSearched(false);
      return;
    }

    setSearchError(null);
    setBookingMessage(null);
    setLoading(true);

    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setRecentSearches((previous) => {
        const label = `${from} to ${to}${date ? ` on ${date}` : ''}`;
        return [label, ...previous.filter((item) => item !== label)].slice(0, 4);
      });
      void trackGrowthEvent({
        userId: user?.id,
        eventName: 'ride_search_executed',
        funnelStage: 'searched',
        serviceType: 'ride',
        from,
        to,
        metadata: {
          date: date || null,
          corridorId: corridorPlan?.id ?? null,
          demandScore: selectedSignal?.forecastDemandScore ?? corridorPlan?.predictedDemandScore ?? null,
          priceQuote: selectedPriceQuote,
          pricePressure: selectedSignal?.pricePressure ?? null,
        },
      });
      searchTimerRef.current = null;
    }, 700);
  };

  const handleOpenRide = (ride: Ride) => {
    const routeQuote = getCorridorMovementQuote({
      from: ride.from,
      to: ride.to,
      basePriceJod: ride.pricePerSeat,
      membership,
      signal: resolveSignalForRoute(ride.from, ride.to),
    });
    const rideSignal = routeQuote.signal;
    const priceQuote = routeQuote.priceQuote;
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
        corridorId: rideSignal?.id ?? null,
        demandScore: rideSignal?.forecastDemandScore ?? null,
        pricePressure: rideSignal?.pricePressure ?? null,
        priceQuote,
      },
    });
  };

  const handleBook = (ride: Ride) => {
    if (!user) {
      nav('/app/auth');
      return;
    }
    if (ride.seatsAvailable <= 0) {
      setBookingMessage(`That departure is already full. ${t.openBusFallback} and try the next corridor wave.`);
      setSelected(null);
      return;
    }

    const routeQuote = getCorridorMovementQuote({
      from: ride.from,
      to: ride.to,
      basePriceJod: ride.pricePerSeat,
      membership,
      signal: resolveSignalForRoute(ride.from, ride.to),
    });
    const ridePriceQuote = routeQuote.priceQuote;

    const booking = createRideBooking({
      rideId: ride.id,
      ownerId: ride.ownerId,
      driverPhone: ride.driver.phone,
      driverEmail: ride.driver.email,
      passengerId: user.id,
      from: ride.from,
      to: ride.to,
      date: ride.date,
      time: ride.time,
      driverName: ride.driver.name,
      passengerName: user.name,
      passengerPhone: user.phone,
      passengerEmail: user.email,
      seatsRequested: 1,
      pricePerSeatJod: ridePriceQuote.finalPriceJod,
      routeMode: ride.routeMode === 'live_post' ? 'live_post' : 'network_inventory',
    });

    setBooked((previous) => new Set(previous).add(ride.id));
    setBookingMessage(
      booking.status === 'pending_driver'
        ? `${ride.from} to ${ride.to} was sent to ${ride.driver.name} for approval at ${ridePriceQuote.finalPriceJod} JOD. We will update you as soon as the captain responds.`
        : `${ride.from} to ${ride.to} with ${ride.driver.name} is reserved at ${ridePriceQuote.finalPriceJod} JOD. Ticket ${booking.ticketCode} is now saved in your trips.`,
    );

    notificationsAPI.createNotification({
      title: booking.status === 'pending_driver' ? 'Route request sent' : t.bookingStarted,
      message:
        booking.status === 'pending_driver'
          ? `${ride.from} to ${ride.to} is waiting for driver approval at ${ridePriceQuote.finalPriceJod} JOD.`
          : `${ride.from} to ${ride.to} at ${ride.time} is now in your trips at ${ridePriceQuote.finalPriceJod} JOD with boarding reminders.`,
      type: 'booking',
      priority: 'high',
      action_url: '/app/my-trips?tab=rides',
      channels: ['whatsapp', 'sms', 'email'],
      contact: {
        phone: ride.driver.phone || null,
        email: ride.driver.email ?? null,
      },
    }).catch(() => {});

    if (permission === 'default') {
      requestPermission().catch(() => {});
    }

    notifyTripConfirmed(ride.driver.name, `${ride.from} to ${ride.to}`);
    void recordMovementActivity('ride_booked', corridorPlan?.id ?? null);
    setSelected(null);
  };

  const handleDemandCapture = () => {
    const alert = createDemandAlert({
      from,
      to,
      date: date || new Date().toISOString().slice(0, 10),
      service: 'ride',
      userId: user?.id,
    });

    setWaitlistMessage(`Demand alert saved for ${alert.from} to ${alert.to}. Wasel Brain will wake you around ${selectedSignal?.nextWaveWindow ?? 'the next corridor wave'}.`);
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
    const suggestion = recurringSuggestions.find((item) => item.corridorId === corridorId);
    if (!suggestion) return;

    const reminder = createReminderFromSuggestion(suggestion, user?.id);
    setSavedReminders(getRouteReminders());
    setRetentionMessage(`Reminder saved for ${reminder.label}. ${formatRouteReminderSchedule(reminder)}.`);
    void trackGrowthEvent({
      userId: user?.id,
      eventName: 'route_reminder_saved',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: reminder.from,
      to: reminder.to,
    });
  };

  const handleFocusCorridor = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setSearched(true);
  };

  const handleClearDateFilter = () => {
    setDate('');
    setSearchError(null);
    setSearched(true);
  };

  const handleOpenBusFallback = () => {
    nav(`/app/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="🛣️"
          title="Find a Ride"
          titleAr={copy.tabRide}
          sub="Choose cities, compare routes, and book fast."
          action={{ label: 'Offer route', onClick: () => nav('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title="Search, compare, and book fast."
          detail={`${category.promise} Price, timing, and route readiness stay visible.`}
          tone={DS.cyan}
        />

        <ClarityBand
          title="Pick a route and book."
          detail="Choose the corridor, compare readiness, then open the ride that fits."
          tone={DS.cyan}
          items={[
            { label: '1. Choose', value: 'Set from, to, and date.' },
            { label: '2. Compare', value: 'Check readiness, price, and reminders.' },
            { label: '3. Commit', value: 'Book when the route and price are clear.' },
          ]}
        />

        {Boolean((globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner) && <div style={{ marginBottom: 18 }}>
          <StakeholderSignalBanner
            dir={ar ? 'rtl' : 'ltr'}
            eyebrow={ar ? 'واصل · تواصل الحجز' : 'Wasel · booking comms'}
            title={
              ar
                ? 'اكتشاف الرحلة أصبح لغة مشتركة بين الراكب والطلب الحي والسائق'
                : 'Ride discovery now reads as a shared language between the rider, live demand, and driver supply'
            }
            detail={
              ar
                ? 'هذه الصفحة تجمع التسعير والضغط على المسار والتنبيهات والتذكيرات في قرار واحد أوضح للحجز.'
                : 'This page now pulls pricing, corridor pressure, alerts, and reminders into one clearer booking decision.'
            }
            stakeholders={[
              { label: ar ? 'نتائج' : 'Matches', value: String(results.length), tone: 'teal' },
              { label: ar ? 'الممرات الحية' : 'Live corridors', value: String(featuredSignals.length), tone: 'blue' },
              { label: ar ? 'الحجوزات' : 'Booked', value: String(booked.size), tone: 'green' },
              { label: ar ? 'تنبيهات الطلب' : 'Demand alerts', value: String(demandStats.active), tone: 'amber' },
            ]}
            statuses={[
              { label: ar ? 'جاهزية المسار' : 'Route readiness', value: routeReadinessLabel, tone: corridorRides.length >= 2 ? 'green' : corridorRides.length === 1 ? 'teal' : 'amber' },
              { label: ar ? 'التسعير' : 'Price signal', value: hasSelectedPriceQuote ? `${selectedPriceQuote.finalPriceJod} JOD` : 'Pending', tone: hasSelectedPriceQuote ? 'blue' : 'slate' },
              { label: ar ? 'التذكيرات المحفوظة' : 'Saved reminders', value: String(savedReminders.length), tone: savedReminders.length > 0 ? 'green' : 'slate' },
            ]}
            lanes={[
              { label: ar ? 'مسار الراكب' : 'Rider lane', detail: ar ? 'البحث والنتائج والحجز أصبحت تظهر في سياق واحد.' : 'Search, results, and booking now stay inside one consistent context.' },
              { label: ar ? 'مسار الطلب' : 'Demand lane', detail: ar ? 'تنبيهات الانتظار والتذكيرات تجعل الممرات الضعيفة قابلة للمتابعة بدل الضياع.' : 'Waitlist alerts and reminders keep weaker corridors trackable instead of invisible.' },
              { label: ar ? 'مسار السائق' : 'Driver lane', detail: ar ? 'الإشارة الحية والتسعير المشترك يوضحان متى تكون الرحلة جاهزة للحجز.' : 'Live signal strength and shared pricing show when a route is ready to book.' },
            ]}
          />
        </div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([
            ['ride', 'Shared route'],
            ['package', copy.tabPackage],
          ] as const).map(([key, label]) => (
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
          <FindRideRideTab
            labels={{
              from: t.from,
              to: t.to,
              date: t.date,
              searching: t.searching,
              cheapest: t.cheapest,
              earliest: t.earliest,
              topRated: t.topRated,
              noRidesFound: t.noRidesFound,
              clearDateFilter: t.clearDateFilter,
              openBusFallback: t.openBusFallback,
              nearbyCorridors: t.nearbyCorridors,
              recentSearches: t.recentSearches,
              bookedTrips: t.bookedTrips,
              noTripsYet: t.noTripsYet,
            }}
            staticCopy={{
              noResultsIcon: copy.noResultsIcon,
              notifyMe: copy.notifyMe,
            }}
            from={from}
            to={to}
            date={date}
            loading={loading}
            searched={searched}
            sort={sort}
            searchError={searchError}
            bookingMessage={bookingMessage}
            retentionMessage={retentionMessage}
            waitlistMessage={waitlistMessage}
            routeReadinessLabel={routeReadinessLabel}
            corridorRidesCount={corridorRides.length}
            demandStatsActive={demandStats.active}
            selectedSignal={selectedSignal}
            selectedPriceQuote={selectedPriceQuote}
            corridorPlan={corridorPlan}
            featuredSignals={featuredSignals}
            results={results}
            bookedRideIds={booked}
            nearbyCorridors={nearbyCorridorCards}
            recurringSuggestions={recurringSuggestions}
            savedReminders={savedReminders}
            savedReminderIds={savedReminderIds}
            recentSearches={recentSearches}
            bookedRideSummaries={bookedRideSummaries}
            searchFromCoord={searchFromCoord}
            searchToCoord={searchToCoord}
            onSetFrom={setFrom}
            onSetTo={setTo}
            onSetDate={setDate}
            onSearch={handleSearch}
            onSetSort={setSort}
            onOpenRide={handleOpenRide}
            onFocusCorridor={handleFocusCorridor}
            onSaveReminder={handleSaveReminder}
            onClearDateFilter={handleClearDateFilter}
            onOpenBusFallback={handleOpenBusFallback}
            onDemandCapture={handleDemandCapture}
            formatRouteReminderSchedule={formatRouteReminderSchedule}
            resolveSignalForRide={(ride) => resolveSignalForRoute(ride.from, ride.to)}
          />
        )}

        {tab === 'package' && (
          <FindRidePackagePanel ar={ar} copy={copy} t={t} pkg={pkg} setPkg={setPkg} />
        )}

        <ServiceFlowPlaybook focusService={tab === 'ride' ? 'find-ride' : 'send-package'} />

        {selected && <FindRideTripDetailModal ride={selected} booked={booked.has(selected.id)} signal={resolveSignalForRoute(selected.from, selected.to)} onClose={() => setSelected(null)} onBook={() => handleBook(selected)} />}
      </PageShell>
    </Protected>
  );
}

export default FindRidePage;
