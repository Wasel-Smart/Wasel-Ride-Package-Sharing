import { useEffect, useMemo, useState } from 'react';
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
import { createDemandAlert, getDemandStats, hydrateDemandAlerts } from '../../services/demandCapture';
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
import { getLiveCorridorSignal, useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { createRideBooking, hydrateRideBookings } from '../../services/rideLifecycle';
import {
  getCorridorOpportunity,
  getMarketplaceNodes,
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
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { FindRideCard } from './components/FindRideCard';
import { FindRidePackagePanel } from './components/FindRidePackagePanel';
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
  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(0, 3), []);
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
  const availableCorridorRides = corridorRides.filter((ride) => ride.seatsAvailable > 0);
  const soldOutCorridorRides = corridorRides.filter((ride) => ride.seatsAvailable <= 0);
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
  const recommendedRides = [...results]
    .sort((left, right) => scoreRideForRecommendation(right) - scoreRideForRecommendation(left))
    .slice(0, 2);
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

  const resolveSignalForRoute = (routeFrom: string, routeTo: string) =>
    signalLookup.get(`${routeFrom}::${routeTo}`) ?? getLiveCorridorSignal(routeFrom, routeTo, routeIntelligence.membership);

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

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Route"
          title="Find a Shared Route"
          titleAr={copy.tabRide}
          sub="Search corridors, unlock cost sharing, and let Wasel Brain propose the best match."
          action={{ label: 'Open route supply', onClick: () => nav('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title="Wasel is now organized around route intelligence, not random ride requests."
          detail={`${category.promise} Search one corridor and the platform responds with shared-price targets, pickup nodes, auto-grouping, and the best available supply.`}
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
          <>
            <div style={{ background: DS.card, borderRadius: r(20), padding: 24, border: `1px solid ${DS.border}`, marginBottom: 24 }}>
              <div className="sp-search-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: 12, marginBottom: 14 }}>
                {[{ label: t.from, value: from, setter: setFrom, icon: DS.green }, { label: t.to, value: to, setter: setTo, icon: DS.cyan }].map((field) => (
                  <div key={field.label}>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: DS.muted, fontWeight: 700, marginBottom: 6 }}>{field.label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DS.card2, borderRadius: r(12), padding: '0 14px', border: `1px solid ${DS.border}`, height: 46 }}>
                      <MapPin size={15} color={field.icon} />
                      <select value={field.value} onChange={(event) => field.setter(event.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', flex: 1, outline: 'none' }}>
                        {CITIES.map((city) => (
                          <option key={city} value={city} style={{ background: DS.card }}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: DS.muted, fontWeight: 700, marginBottom: 6 }}>{t.date}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DS.card2, borderRadius: r(12), padding: '0 14px', border: `1px solid ${DS.border}`, height: 46 }}>
                    <Calendar size={15} color={DS.muted} />
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} min={new Date().toISOString().split('T')[0]} style={{ background: 'transparent', border: 'none', color: '#fff', fontFamily: DS.F, fontSize: '0.85rem', flex: 1, outline: 'none', colorScheme: 'dark' }} />
                  </div>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleSearch} data-testid="find-ride-search" style={{ width: '100%', height: 52, borderRadius: r(14), border: 'none', background: DS.gradC, color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }} /> : <Search size={18} />}
                {loading ? t.searching : 'Let Wasel Brain search this route'}
              </motion.button>

              <div style={{ marginTop: 14, background: DS.card2, borderRadius: r(14), padding: 12, border: `1px solid ${DS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ color: DS.muted, fontSize: '0.72rem', fontWeight: 700, margin: '0 0 4px' }}>Corridor preview</p>
                    <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>
                      {selectedSignal
                        ? `Production data is live on this lane. Wasel sees ${selectedSignal.liveSearches} searches, ${selectedSignal.liveBookings} bookings, and ${selectedSignal.activeDemandAlerts} active alerts.`
                        : 'See the movement corridor before Wasel Brain suggests seats, pickup points, and grouped departures.'}
                    </p>
                  </div>
                  <span style={{ ...pill(DS.green), fontSize: '0.72rem' }}>
                    {selectedSignal ? `${selectedSignal.forecastDemandScore}/100 forecast` : corridorPlan?.density ?? 'steady density'}
                  </span>
                </div>
                <MapWrapper mode="static" center={midpoint(searchFromCoord, searchToCoord)} pickupLocation={searchFromCoord} dropoffLocation={searchToCoord} height={180} showMosques={false} showRadars={false} />
              </div>

              {searchError && <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', background: `${DS.gold}12`, border: `1px solid ${DS.gold}30`, borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}><Shield size={16} color={DS.gold} /><span>{searchError}</span></div>}
              {bookingMessage && <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,200,117,0.10)', border: '1px solid rgba(0,200,117,0.28)', borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}><CheckCircle2 size={16} color={DS.green} /><span>{bookingMessage}</span></div>}
              {retentionMessage && <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', background: `${DS.cyan}12`, border: `1px solid ${DS.cyan}30`, borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}><Sparkles size={16} color={DS.cyan} /><span>{retentionMessage}</span></div>}

              <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
                {[
                  {
                    label: 'Route readiness',
                    value: selectedSignal ? `${selectedSignal.activeSupply} live departures` : routeReadinessLabel,
                    sub: selectedSignal ? `${selectedSignal.liveBookings} bookings and ${selectedSignal.activeDemandAlerts} active alerts` : `${corridorRides.length} live departures`,
                    tone: DS.cyan,
                  },
                  {
                    label: 'Shared price now',
                    value: selectedPriceQuote ? `${selectedPriceQuote.finalPriceJod} JOD` : '--',
                    sub: selectedPriceQuote ? `${selectedPriceQuote.discountJod} JOD saved via ${selectedPriceQuote.explanation}` : 'Cost sharing unlocks the best price',
                    tone: DS.green,
                  },
                  {
                    label: 'Next wave',
                    value: selectedSignal?.nextWaveWindow ?? corridorPlan?.autoGroupWindow ?? 'Grouping begins when demand clusters',
                    sub: selectedSignal?.recommendedPickupPoint ?? corridorPlan?.pickupPoints[0] ?? 'Pickup points appear once a corridor is selected',
                    tone: DS.gold,
                  },
                  {
                    label: 'Route ownership',
                    value: selectedSignal ? `${selectedSignal.routeOwnershipScore}/100` : corridorPlan?.routeMoat ?? 'Route data compounds on every search',
                    sub: selectedSignal ? selectedSignal.productionSources.slice(0, 2).join(' | ') : `Demand alerts: ${demandStats.active}`,
                    tone: DS.cyan,
                  },
                ].map((item) => (
                  <div key={item.label} style={{ background: DS.card2, borderRadius: r(14), padding: '14px 15px', border: `1px solid ${DS.border}` }}>
                    <div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                    <div style={{ color: item.tone, fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.55 }}>{item.value}</div>
                    <div style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 6, lineHeight: 1.55 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 18 }}>
              <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: r(12), background: `${DS.cyan}12`, border: `1px solid ${DS.cyan}28`, display: 'grid', placeItems: 'center' }}>
                    <Brain size={18} color={DS.cyan} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800 }}>Wasel Brain briefing</div>
                    <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                      The system should suggest, not make the rider guess.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(
                    selectedSignal
                      ? [
                          selectedSignal.recommendedReason,
                          `Next wave is ${selectedSignal.nextWaveWindow} from ${selectedSignal.recommendedPickupPoint}.`,
                          `Live feed: ${selectedSignal.productionSources.slice(0, 3).join(' | ')}.`,
                        ]
                      : corridorPlan?.intelligenceSignals ?? [
                          'Predict demand before the next rider opens search.',
                          'Recommend pickup points based on dense corridor behavior.',
                          'Use cost sharing to keep the shared route cheaper than solo movement.',
                        ]
                  ).map((line) => (
                    <div key={line} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', color: '#fff', fontSize: '0.82rem', lineHeight: 1.65 }}>
                      {line}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(corridorPlan?.movementLayers ?? ['people', 'goods', 'services']).map((layer) => (
                    <span key={layer} style={pill(DS.green)}>
                      <Sparkles size={10} /> {layer}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: r(12), background: `${DS.gold}12`, border: `1px solid ${DS.gold}28`, display: 'grid', placeItems: 'center' }}>
                      <TrendingUp size={18} color={DS.gold} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>Priority corridors</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                        Routes the network wants to fill next.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {featuredSignals.map((corridor) => (
                      <button
                        key={corridor.id}
                        onClick={() => {
                          setFrom(corridor.from);
                          setTo(corridor.to);
                          setSearched(true);
                        }}
                        style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{corridor.label}</div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              Demand {corridor.forecastDemandScore} | {corridor.priceQuote.finalPriceJod} JOD | Owns {corridor.routeOwnershipScore}
                            </div>
                          </div>
                          <span style={pill(DS.cyan)}>{corridor.pricePressure}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: r(12), background: `${DS.green}12`, border: `1px solid ${DS.green}28`, display: 'grid', placeItems: 'center' }}>
                      <Network size={18} color={DS.green} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800 }}>Marketplace layers</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                        This route graph serves more than riders.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {marketplaceNodes.map((node) => (
                      <div key={node.id} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>{node.title}</div>
                        <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.55 }}>{node.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 18 }}>
              <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>Auto-suggested recurring routes</div>
                {recurringSuggestions.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {recurringSuggestions.map((suggestion) => {
                      const alreadySaved = Boolean(getRouteReminderForCorridor(suggestion.corridorId));
                      return (
                        <div key={suggestion.corridorId} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{suggestion.label}</div>
                              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                                {suggestion.confidenceScore}/100 confidence | {suggestion.priceQuote.finalPriceJod} JOD now | {suggestion.weeklyFrequency} recent signals
                              </div>
                            </div>
                            <span style={pill(DS.green)}>{suggestion.recommendedFrequency}</span>
                          </div>
                          <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55, marginTop: 8 }}>{suggestion.reason}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                            <button onClick={() => { setFrom(suggestion.from); setTo(suggestion.to); setSearched(true); }} style={{ height: 38, padding: '0 14px', borderRadius: '999px', border: `1px solid ${DS.border}`, background: DS.card, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                              Search lane
                            </button>
                            <button onClick={() => handleSaveReminder(suggestion.corridorId)} style={{ height: 38, padding: '0 14px', borderRadius: '999px', border: 'none', background: alreadySaved ? DS.gradG : DS.gradC, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                              {alreadySaved ? 'Reminder active' : 'Save reminder'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: DS.muted, fontSize: '0.8rem' }}>
                    Search and book a few more lanes and Wasel will start proposing recurring corridors automatically.
                  </div>
                )}
              </div>

              <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>Saved reminders</div>
                {savedReminders.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {savedReminders.slice(0, 4).map((reminder) => (
                      <div key={reminder.id} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, padding: '11px 12px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{reminder.label}</div>
                        <div style={{ color: DS.muted, fontSize: '0.73rem', marginTop: 4 }}>
                          {formatRouteReminderSchedule(reminder)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: DS.muted, fontSize: '0.8rem', lineHeight: 1.55 }}>
                    Save a recurring route and Wasel will turn it into reminder-driven demand before the next commute wave.
                  </div>
                )}
              </div>
            </div>

            <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 18 }}>
              <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>Recommended corridor matches</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {recommendedRides.map((ride) => {
                    const rideSignal = resolveSignalForRoute(ride.from, ride.to);
                    const ridePriceQuote = getMovementPriceQuote({
                      basePriceJod: ride.pricePerSeat,
                      corridorId: rideSignal?.id,
                      forecastDemandScore: rideSignal?.forecastDemandScore,
                      membership: routeIntelligence.membership,
                    });

                    return (
                      <button key={ride.id} onClick={() => handleOpenRide(ride)} style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{ride.from} to {ride.to}</div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              {ride.time} | {ride.driver.name} | {rideSignal ? `${rideSignal.routeOwnershipScore}/100 ownership` : ride.car}
                            </div>
                          </div>
                          <span style={{ ...pill(booked.has(ride.id) ? DS.green : DS.cyan) }}>{booked.has(ride.id) ? 'Booked' : `${ridePriceQuote.finalPriceJod} JOD`}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {[{ title: t.recentSearches, items: recentSearches, empty: t.searchHelp }, { title: t.bookedTrips, items: bookedRides.map((ride) => `${ride.from} to ${ride.to} | ${ride.time} | ${ride.driver.name}`), empty: t.noTripsYet }].map((card) => (
                  <div key={card.title} style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                    <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>{card.title}</div>
                    {card.items.length > 0 ? <div style={{ display: 'grid', gap: 10 }}>{card.items.map((item) => <div key={item} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, padding: '11px 12px', color: '#fff', fontSize: '0.78rem' }}>{item}</div>)}</div> : <div style={{ color: DS.muted, fontSize: '0.8rem' }}>{card.empty}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="sp-results-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>
                {searched
                  ? `${from} to ${to} | ${results.length} route match${results.length !== 1 ? 'es' : ''}`
                  : `Priority corridors | showing ${results.length} departures`}
              </h2>
              {selectedSignal ? (
                <div style={{ color: DS.muted, fontSize: '0.74rem' }}>
                  Live lane price {selectedSignal.priceQuote.finalPriceJod} JOD | Next wave {selectedSignal.nextWaveWindow}
                </div>
              ) : null}
              <div className="sp-sort-bar" style={{ display: 'flex', gap: 6 }}>
                {([['price', t.cheapest], ['time', t.earliest], ['rating', t.topRated]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setSort(key)} style={{ padding: '6px 14px', borderRadius: '99px', border: `1px solid ${sort === key ? DS.cyan : DS.border}`, background: sort === key ? `${DS.cyan}15` : DS.card2, color: sort === key ? DS.cyan : DS.sub, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <AnimatePresence>
                {results.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: DS.card, borderRadius: r(20), padding: '60px 24px', textAlign: 'center', border: `1px solid ${DS.border}` }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>{copy.noResultsIcon}</div>
                    <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 8 }}>{t.noRidesFound}</h3>
                    <p style={{ color: DS.sub, fontSize: '0.875rem' }}>
                      No live corridor match appeared yet. Save the route and let Wasel Brain wake you when density is ready{selectedSignal ? ` around ${selectedSignal.nextWaveWindow}` : ''}.
                    </p>
                    <div className="sp-empty-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                      <button onClick={() => { setDate(''); setSearchError(null); setSearched(true); }} style={{ height: 44, borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.clearDateFilter}</button>
                      <button onClick={() => nav(`/app/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)} style={{ height: 44, borderRadius: r(12), border: 'none', background: DS.gradG, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{t.openBusFallback}</button>
                    </div>
                    <button onClick={handleDemandCapture} style={{ marginTop: 10, width: '100%', height: 44, borderRadius: r(12), border: `1px solid ${DS.cyan}35`, background: `${DS.cyan}12`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{copy.notifyMe}</button>
                    {(waitlistMessage || demandStats.active > 0) && <div style={{ marginTop: 12, color: DS.sub, fontSize: '0.78rem', lineHeight: 1.5 }}>{waitlistMessage ?? `You currently have ${demandStats.active} active demand alert${demandStats.active === 1 ? '' : 's'}.`}</div>}
                    {nearbyCorridors.length > 0 && <div style={{ marginTop: 20, textAlign: 'left' }}><div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>{t.nearbyCorridors}</div><div style={{ display: 'grid', gap: 10 }}>{nearbyCorridors.map((ride) => <button key={ride.id} onClick={() => handleOpenRide(ride)} style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{ride.from} to {ride.to}</div><div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{ride.time} | {ride.driver.name}</div></div><span style={{ ...pill(ride.seatsAvailable > 0 ? DS.cyan : DS.gold) }}>{ride.seatsAvailable > 0 ? `${getMovementPriceQuote({ basePriceJod: ride.pricePerSeat, corridorId: resolveSignalForRoute(ride.from, ride.to)?.id, forecastDemandScore: resolveSignalForRoute(ride.from, ride.to)?.forecastDemandScore, membership: routeIntelligence.membership }).finalPriceJod} JOD` : 'Sold out'}</span></div></button>)}</div></div>}
                  </motion.div>
                ) : results.map((ride, index) => <FindRideCard key={ride.id} ride={ride} idx={index} booked={booked.has(ride.id)} signal={resolveSignalForRoute(ride.from, ride.to)} onOpen={() => handleOpenRide(ride)} />)}
              </AnimatePresence>
            </div>
          </>
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
