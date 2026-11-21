/**
 * useFindRideController
 *
 * Owns every piece of state, derived data, effects, and event handlers
 * for FindRidePage.  The page component is a thin JSX shell.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useRideFilters } from './useRideFilters';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import {
  createDemandAlert,
  getDemandStats,
  hydrateDemandAlerts,
} from '../../../services/demandCapture';
import { trackGrowthEvent } from '../../../services/growthEngine';
import { getConnectedRides } from '../../../services/journeyLogistics';
import { getMovementPriceQuote } from '../../../services/movementPricing';
import { recordMovementActivity } from '../../../services/movementMembership';
import {
  areRouteRemindersEqual,
  createReminderFromSuggestion,
  formatRouteReminderSchedule,
  getRecurringRouteSuggestions,
  getRouteReminderForCorridor,
  getRouteReminders,
  syncRouteReminders,
} from '../../../services/movementRetention';
import { notificationsAPI } from '../../../services/notifications.js';
import { subscribeToRideBookingRealtime } from '../../../services/rideRealtime';
import {
  getLiveCorridorSignal,
  useLiveRouteIntelligence,
} from '../../../services/routeDemandIntelligence';
import {
  createRideBooking,
  getRideBookings,
  updateRideBooking,
  type RideBookingRecord,
} from '../../../services/rideLifecycle';
import { walletApi } from '../../../services/wallet/walletApi';
import { getCorridorOpportunity, getMarketplaceNodes } from '../../../config/wasel-movement-network';
import {
  CITIES,
  RIDE_SEARCHES_KEY,
  type Ride,
} from '../../../pages/waselCoreRideData';
import {
  createFindRideCopy,
  scoreRideForRecommendation,
} from '../../../pages/waselCorePageHelpers';
import { readStoredStringList, writeStoredStringList } from '../../../pages/waselCoreStorage';
import { DS, midpoint, resolveCityCoord } from '../../../pages/waselServiceShared';
import { getFindRideStaticCopy } from '../findRideContent';
import { useRideInventory } from '../useRideInventory';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BookingSuccessState = {
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

// ─── Internal helpers ─────────────────────────────────────────────────────────

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
    setTo:   (to: string)   => updateForm({ to }),
    setDate: (date: string) => updateForm({ date }),
    setSearched: (searched: boolean) => updateForm({ searched }),
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

export function useFindRideController() {
  const nav      = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const searchForm = useRideSearchForm(location.search);
  const t    = createFindRideCopy(ar);
  const copy = getFindRideStaticCopy(ar);

  const [tab, setTab] = useState<'ride' | 'package'>('ride');
  const { from, to, date, searched, setFrom, setTo, setDate, setSearched } = searchForm;
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [selected,         setSelected]         = useState<Ride | null>(null);
  const [bookingInFlightId, setBookingInFlightId] = useState<string | null>(null);
  const [rideBookings,     setRideBookings]     = useState<RideBookingRecord[]>(() => getRideBookings());
  const [recentSearches,   setRecentSearches]   = useState<string[]>(() => readStoredStringList(RIDE_SEARCHES_KEY));
  const [searchError,      setSearchError]      = useState<string | null>(null);
  const [bookingMessage,   setBookingMessage]   = useState<string | null>(null);
  const [bookingSuccess,   setBookingSuccess]   = useState<BookingSuccessState | null>(null);
  const [waitlistMessage,  setWaitlistMessage]  = useState<string | null>(null);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);
  const [savedReminders,   setSavedReminders]   = useState(() => getRouteReminders());
  const [pkg, setPkg] = useState({ from: 'Amman', to: 'Aqaba', weight: '<1 kg', note: '', sent: false });

  const marketplaceNodes  = useMemo(() => getMarketplaceNodes().slice(0, 3), []);
  const corridorPlan      = useMemo(() => getCorridorOpportunity(from, to), [from, to]);
  const routeIntelligence = useLiveRouteIntelligence({ from, to, userId: user?.id });
  const selectedSignal    = routeIntelligence.selectedSignal;
  const featuredSignals   = routeIntelligence.featuredSignals.slice(0, 4);
  const recurringSuggestions = useMemo(() => getRecurringRouteSuggestions(3, user?.id), [user?.id]);
  const demandStats = getDemandStats(user?.id);

  const searchFromCoord = resolveCityCoord(from);
  const searchToCoord   = resolveCityCoord(to);

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

  const signalLookup = useMemo(() => {
    const lookup = new Map<string, ReturnType<typeof getLiveCorridorSignal>>();
    for (const signal of routeIntelligence.allSignals) {
      lookup.set(`${signal.from}::${signal.to}`, signal);
      lookup.set(`${signal.to}::${signal.from}`, signal);
    }
    return lookup;
  }, [routeIntelligence.allSignals]);

  const {
    rides: allAvailableRides,
    loading: inventoryLoading,
    error: inventoryError,
  } = useRideInventory({ from, to, date, searched, refreshKey: inventoryRefreshKey });

  const corridorRides   = allAvailableRides.filter(r => r.from === from && r.to === to);
  const nearbyCorridors = allAvailableRides.filter(r =>
    r.id && !(r.from === from && r.to === to) &&
    (r.from === from || r.to === to || r.to === from || r.from === to),
  ).slice(0, 3);

  const filteredResults: Ride[] = searched
    ? allAvailableRides.filter(r =>
        (!from || r.from.toLowerCase().includes(from.toLowerCase()) || r.fromAr === from) &&
        (!to   || r.to.toLowerCase().includes(to.toLowerCase())     || r.toAr   === to)   &&
        (!date || r.date === date),
      )
    : allAvailableRides.slice(0, 4);

  const { sort, setSort, sortedRides: results } = useRideFilters(filteredResults);

  const recommendedRides = [...results]
    .sort((a, b) => scoreRideForRecommendation(b) - scoreRideForRecommendation(a))
    .slice(0, 2);
  const bookedRides = allAvailableRides.filter(r => bookedRideIds.has(r.id)).slice(0, 3);

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

  const getRideBookingStatus = useCallback(
    (rideId: string): 'pending_driver' | 'confirmed' | null => {
      const status = bookingByRideId.get(rideId)?.status;
      return status === 'pending_driver' || status === 'confirmed' ? status : null;
    },
    [bookingByRideId],
  );

  // ── Effects ────────────────────────────────────────────────────────────────

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
    const refresh = () => {
      const next = getRouteReminders();
      setSavedReminders(prev => (areRouteRemindersEqual(prev, next) ? prev : next));
    };
    refresh();
    void syncRouteReminders(user ?? undefined).then(delivered => {
      if (delivered.length > 0) refresh();
    });
  }, [routeIntelligence.updatedAt, user]);

  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(() => {
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
  }, [from, to, date, t, setSearched, user?.id]);

  const handleOpenRide = useCallback((ride: Ride) => {
    const rideSignal  = resolveSignalForRoute(ride.from, ride.to);
    const priceQuote  = getMovementPriceQuote({
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
      metadata: { rideId: ride.id, driverName: ride.driver.name },
    });
  }, [resolveSignalForRoute, routeIntelligence.membership, user?.id]);

  const showExistingBooking = useCallback((ride: Ride) => {
    const existingBooking = bookingByRideId.get(ride.id);
    if (!existingBooking) return false;
    setBookingMessage(
      existingBooking.status === 'pending_driver'
        ? `${ride.from} to ${ride.to} is already waiting for driver confirmation in My Trips.`
        : `${ride.from} to ${ride.to} is already confirmed in My Trips.`,
    );
    openMyTrips();
    return true;
  }, [bookingByRideId, openMyTrips]);

  const verifyBookingEligibility = useCallback((ride: Ride) => {
    if (!user) { nav('/app/auth'); return null; }
    if (ride.seatsAvailable <= 0) {
      setBookingMessage(t.rideFullMessage(ride.from, ride.to, t.openBusFallback));
      setSelected(null);
      return null;
    }
    return user;
  }, [nav, t, user]);

  const handleBook = useCallback(async (ride: Ride) => {
    if (bookingInFlightId) return;
    if (showExistingBooking(ride)) return;
    const bookingUser = verifyBookingEligibility(ride);
    if (!bookingUser) return;

    const rideSignal     = resolveSignalForRoute(ride.from, ride.to);
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
        userId: bookingUser.id,
        from:   ride.from,
        to:     ride.to,
        seats:  1,
        priceJod: finalPrice,
        driverName: ride.driver.name,
      });
      setRideBookings(getRideBookings());
      setBookingSuccess({
        status: booking.status as BookingSuccessState['status'],
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
          let cancelFailed = false;
          try { await updateRideBooking(booking.id, { status: 'cancelled' }); }
          catch (cancelError) {
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
        walletApi.pay(bookingUser.id, finalPrice, 'ride_booking', {
          referenceId: booking.id,
          metadata: { rideId: ride.id, from: ride.from, to: ride.to, seats: 1 },
        }).catch(err => { console.warn('[Wallet] deferred payment queued for driver-confirm flow:', err); });
      }

      notificationsAPI.createNotification({
        title: booking.status === 'pending_driver'
          ? (ar ? 'تم إرسال طلب الرحلة' : 'Route request sent')
          : t.bookingStarted,
        message: booking.status === 'pending_driver'
          ? t.routeRequestNotification(ride.from, ride.to, t.formatCurrency(finalPrice))
          : t.seatConfirmedNotification(ride.from, ride.to, ride.time, t.formatCurrency(finalPrice)),
        type: 'booking',
        priority: 'high',
        action_url: '/app/my-trips?tab=rides',
      }).catch(() => {});

      if (permission === 'default') requestPermission().catch(() => {});
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
  }, [
    bookingInFlightId, showExistingBooking, verifyBookingEligibility, t, ar,
    resolveSignalForRoute, routeIntelligence.membership, corridorPlan,
    permission, requestPermission, notifyTripConfirmed,
  ]);

  const handleDemandCapture = useCallback(() => {
    if (!user?.id) {
      setWaitlistMessage(ar
        ? 'سجّل الدخول لحفظ تنبيه المسار على حسابك.'
        : 'Sign in to save this route alert to your account.');
      return;
    }
    const alert = createDemandAlert({
      from, to,
      date: date || new Date().toISOString().slice(0, 10),
      service: 'ride',
      userId: user.id,
    });
    setWaitlistMessage(`Alert saved for ${alert.from} to ${alert.to}.`);
    void trackGrowthEvent({
      userId: user.id,
      eventName: 'route_demand_alert_saved',
      funnelStage: 'searched',
      serviceType: 'ride',
      from: alert.from,
      to: alert.to,
    });
  }, [ar, from, to, date, user]);

  const handleSaveReminder = useCallback((corridorId: string) => {
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
  }, [recurringSuggestions, user?.id]);

  // ── Derived display helpers ───────────────────────────────────────────────

  const statCards = useMemo(() => [
    {
      label:  t.availableDepartures,
      value:  t.departureCount(corridorRides.length),
      sub:    t.departuresOnRoute,
      tone:   DS.cyan,
    },
    {
      label: t.sharedSeatPrice,
      value: selectedPriceQuote ? t.formatCurrency(selectedPriceQuote.finalPriceJod) : '--',
      sub:   selectedPriceQuote ? t.savingsVsSolo(selectedPriceQuote.discountJod) : t.priceAfterSearch,
      tone:  DS.green,
    },
    {
      label: t.nextDepartureWindow,
      value: selectedSignal?.nextWaveWindow ?? corridorPlan?.autoGroupWindow ?? t.checkAfterSearch,
      sub:   selectedSignal?.recommendedPickupPoint ?? corridorPlan?.pickupPoints[0] ?? t.pickupPointShown,
      tone:  DS.gold,
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
  ], [t, corridorRides.length, selectedPriceQuote, selectedSignal, corridorPlan, demandStats.active]);

  const intelligenceLines = useMemo(() => selectedSignal
    ? [
        selectedSignal.recommendedReason,
        t.nextWaveFrom(selectedSignal.nextWaveWindow, selectedSignal.recommendedPickupPoint),
        t.basedOn(selectedSignal.productionSources.slice(0, 3).join(' | ')),
      ]
    : (corridorPlan?.intelligenceSignals ?? [
        t.demandBuildsBeforeDeparture,
        t.pickupPointsStaySimple,
        t.sharedRidesStayCheaper,
      ]),
  [selectedSignal, corridorPlan, t]);

  return {
    // navigation & locale
    nav, ar, t, copy, DS,
    // tabs
    tab, setTab,
    // search form
    from, to, date, searched, setFrom, setTo, setDate, setSearched,
    // map
    searchFromCoord, searchToCoord,
    // inventory
    allAvailableRides, inventoryLoading, inventoryError,
    inventoryRefreshKey, setInventoryRefreshKey,
    // derived ride lists
    results, sort, setSort,
    corridorRides, nearbyCorridors,
    recommendedRides, bookedRides,
    // signals
    routeIntelligence, selectedSignal, featuredSignals,
    selectedPriceQuote,
    // bookings
    rideBookings, bookedRideIds, bookingByRideId, selectedBooking,
    bookingInFlightId,
    // messages
    searchError, bookingMessage, bookingSuccess, waitlistMessage, retentionMessage,
    setBookingSuccess,
    // reminders
    savedReminders, recurringSuggestions, demandStats,
    getRouteReminderForCorridor, formatRouteReminderSchedule,
    // marketplace
    marketplaceNodes,
    // package panel
    pkg, setPkg,
    // display helpers
    statCards, intelligenceLines,
    corridorPlan, marketplaceNodes: marketplaceNodes,
    // selected ride (for modal)
    selected, setSelected,
    // event handlers
    handleSearch, handleOpenRide, handleBook,
    handleDemandCapture, handleSaveReminder,
    getRideBookingStatus, openMyTrips, resolveSignalForRoute,
    // push
    permission,
  };
}
