import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useRideFilters } from './hooks/useRideFilters';
import {
  Brain,
  Calendar,
  CheckCircle2,
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
  areRouteRemindersEqual,
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
import { walletApi } from '../../services/wallet/walletApi';
import { getCorridorOpportunity, getMarketplaceNodes } from '../../config/wasel-movement-network';
import {
  CITIES,
  RIDE_SEARCHES_KEY,
  type Ride,
} from '../../pages/waselCoreRideData';
import {
  createFindRideCopy,
  scoreRideForRecommendation,
} from '../../pages/waselCorePageHelpers';
import { readStoredStringList, writeStoredStringList } from '../../pages/waselCoreStorage';
import {
  DS,
  midpoint,
  PageShell,
  pill,
  Protected,
  r,
  resolveCityCoord,
  SectionHead,
} from '../../pages/waselServiceShared';
import { WaselButton, WaselInput, WaselSelect } from '../../components/wasel-ui';
import { C } from '../../utils/wasel-ds';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { FindRideCard } from './components/FindRideCard';
import { FindRidePackagePanel } from './components/FindRidePackagePanel';
import { FindRideTripDetailModal } from './components/FindRideTripDetailModal';
import { BookingStatusBanners } from './components/BookingStatusBanners';
import { getFindRideStaticCopy } from './findRideContent';
import { useRideInventory } from './useRideInventory';

type BookingSuccessState = {
  status: 'pending_driver' | 'confirmed';
  routeLabel: string;
  driverName: string;
  priceJod: number;
  ticketCode?: string;
};

type RideSearchForm = {
  search: string;
  from: string;
  to: string;
  date: string;
  searched: boolean;
};

function parseRideSearchForm(search: string): RideSearchForm {
  const params = new URLSearchParams(search);
  const fromParam = params.get('from') ?? '';
  const toParam = params.get('to') ?? '';
  return {
    search,
    from: CITIES.includes(fromParam) ? fromParam : 'Amman',
    to: CITIES.includes(toParam) ? toParam : 'Aqaba',
    date: params.get('date') ?? '',
    searched: params.get('search') === '1',
  };
}

function useRideSearchForm(search: string) {
  const [storedForm, setStoredForm] = useState(() => parseRideSearchForm(search));
  const form = storedForm.search === search ? storedForm : parseRideSearchForm(search);
  const updateForm = useCallback((patch: Partial<RideSearchForm>) => {
    setStoredForm(previous => ({
      ...(previous.search === search ? previous : parseRideSearchForm(search)),
      ...patch,
      search,
    }));
  }, [search]);

  return {
    ...form,
    setFrom: (from: string) => updateForm({ from }),
    setTo: (to: string) => updateForm({ to }),
    setDate: (date: string) => updateForm({ date }),
    setSearched: (searched: boolean) => updateForm({ searched }),
  };
}

export function FindRidePage() {
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const searchForm = useRideSearchForm(location.search);
  const t = createFindRideCopy(ar);
  const copy = getFindRideStaticCopy(ar);

  const [tab, setTab] = useState<'ride' | 'package'>('ride');
  const { from, to, date, searched, setFrom, setTo, setDate, setSearched } = searchForm;
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
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
  const routeIntelligence = useLiveRouteIntelligence({ from, to, userId: user?.id });
  const selectedSignal = routeIntelligence.selectedSignal;
  const featuredSignals = routeIntelligence.featuredSignals.slice(0, 4);
  const recurringSuggestions = useMemo(
    () => getRecurringRouteSuggestions(3, user?.id),
    [user?.id],
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
  }, [routeIntelligence.allSignals]);
  const demandStats = getDemandStats(user?.id);

  const searchFromCoord = resolveCityCoord(from);
  const searchToCoord = resolveCityCoord(to);
  // Live inventory from Supabase, merged with locally posted rides.
  const {
    rides: allAvailableRides,
    loading: inventoryLoading,
    error: inventoryError,
  } = useRideInventory({ from, to, date, searched, refreshKey: inventoryRefreshKey });
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

  const resolveSignalForRoute = useCallback(
    (routeFrom: string, routeTo: string) =>
      signalLookup.get(`${routeFrom}::${routeTo}`) ??
      getLiveCorridorSignal(routeFrom, routeTo, routeIntelligence.membership, user?.id),
    [routeIntelligence.membership, signalLookup, user?.id],
  );
  const openMyTrips = useCallback(() => nav('/app/my-trips?tab=rides'), [nav]);
  const selectedBooking = selected ? (bookingByRideId.get(selected.id) ?? null) : null;
  const getRideBookingStatus = useCallback((rideId: string): 'pending_driver' | 'confirmed' | null => {
    const status = bookingByRideId.get(rideId)?.status;
    return status === 'pending_driver' || status === 'confirmed' ? status : null;
  }, [bookingByRideId]);

  useEffect(() => {
    if (!user?.id) {return;}
    const unsubscribe = subscribeToRideBookingRealtime({
      userId: user.id,
      rides: getConnectedRides(),
      onBookingsChange: setRideBookings,
    });
    void hydrateDemandAlerts(user.id);
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    const refresh = () => {
      const next = getRouteReminders();
      setSavedReminders(prev => (areRouteRemindersEqual(prev, next) ? prev : next));
    };
    refresh();
    void syncRouteReminders(user ?? undefined).then(delivered => {
      if (delivered.length > 0) {refresh();}
    });
  }, [routeIntelligence.updatedAt, user]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  const handleSearch = () => {
    if (from === to) {
      setSearchError(t.chooseDifferentCities);
      setSearched(false);
      return;
    }

    setSearchError(null);
    setBookingMessage(null);
    setBookingSuccess(null);
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
  };

  const handleOpenRide = useCallback((ride: Ride) => {
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
  }, [resolveSignalForRoute, routeIntelligence.membership, user?.id]);

  const showExistingBooking = useCallback((ride: Ride) => {
    const existingBooking = bookingByRideId.get(ride.id);
    if (!existingBooking) { return false; }
    setBookingMessage(
      existingBooking.status === 'pending_driver'
        ? `${ride.from} to ${ride.to} is already waiting for driver confirmation in My Trips.`
        : `${ride.from} to ${ride.to} is already confirmed in My Trips.`,
    );
    openMyTrips();
    return true;
  }, [bookingByRideId, openMyTrips]);

  const verifyBookingEligibility = useCallback((ride: Ride) => {
    if (!user) {
      nav('/app/auth');
      return null;
    }
    if (ride.seatsAvailable <= 0) {
      setBookingMessage(t.rideFullMessage(ride.from, ride.to, t.openBusFallback));
      setSelected(null);
      return null;
    }
    return user;
  }, [nav, t, user]);

  const handleBook = useCallback(async (ride: Ride) => {
    if (bookingInFlightId) {return;}
    if (showExistingBooking(ride)) { return; }
    const bookingUser = verifyBookingEligibility(ride);
    if (!bookingUser) { return; }

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
        passengerId: bookingUser.id,
        from: ride.from,
        to: ride.to,
        date: ride.date,
        time: ride.time,
        driverName: ride.driver.name,
        passengerName: bookingUser.name,
        seatsRequested: 1,
        pricePerSeatJod: finalPrice,
        routeMode: ride.routeMode === 'live_post' ? 'live_post' : 'network_inventory',
      });

      setRideBookings(getRideBookings());
      setSelected(null);
      setBookingSuccess({
        status: booking.status === 'pending_driver' ? 'pending_driver' : 'confirmed',
        routeLabel: t.routeLabel(ride.from, ride.to),
        driverName: ride.driver.name,
        priceJod: finalPrice,
        ticketCode: booking.ticketCode,
      });
      setBookingMessage(
        booking.status === 'pending_driver'
          ? t.bookingRequestSent(ride.from, ride.to)
          : t.seatConfirmed(ride.from, ride.to),
      );

      if (booking.status === 'confirmed') {
        try {
          await walletApi.pay(bookingUser.id, finalPrice, 'ride_booking', {
            referenceId: booking.id,
            metadata: { rideId: ride.id, from: ride.from, to: ride.to, seats: 1 },
          });
        } catch (paymentError) {
          console.error('[Wallet] ride booking payment failed, cancelling booking:', paymentError);
          // Attempt to cancel the booking. If that also fails we surface a clear
          // "contact support" message rather than leaving the user with no info.
          let cancelFailed = false;
          try {
            await updateRideBooking(booking.id, { status: 'cancelled' });
          } catch (cancelError) {
            cancelFailed = true;
            console.error('[Wallet] booking cancellation after payment failure also failed:', cancelError);
          }
          setRideBookings(getRideBookings());
          setBookingSuccess(null);
          setBookingMessage(
            cancelFailed
              ? (ar
                  ? `فشل الدفع وتعذّر إلغاء الحجز تلقائياً. تواصل مع الدعم مع رمز الحجز: ${booking.id}`
                  : `Payment failed and automatic cancellation also failed. Contact support with booking ID: ${booking.id}`)
              : t.paymentFailed(ride.from, ride.to),
          );
          return;
        }
      } else {
        walletApi
          .pay(bookingUser.id, finalPrice, 'ride_booking', {
            referenceId: booking.id,
            metadata: { rideId: ride.id, from: ride.from, to: ride.to, seats: 1 },
          })
          .catch(err => {
            console.warn('[Wallet] deferred payment queued for driver-confirm flow:', err);
          });
      }

      notificationsAPI
        .createNotification({
          title: booking.status === 'pending_driver'
            ? (ar ? 'تم إرسال طلب الرحلة' : 'Route request sent')
            : t.bookingStarted,
          message:
            booking.status === 'pending_driver'
              ? t.routeRequestNotification(ride.from, ride.to, t.formatCurrency(finalPrice))
              : t.seatConfirmedNotification(
                ride.from,
                ride.to,
                ride.time,
                t.formatCurrency(finalPrice),
              ),
          type: 'booking',
          priority: 'high',
          action_url: '/app/my-trips?tab=rides',
        })
        .catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }

      notifyTripConfirmed(ride.driver.name, t.routeLabel(ride.from, ride.to));
      void recordMovementActivity('ride_booked', corridorPlan?.id ?? null);
    } catch (error) {
      setSelected(null);
      setBookingSuccess(null);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBookingMessage(ar
        ? t.bookingFailed(ride.from, ride.to)
        : `${t.bookingFailed(ride.from, ride.to)} ${message}.`);
      console.error('[FindRide] Booking failed:', error);
    } finally {
      setBookingInFlightId(null);
    }
  }, [bookingInFlightId, showExistingBooking, verifyBookingEligibility, t, ar, resolveSignalForRoute, routeIntelligence.membership, corridorPlan, permission, requestPermission, notifyTripConfirmed]);

  const handleDemandCapture = () => {
    if (!user?.id) {
      setWaitlistMessage(
        ar ? 'سجّل الدخول لحفظ تنبيه المسار على حسابك.' : 'Sign in to save this route alert to your account.',
      );
      return;
    }
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
    if (!suggestion) {return;}

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

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji={<Search size={24} />}
          title={ar ? 'احجز مشوار' : 'Book a Ride'}
          sub={copy.pageSub}
          action={{ label: copy.pageAction, onClick: () => nav('/app/offer-ride') }}
        />

        {/* Persistent booking indicator */}
        {bookedRideIds.size > 0 && (
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: `${DS.green}12`,
              border: `1px solid ${DS.green}30`,
              borderRadius: r(14),
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color={DS.green} />
              <span style={{ color: C.text, fontSize: '0.84rem', fontWeight: 700 }}>
                {bookedRideIds.size} active booking{bookedRideIds.size > 1 ? 's' : ''} in progress
              </span>
            </div>
            <WaselButton onClick={() => { void openMyTrips(); }} variant="outline" size="sm">
              View in My Trips
            </WaselButton>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(
            [
              ['ride', copy.tabRide],
              ['package', copy.tabPackage],
            ] as const
          ).map(([key, label]) => (
            <WaselButton
              key={key}
              onClick={() => { void setTab(key); }}
              variant={tab === key ? 'primary' : 'outline'}
              style={{
                flex: 1,
              }}
            >
              {label}
            </WaselButton>
          ))}
        </div>

        {tab === 'ride' && (
          <>
            <div
              style={{
                background: DS.card,
                borderRadius: r(16),
                padding: 20,
                border: `1px solid ${DS.border}`,
                marginBottom: 22,
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
                  { label: t.from, value: from, setter: setFrom, icon: DS.green, key: 'from' as const },
                  { label: t.to, value: to, setter: setTo, icon: DS.cyan, key: 'to' as const },
                ].map(field => (
                  <div key={field.label}>
                    <label
                      htmlFor={`find-ride-${field.key}`}
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
                    <WaselSelect
                      id={`find-ride-${field.key}`}
                      value={field.value}
                      onChange={field.setter}
                      options={CITIES.map(city => ({ value: city, label: city }))}
                      containerStyle={{ gap: 0 }}
                      style={{ height: 46, paddingLeft: 42 }}
                    />
                  </div>
                ))}
                <div>
                  <label
                    htmlFor="find-ride-date"
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
                  <WaselInput
                    id="find-ride-date"
                    type="date"
                    value={date}
                    onChange={setDate}
                    min={new Date().toISOString().split('T')[0]}
                    icon={<Calendar size={15} color={DS.muted} />}
                    style={{ height: 46, colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {searchError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  style={{
                    marginBottom: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: `${DS.gold}12`,
                    border: `1px solid ${DS.gold}30`,
                    borderRadius: r(14),
                    padding: '12px 14px',
                    color: C.text,
                    fontSize: '0.84rem',
                  }}
                >
                  <Shield size={16} color={DS.gold} />
                  <span>{searchError}</span>
                </div>
              )}

              <WaselButton
                onClick={() => { void handleSearch(); }}
                data-testid="find-ride-search"
                fullWidth
                size="lg"
                disabled={inventoryLoading}
                aria-busy={inventoryLoading}
                style={{
                  gap: 10,
                }}
              >
                {inventoryLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: 20,
                      height: 20,
                      border: `2px solid ${C.border}`,
                      borderTop: `2px solid ${C.text}`,
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  <Search size={18} />
                )}
                {inventoryLoading ? t.searching : t.searchRides}
              </WaselButton>

              {inventoryError && (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginTop: 12,
                    padding: '12px 14px',
                    borderRadius: r(14),
                    border: `1px solid ${DS.gold}55`,
                    background: `${DS.gold}12`,
                    color: C.text,
                  }}
                >
                  <span>
                    <strong>{copy.inventoryErrorTitle}.</strong>{' '}
                    {copy.inventoryErrorDescription}
                  </span>
                  <WaselButton
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={inventoryLoading}
                    onClick={() => setInventoryRefreshKey(key => key + 1)}
                  >
                    {inventoryLoading ? t.searching : copy.retryInventory}
                  </WaselButton>
                </div>
              )}

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
                      {t.routePreview}
                    </p>
                    <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>
                      {selectedSignal
                        ? t.routeActivity(
                          selectedSignal.liveSearches,
                          selectedSignal.liveBookings,
                          selectedSignal.activeDemandAlerts,
                        )
                        : t.selectRouteSignals}
                    </p>
                  </div>
                  {selectedSignal && (
                    <span style={{ ...pill(DS.green), fontSize: '0.72rem' }}>
                      {selectedSignal.forecastDemandScore}/100 {t.demandScore}
                    </span>
                  )}
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
              <BookingStatusBanners
                bookingMessage={bookingMessage}
                bookingSuccess={bookingSuccess}
                retentionMessage={retentionMessage}
                onDismissSuccess={() => setBookingSuccess(null)}
                onOpenMyTrips={openMyTrips}
                openMyTripsLabel={t.openMyTrips}
                keepBrowsingLabel={t.keepBrowsing}
              />
              <div
                className="sp-4col"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {[
                  {
                    label: t.availableDepartures,
                    value: t.departureCount(corridorRides.length),
                    sub: t.departuresOnRoute,
                    tone: DS.cyan,
                  },
                  {
                    label: t.sharedSeatPrice,
                    value: selectedPriceQuote ? t.formatCurrency(selectedPriceQuote.finalPriceJod) : '--',
                    sub: selectedPriceQuote
                      ? t.savingsVsSolo(selectedPriceQuote.discountJod)
                      : t.priceAfterSearch,
                    tone: DS.green,
                  },
                  {
                    label: t.nextDepartureWindow,
                    value:
                      selectedSignal?.nextWaveWindow ??
                      corridorPlan?.autoGroupWindow ??
                      t.checkAfterSearch,
                    sub:
                      selectedSignal?.recommendedPickupPoint ??
                      corridorPlan?.pickupPoints[0] ??
                      t.pickupPointShown,
                    tone: DS.gold,
                  },
                  {
                    label: t.routeReliability,
                    value: selectedSignal
                      ? `${selectedSignal.routeOwnershipScore}/100`
                      : (corridorPlan?.routeMoat ?? t.growing),
                    sub: selectedSignal
                      ? selectedSignal.productionSources.slice(0, 2).join(' · ')
                      : t.savedAlerts(demandStats.active),
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
                        letterSpacing: 0,
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
              <h2 style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>
                {searched
                  ? t.resultsTitle(from, to, results.length)
                  : t.popularRoutesTitle(results.length)}
              </h2>
              {selectedSignal ? (
                <div style={{ color: DS.muted, fontSize: '0.74rem' }}>
                  {t.bestPrice(selectedSignal.priceQuote.finalPriceJod)} · {t.nextDeparture(selectedSignal.nextWaveWindow)}
                </div>
              ) : null}
              <div className="sp-sort-bar" style={{ display: 'flex', gap: 6 }}>
                {(
                  [
                    ['price', t.cheapest],
                    ['time', t.earliest],
                    ['rating', t.topRated],
                  ] as const
                ).map(([key, label]) => (
                  <WaselButton
                    key={key}
                    onClick={() => { void setSort(key); }}
                    variant={sort === key ? 'primary' : 'outline'}
                    size="sm"
                  >
                    {label}
                  </WaselButton>
                ))}
              </div>
            </div>

            <div className="sp-results-list" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              <AnimatePresence>
                {inventoryLoading ? (
                  <motion.div
                    key="ride-inventory-loading"
                    role="status"
                    aria-live="polite"
                    aria-label={t.searching}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      background: DS.card,
                      borderRadius: r(20),
                      padding: '32px 24px',
                      textAlign: 'center',
                      border: `1px solid ${DS.border}`,
                      color: DS.sub,
                    }}
                  >
                    {t.searching}
                  </motion.div>
                ) : results.length === 0 ? (
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
                    <div style={{ fontSize: '3rem', marginBottom: 16 }} aria-hidden='true'>{copy.noResultsIcon}</div>
                    <h3 style={{ color: C.text, fontWeight: 800, marginBottom: 8 }}>
                      {inventoryError ? copy.inventoryErrorTitle : t.noRidesFound}
                    </h3>
                    <p style={{ color: DS.sub, fontSize: '0.875rem' }}>
                      {inventoryError
                        ? copy.inventoryErrorDescription
                        : t.noRideYet(selectedSignal?.nextWaveWindow)}
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
                      <WaselButton
                        onClick={() => {
                          setDate('');
                          setSearchError(null);
                          setSearched(true);
                        }}
                        variant="outline"
                      >
                        {t.clearDateFilter}
                      </WaselButton>
                      <WaselButton
                        onClick={() =>
                          nav(
                            `/app/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
                          )
                        }
                        variant="gold"
                      >
                        {t.openBusFallback}
                      </WaselButton>
                    </div>
                    <WaselButton
                      onClick={() => { void handleDemandCapture(); }}
                      fullWidth
                      variant="outline"
                      style={{
                        marginTop: 10,
                      }}
                    >
                      {copy.notifyMe}
                    </WaselButton>
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
                          t.activeAlerts(demandStats.active)}
                      </div>
                    )}
                    {nearbyCorridors.length > 0 && (
                      <div style={{ marginTop: 20, textAlign: 'left' }}>
                        <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                          {t.nearbyCorridors}
                        </div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          {nearbyCorridors.map(ride => (
                            <WaselButton
                              key={ride.id}
                              onClick={() => { void handleOpenRide(ride); }}
                              variant="outline"
                              style={{
                                textAlign: 'left',
                                padding: '12px 14px',
                                height: 'auto',
                                justifyContent: 'stretch',
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
                                    style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}
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
                                    ? t.formatCurrency(getMovementPriceQuote({ basePriceJod: ride.pricePerSeat, corridorId: resolveSignalForRoute(ride.from, ride.to)?.id, forecastDemandScore: resolveSignalForRoute(ride.from, ride.to)?.forecastDemandScore, membership: routeIntelligence.membership }).finalPriceJod)
                                    : t.soldOut}
                                </span>
                              </div>
                            </WaselButton>
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
                    <div style={{ color: C.text, fontWeight: 800 }}>{t.whyRouteFits}</div>
                    <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                      {t.demandSignalsFor(from, to)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(selectedSignal
                    ? [
                      selectedSignal.recommendedReason,
                      t.nextWaveFrom(selectedSignal.nextWaveWindow, selectedSignal.recommendedPickupPoint),
                      t.basedOn(selectedSignal.productionSources.slice(0, 3).join(' | ')),
                    ]
                    : (corridorPlan?.intelligenceSignals ?? [
                      t.demandBuildsBeforeDeparture,
                      t.pickupPointsStaySimple,
                      t.sharedRidesStayCheaper,
                    ])
                  ).map(line => (
                    <div
                      key={line}
                      style={{
                        borderRadius: r(14),
                        border: `1px solid ${DS.border}`,
                        background: DS.card2,
                        padding: '12px 14px',
                        color: C.text,
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
                      <div style={{ color: C.text, fontWeight: 800 }}>{t.popularRoutesHeading}</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                        {t.strongestDemandOutlook}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {featuredSignals.map(corridor => (
                      <WaselButton
                        key={corridor.id}
                        onClick={() => {
                          setFrom(corridor.from);
                          setTo(corridor.to);
                          setSearched(true);
                        }}
                        variant="outline"
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          height: 'auto',
                          justifyContent: 'stretch',
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
                            <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
                              {corridor.label}
                            </div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              {t.demandScore} {corridor.forecastDemandScore} |{' '}
                              {t.formatCurrency(corridor.priceQuote.finalPriceJod)} |{' '}
                              {corridor.routeOwnershipScore} {t.ownershipScore}
                            </div>
                          </div>
                          <span style={pill(DS.cyan)}>{corridor.pricePressure}</span>
                        </div>
                      </WaselButton>
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
                      <div style={{ color: C.text, fontWeight: 800 }}>{t.ridesCarryPackages}</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                        {t.ridesAcceptParcels}
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
                        <div style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem' }}>
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
                <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
                  {t.suggestedReminders}
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
                              <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
                                {suggestion.label}
                              </div>
                              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                                {suggestion.confidenceScore}/100 |{' '}
                                {t.formatCurrency(suggestion.priceQuote.finalPriceJod)} |{' '}
                                {t.weeklySignals(suggestion.weeklyFrequency)}
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
                            <WaselButton
                              onClick={() => {
                                setFrom(suggestion.from);
                                setTo(suggestion.to);
                                setSearched(true);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              {t.searchRouteButton}
                            </WaselButton>
                            <WaselButton
                              onClick={() => { void handleSaveReminder(suggestion.corridorId); }}
                              variant={alreadySaved ? 'gold' : 'primary'}
                              size="sm"
                            >
                              {alreadySaved ? t.reminderActive : t.saveReminder}
                            </WaselButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: DS.muted, fontSize: '0.8rem' }}>
                    {t.bookMoreForReminders}
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
                <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
                  {t.savedReminders}
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
                        <div style={{ color: C.text, fontWeight: 700, fontSize: '0.8rem' }}>
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
                    {t.saveRouteForReminders}
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
                <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
                  {t.bestRideMatches}
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
                      <WaselButton
                        key={ride.id}
                        onClick={() => { void handleOpenRide(ride); }}
                        variant="outline"
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          height: 'auto',
                          justifyContent: 'stretch',
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
                            <div style={{ color: C.text, fontWeight: 700, fontSize: '0.84rem' }}>
                              {ride.from} to {ride.to}
                            </div>
                            <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                              {ride.time} | {ride.driver.name} |{' '}
                              {rideSignal
                                ? `${rideSignal.routeOwnershipScore}/100 ${t.ownershipScore}`
                                : ride.car}
                            </div>
                          </div>
                          <span
                            style={{ ...pill(bookedRideIds.has(ride.id) ? DS.green : DS.cyan) }}
                          >
                            {bookedRideIds.has(ride.id)
                              ? t.booked
                              : t.formatCurrency(ridePriceQuote.finalPriceJod)}
                          </span>
                        </div>
                      </WaselButton>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  {
                    title: t.recentSearches,
                    // Keyed by the ride/search identity, not the rendered label:
                    // two bookings on the same route, time and driver produce
                    // identical label strings and collided as React keys.
                    items: recentSearches.map((label, index) => ({
                      key: `search-${index}-${label}`,
                      label,
                    })),
                    empty: t.searchHelp,
                    clickable: true,
                  },
                  {
                    title: t.bookedTrips,
                    items: bookedRides.map(ride => ({
                      key: `booked-${ride.id}`,
                      label: `${ride.from} to ${ride.to} | ${ride.time} | ${ride.driver.name}`,
                    })),
                    empty: t.noTripsYet,
                    clickable: false,
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
                    <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>
                      {card.title}
                    </div>
                    {card.items.length > 0 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {card.items.map(item => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              if (!card.clickable) {
                                openMyTrips();
                                return;
                              }
                              const parts = item.label.split(' to ');
                              if (parts[0]) {setFrom(parts[0]);}
                              const toPart = parts[1]?.split(' on ')[0];
                              if (toPart) {setTo(toPart);}
                              setSearched(true);
                            }}
                            style={{
                              borderRadius: r(12),
                              border: `1px solid ${DS.border}`,
                              background: DS.card2,
                              padding: '11px 12px',
                              color: C.text,
                              fontSize: '0.78rem',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <span>{item.label}</span>
                            <Search size={12} color={DS.muted} />
                          </button>
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

        <ServiceFlowPlaybook focusService={tab === 'ride' ? 'find-ride' : 'send-package'} />

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
            onBook={() => { void handleBook(selected); }}
            onOpenBooking={openMyTrips}
          />
        )}
      </PageShell>
    </Protected>
  );
}

export default FindRidePage;
