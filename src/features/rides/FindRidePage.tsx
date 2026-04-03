import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { createDemandAlert, getDemandStats, hydrateDemandAlerts } from '../../services/demandCapture';
import { trackGrowthEvent } from '../../services/growthEngine';
import { getConnectedRides } from '../../services/journeyLogistics';
import { getMovementPriceQuote } from '../../services/movementPricing';
import { recordMovementActivity } from '../../services/movementMembership';
import {
  createReminderFromSuggestion,
  formatRouteReminderSchedule,
  getRecurringRouteSuggestions,
  getRouteReminders,
  syncRouteReminders,
} from '../../services/movementRetention';
import { notificationsAPI } from '../../services/notifications.js';
import { getLiveCorridorSignal, useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { createRideBooking, hydrateRideBookings } from '../../services/rideLifecycle';
import {
  getCorridorOpportunity,
  getWaselCategoryPosition,
} from '../../config/wasel-movement-network';
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

  const category = useMemo(() => getWaselCategoryPosition(), []);
  const corridorPlan = useMemo(() => getCorridorOpportunity(from, to), [from, to]);
  const routeIntelligence = useLiveRouteIntelligence({ from, to });
  const selectedSignal = routeIntelligence.selectedSignal;
  const featuredSignals = routeIntelligence.featuredSignals.slice(0, 4);
  const recurringSuggestions = useMemo(
    () => getRecurringRouteSuggestions(3),
    [routeIntelligence.updatedAt],
  );
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
  const connectedRides = getConnectedRides().map(buildRideFromPostedRide);
  const allAvailableRides = [...connectedRides, ...ALL_RIDES];
  const corridorRides = allAvailableRides.filter((ride) => ride.from === from && ride.to === to);
  const nearbyCorridors = allAvailableRides
    .filter(
      (ride) =>
        ride.id &&
        !(ride.from === from && ride.to === to) &&
        (ride.from === from || ride.to === to || ride.to === from || ride.from === to),
    )
    .slice(0, 3);

  const results: Ride[] = searched
    ? allAvailableRides
        .filter(
          (ride) =>
            (!from || ride.from.toLowerCase().includes(from.toLowerCase()) || ride.fromAr === from) &&
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
    : allAvailableRides.slice(0, 4);

  const routeReadinessLabel = corridorRides.length >= 2 ? t.instantMatch : corridorRides.length === 1 ? t.bookingReady : t.searchHelp;
  const bookedRides = allAvailableRides.filter((ride) => booked.has(ride.id)).slice(0, 3);
  const selectedPriceQuote = selectedSignal?.priceQuote
    ?? (corridorPlan
      ? getMovementPriceQuote({
          basePriceJod: corridorPlan.sharedPriceJod,
          corridorId: corridorPlan.id,
          forecastDemandScore: corridorPlan.predictedDemandScore,
          membership: routeIntelligence.membership,
        })
      : null);
  const savedReminderIds = useMemo(
    () => new Set(savedReminders.map((reminder) => reminder.corridorId)),
    [savedReminders],
  );
  const bookedRideSummaries = useMemo(
    () => bookedRides.map((ride) => `${ride.from} to ${ride.to} | ${ride.time} | ${ride.driver.name}`),
    [bookedRides],
  );

  const resolveSignalForRoute = (routeFrom: string, routeTo: string) =>
    signalLookup.get(`${routeFrom}::${routeTo}`) ?? getLiveCorridorSignal(routeFrom, routeTo, routeIntelligence.membership);
  const nearbyCorridorCards = useMemo(
    () => nearbyCorridors.map((ride) => {
      const signal = resolveSignalForRoute(ride.from, ride.to);
      const priceLabel = ride.seatsAvailable > 0
        ? `${getMovementPriceQuote({
            basePriceJod: ride.pricePerSeat,
            corridorId: signal?.id,
            forecastDemandScore: signal?.forecastDemandScore,
            membership: routeIntelligence.membership,
          }).finalPriceJod} JOD`
        : 'Sold out';
      return { ride, priceLabel };
    }),
    [nearbyCorridors, routeIntelligence.membership, routeIntelligence.updatedAt],
  );

  useEffect(() => {
    if (!user?.id) return;
    void hydrateRideBookings(user.id, getConnectedRides());
    void hydrateDemandAlerts(user.id);
  }, [user?.id]);

  useEffect(() => {
    setSavedReminders(getRouteReminders());
  }, [routeIntelligence.updatedAt]);

  useEffect(() => {
    void syncRouteReminders(user ?? undefined).then((delivered) => {
      if (delivered.length > 0) {
        setSavedReminders(getRouteReminders());
      }
    });
  }, [routeIntelligence.updatedAt, user?.email, user?.phone]);

  useEffect(() => {
    writeStoredStringList(RIDE_BOOKINGS_KEY, Array.from(booked));
  }, [booked]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextFrom = CITIES.includes(params.get('from') ?? '') ? params.get('from')! : 'Amman';
    const nextTo = CITIES.includes(params.get('to') ?? '') ? params.get('to')! : 'Aqaba';
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
    setLoading(true);

    setTimeout(() => {
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

    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
    const ridePriceQuote = getMovementPriceQuote({
      basePriceJod: ride.pricePerSeat,
      corridorId: rideSignal?.id,
      forecastDemandScore: rideSignal?.forecastDemandScore,
      membership: routeIntelligence.membership,
    });

    const booking = createRideBooking({
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

    const reminder = createReminderFromSuggestion(suggestion);
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
          emoji="Route"
          title="Find a Shared Route"
          titleAr={copy.tabRide}
          sub="Search live corridors, compare departures, and book the clearest route."
          action={{ label: 'Offer route', onClick: () => nav('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title="Search one corridor and get one clear booking decision."
          detail={`${category.promise} Wasel reads route pressure, shared pricing, and pickup timing so the rider can decide faster with less guesswork.`}
          tone={DS.cyan}
        />

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
