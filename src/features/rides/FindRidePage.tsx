import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, CheckCircle2, MapPin, Search, Shield } from 'lucide-react';
import { MapWrapper } from '../../components/MapWrapper';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { createDemandAlert, getDemandStats, hydrateDemandAlerts } from '../../services/demandCapture';
import { getConnectedRides } from '../../services/journeyLogistics';
import { notificationsAPI } from '../../services/notifications.js';
import { createRideBooking, hydrateRideBookings } from '../../services/rideLifecycle';
import { ALL_RIDES, buildRideFromPostedRide, CITIES, RIDE_BOOKINGS_KEY, RIDE_SEARCHES_KEY, type Ride } from '../../pages/waselCoreRideData';
import { createFindRideCopy, parseFindRideParams, scoreRideForRecommendation } from '../../pages/waselCorePageHelpers';
import { readStoredStringList, writeStoredStringList } from '../../pages/waselCoreStorage';
import { CoreExperienceBanner, DS, midpoint, PageShell, pill, Protected, r, resolveCityCoord, SectionHead } from '../../pages/waselServiceShared';
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
  const [pkg, setPkg] = useState({ from: 'Amman', to: 'Aqaba', weight: '<1 kg', note: '', sent: false });

  const copy = getFindRideStaticCopy(ar);

  const searchFromCoord = resolveCityCoord(from);
  const searchToCoord = resolveCityCoord(to);
  const connectedRides = getConnectedRides().map(buildRideFromPostedRide);
  const allAvailableRides = [...connectedRides, ...ALL_RIDES];
  const corridorRides = allAvailableRides.filter((ride) => ride.from === from && ride.to === to);
  const availableCorridorRides = corridorRides.filter((ride) => ride.seatsAvailable > 0);
  const soldOutCorridorRides = corridorRides.filter((ride) => ride.seatsAvailable <= 0);
  const nearbyCorridors = allAvailableRides
    .filter((ride) => ride.id && !(ride.from === from && ride.to === to) && (ride.from === from || ride.to === to || ride.to === from || ride.from === to))
    .slice(0, 3);

  const results: Ride[] = searched
    ? allAvailableRides
        .filter((ride) => (!from || ride.from.toLowerCase().includes(from.toLowerCase()) || ride.fromAr === from) && (!to || ride.to.toLowerCase().includes(to.toLowerCase()) || ride.toAr === to) && (!date || ride.date === date))
        .sort((left, right) => sort === 'price' ? left.pricePerSeat - right.pricePerSeat : sort === 'time' ? left.time.localeCompare(right.time) : right.driver.rating - left.driver.rating)
    : allAvailableRides.slice(0, 4);

  const routeReadinessLabel = corridorRides.length >= 2 ? t.instantMatch : corridorRides.length === 1 ? t.bookingReady : t.searchHelp;
  const recommendedRides = [...results]
    .sort((left, right) => scoreRideForRecommendation(right) - scoreRideForRecommendation(left))
    .slice(0, 2);
  const bookedRides = allAvailableRides.filter((ride) => booked.has(ride.id)).slice(0, 3);
  const demandStats = getDemandStats();

  useEffect(() => {
    if (!user?.id) return;
    void hydrateRideBookings(user.id, getConnectedRides());
    void hydrateDemandAlerts(user.id);
  }, [user?.id]);

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
    }, 700);
  };

  const handleBook = (ride: Ride) => {
    if (!user) {
      nav('/app/auth');
      return;
    }
    if (ride.seatsAvailable <= 0) {
      setBookingMessage(`That ride just filled up. ${t.openBusFallback} and try the next departure.`);
      setSelected(null);
      return;
    }

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
      routeMode: ride.routeMode === 'live_post' ? 'live_post' : 'network_inventory',
    });

    setBooked((previous) => new Set(previous).add(ride.id));
    setBookingMessage(
      booking.status === 'pending_driver'
        ? `${ride.from} to ${ride.to} was sent to ${ride.driver.name} for approval. We will update you when the captain responds.`
        : `${ride.from} to ${ride.to} with ${ride.driver.name} is reserved. Ticket ${booking.ticketCode} is now saved in your trips.`,
    );

    notificationsAPI.createNotification({
      title: booking.status === 'pending_driver' ? 'Ride request sent' : t.bookingStarted,
      message: booking.status === 'pending_driver' ? `${ride.from} to ${ride.to} is waiting for driver approval.` : `${ride.from} to ${ride.to} at ${ride.time} is now in your trips with boarding reminders.`,
      type: 'booking',
      priority: 'high',
      action_url: '/app/my-trips?tab=rides',
    }).catch(() => {});

    if (permission === 'default') {
      requestPermission().catch(() => {});
    }

    notifyTripConfirmed(ride.driver.name, `${ride.from} to ${ride.to}`);
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
    setWaitlistMessage(`Demand alert saved for ${alert.from} to ${alert.to}. We will notify you when a matching ride appears.`);
    notificationsAPI.createNotification({
      title: 'Ride alert saved',
      message: `${alert.from} to ${alert.to} is now on your demand watchlist.`,
      type: 'growth',
      priority: 'medium',
      action_url: '/app/find-ride',
    }).catch(() => {});
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="Ride" title="Find a Ride" titleAr={copy.tabRide} sub={copy.pageSub} action={{ label: copy.pageAction, onClick: () => nav('/app/offer-ride') }} />
        <CoreExperienceBanner title="Jordan-first mobility network built for trusted intercity movement" detail="Every search is organized around trusted captains, live intercity corridors, and package-compatible routes so the experience feels clear, premium, and region-ready from the first step." tone={DS.cyan} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([
            ['ride', copy.tabRide],
            ['package', copy.tabPackage],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, height: 44, borderRadius: r(12), border: `1px solid ${tab === key ? DS.cyan : DS.border}`, background: tab === key ? `${DS.cyan}18` : DS.card, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{label}</button>
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
                        {CITIES.map((city) => <option key={city} value={city} style={{ background: DS.card }}>{city}</option>)}
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
                {loading ? t.searching : t.searchRides}
              </motion.button>

              <div style={{ marginTop: 14, background: DS.card2, borderRadius: r(14), padding: 12, border: `1px solid ${DS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ color: DS.muted, fontSize: '0.72rem', fontWeight: 700, margin: '0 0 4px' }}>{t.searchRoute}</p>
                    <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>{t.previewCorridor}</p>
                  </div>
                  <span style={{ ...pill(DS.green), fontSize: '0.72rem' }}>{t.clearFirstStep}</span>
                </div>
                <MapWrapper mode="static" center={midpoint(searchFromCoord, searchToCoord)} pickupLocation={searchFromCoord} dropoffLocation={searchToCoord} height={180} showMosques={false} showRadars={false} />
              </div>

              {searchError && <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', background: `${DS.gold}12`, border: `1px solid ${DS.gold}30`, borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}><Shield size={16} color={DS.gold} /><span>{searchError}</span></div>}
              {bookingMessage && <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,200,117,0.10)', border: '1px solid rgba(0,200,117,0.28)', borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}><CheckCircle2 size={16} color={DS.green} /><span>{bookingMessage}</span></div>}

              <div className="sp-3col sp-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
                {[
                  { label: t.routeReady, value: routeReadinessLabel, sub: `${corridorRides.length} ${t.rides}` },
                  { label: t.routeSummary, value: `${from} to ${to}`, sub: date || t.dateHelp },
                  { label: t.routeIntensity, value: `${availableCorridorRides.reduce((sum, ride) => sum + ride.seatsAvailable, 0)} ${t.seatsLeft}`, sub: soldOutCorridorRides.length > 0 ? `${soldOutCorridorRides.length} sold out departures` : t.seatsStillMove },
                ].map((item) => (
                  <div key={item.label} style={{ background: DS.card2, borderRadius: r(14), padding: '14px 15px', border: `1px solid ${DS.border}` }}>
                    <div style={{ color: DS.muted, fontSize: '0.68rem', fontWeight: 800, marginBottom: 6 }}>{item.label}</div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.88rem' }}>{item.value}</div>
                    <div style={{ color: DS.sub, fontSize: '0.76rem', marginTop: 6 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 18 }}>
              <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>{t.recommendedForYou}</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {recommendedRides.map((ride) => (
                    <button key={ride.id} onClick={() => setSelected(ride)} style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{ride.from} to {ride.to}</div>
                          <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{ride.time} · {ride.driver.name} · {ride.car}</div>
                        </div>
                        <span style={{ ...pill(booked.has(ride.id) ? DS.green : DS.cyan) }}>{booked.has(ride.id) ? 'Booked' : `${ride.pricePerSeat} JOD`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {[{ title: t.recentSearches, items: recentSearches, empty: t.searchHelp }, { title: t.bookedTrips, items: bookedRides.map((ride) => `${ride.from} to ${ride.to} · ${ride.time} · ${ride.driver.name}`), empty: t.noTripsYet }].map((card) => (
                  <div key={card.title} style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
                    <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>{card.title}</div>
                    {card.items.length > 0 ? <div style={{ display: 'grid', gap: 10 }}>{card.items.map((item) => <div key={item} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, padding: '11px 12px', color: '#fff', fontSize: '0.78rem' }}>{item}</div>)}</div> : <div style={{ color: DS.muted, fontSize: '0.8rem' }}>{card.empty}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="sp-results-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{searched ? `${from} to ${to} · ${results.length} ${ar ? t.ride : `ride${results.length !== 1 ? 's' : ''}`} ${t.found}` : `${t.popularRoutes} · ${t.showing} ${results.length} ${t.rides}`}</h2>
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
                    <p style={{ color: DS.sub, fontSize: '0.875rem' }}>{t.tryDifferent}</p>
                    <div className="sp-empty-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                      <button onClick={() => { setDate(''); setSearchError(null); setSearched(true); }} style={{ height: 44, borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.clearDateFilter}</button>
                      <button onClick={() => nav(`/app/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)} style={{ height: 44, borderRadius: r(12), border: 'none', background: DS.gradG, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{t.openBusFallback}</button>
                    </div>
                    <button onClick={handleDemandCapture} style={{ marginTop: 10, width: '100%', height: 44, borderRadius: r(12), border: `1px solid ${DS.cyan}35`, background: `${DS.cyan}12`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{copy.notifyMe}</button>
                    {(waitlistMessage || demandStats.active > 0) && <div style={{ marginTop: 12, color: DS.sub, fontSize: '0.78rem', lineHeight: 1.5 }}>{waitlistMessage ?? `You currently have ${demandStats.active} active demand alert${demandStats.active === 1 ? '' : 's'}.`}</div>}
                    {nearbyCorridors.length > 0 && <div style={{ marginTop: 20, textAlign: 'left' }}><div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>{t.nearbyCorridors}</div><div style={{ display: 'grid', gap: 10 }}>{nearbyCorridors.map((ride) => <button key={ride.id} onClick={() => setSelected(ride)} style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>{ride.from} to {ride.to}</div><div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{ride.time} · {ride.driver.name}</div></div><span style={{ ...pill(ride.seatsAvailable > 0 ? DS.cyan : DS.gold) }}>{ride.seatsAvailable > 0 ? `${ride.pricePerSeat} JOD` : 'Sold out'}</span></div></button>)}</div></div>}
                  </motion.div>
                ) : results.map((ride, index) => <FindRideCard key={ride.id} ride={ride} idx={index} booked={booked.has(ride.id)} onOpen={() => setSelected(ride)} />)}
              </AnimatePresence>
            </div>
          </>
        )}

        {tab === 'package' && (
          <FindRidePackagePanel ar={ar} copy={copy} t={t} pkg={pkg} setPkg={setPkg} />
        )}

        {selected && <FindRideTripDetailModal ride={selected} booked={booked.has(selected.id)} onClose={() => setSelected(null)} onBook={() => handleBook(selected)} />}
      </PageShell>
    </Protected>
  );
}

export default FindRidePage;

