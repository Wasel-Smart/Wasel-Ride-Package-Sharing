import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  RoutePreview,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { offlineService } from '../services/offline';
import { mobileAuth } from '../services/auth';
import { waselMobileConfig } from '../lib/config';
import { colors, radii, spacing } from '../theme';

interface BusRoute {
  id: string;
  from: string;
  to: string;
  departure: string;
  seats: number;
  priceJod: number;
  operator: string;
  arrivalEstimate?: string;
  routeCode?: string;
}

const CACHE_KEY = 'bus_routes_v1';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const FALLBACK_ROUTES: BusRoute[] = [
  { id: 'f1', from: 'Amman', to: 'Irbid', departure: '08:00', seats: 12, priceJod: 2.5, operator: 'JETT', arrivalEstimate: '09:30', routeCode: 'JT-001' },
  { id: 'f2', from: 'Amman', to: 'Aqaba', departure: '07:30', seats: 8, priceJod: 7.0, operator: 'JETT', arrivalEstimate: '11:15', routeCode: 'JT-002' },
  { id: 'f3', from: 'Amman', to: 'Zarqa', departure: '09:15', seats: 20, priceJod: 1.0, operator: 'Hijazi', arrivalEstimate: '10:00', routeCode: 'HJ-010' },
  { id: 'f4', from: 'Amman', to: 'Madaba', departure: '10:00', seats: 15, priceJod: 1.5, operator: 'Hijazi', arrivalEstimate: '10:45', routeCode: 'HJ-011' },
  { id: 'f5', from: 'Amman', to: 'Petra', departure: '06:30', seats: 30, priceJod: 9.0, operator: 'JETT', arrivalEstimate: '10:00', routeCode: 'JT-050' },
  { id: 'f6', from: 'Irbid', to: 'Amman', departure: '12:00', seats: 18, priceJod: 2.5, operator: 'JETT', arrivalEstimate: '13:30', routeCode: 'JT-003' },
  { id: 'f7', from: 'Aqaba', to: 'Amman', departure: '14:00', seats: 6, priceJod: 7.0, operator: 'JETT', arrivalEstimate: '17:45', routeCode: 'JT-004' },
  { id: 'f8', from: 'Amman', to: 'Salt', departure: '11:30', seats: 22, priceJod: 1.2, operator: 'Hijazi', arrivalEstimate: '12:15', routeCode: 'HJ-020' },
];

type FetchState = 'idle' | 'loading' | 'success' | 'error' | 'cached';

async function fetchBusRoutes(): Promise<BusRoute[]> {
  const apiUrl = waselMobileConfig.supabaseFunctionUrl || process.env.EXPO_PUBLIC_API_URL || '';
  if (!apiUrl) throw new Error('API URL not configured');

  const token = mobileAuth.getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/v1/bus/routes`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) throw new Error(`Bus API responded with ${response.status}`);

  const data = await response.json();
  return (data.routes ?? data) as BusRoute[];
}

const BusScreen = React.memo(function BusScreen() {
  const { isOnline, queueSize } = useOffline();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);

  const loadRoutes = useCallback(async (forceRefresh = false) => {
    setFetchError(null);

    // Try cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = await offlineService.getCachedData<BusRoute[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        setRoutes(cached);
        setFetchState('cached');
        return;
      }
    }

    if (!isOnline) {
      // Offline and no cache → use fallback
      setRoutes(FALLBACK_ROUTES);
      setFetchState('cached');
      return;
    }

    setFetchState('loading');
    try {
      const live = await fetchBusRoutes();
      setRoutes(live);
      setFetchState('success');
      await offlineService.cacheData(CACHE_KEY, live, CACHE_TTL);
    } catch (err) {
      // Fall back to cache or fallback data
      const cached = await offlineService.getCachedData<BusRoute[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        setRoutes(cached);
        setFetchState('cached');
      } else {
        setRoutes(FALLBACK_ROUTES);
        setFetchState('error');
        setFetchError(err instanceof Error ? err.message : 'Could not load bus routes. Showing sample data.');
      }
    }
  }, [isOnline]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const filtered = routes.filter(
    r =>
      r.from.toLowerCase().includes(search.toLowerCase()) ||
      r.to.toLowerCase().includes(search.toLowerCase()) ||
      r.operator.toLowerCase().includes(search.toLowerCase()) ||
      (r.routeCode ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const bookRoute = useCallback(async (route: BusRoute) => {
    setBooking(true);
    try {
      await offlineService.queueOfflineAction({
        type: 'PACKAGE_REQUEST',
        payload: {
          type: 'BUS_BOOKING',
          routeId: route.id,
          from: route.from,
          to: route.to,
          departure: route.departure,
          priceJod: route.priceJod,
          operator: route.operator,
          routeCode: route.routeCode,
          bookedAt: new Date().toISOString(),
        },
      });
      setBooked(route.id);
      setSelectedRoute(null);
    } finally {
      setBooking(false);
    }
  }, []);

  const statusLabel =
    fetchState === 'loading' ? 'Loading routes…' :
    fetchState === 'success' ? 'Live schedules' :
    fetchState === 'cached' ? 'Cached routes' :
    fetchState === 'error' ? 'Sample data' : 'Checking…';

  const statusTone =
    fetchState === 'loading' ? colors.blue :
    fetchState === 'success' ? colors.green :
    fetchState === 'cached' ? colors.amber :
    colors.red;

  return (
    <ScreenShell testID="bus-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={statusLabel}
            tone={statusTone}
            icon={fetchState === 'loading' ? 'cloud-download' : fetchState === 'success' ? 'bus' : 'archive'}
          />
          <StatusPill
            label={`${filtered.length} routes`}
            tone={colors.teal}
            icon="map"
          />
        </View>

        <SectionHeader
          eyebrow="Bus booking"
          title="Intercity bus routes"
          body="Book verified bus seats on Jordan's main corridors. Data fetched live from verified operators."
        />

        <View style={styles.metrics}>
          <MetricTile label="Routes" value={String(routes.length)} tone={colors.teal} />
          <MetricTile label="Queued" value={String(queueSize)} tone={queueSize ? colors.amber : colors.green} />
          <MetricTile label="Currency" value="JOD" tone={colors.gold} />
        </View>

        {fetchState === 'loading' ? (
          <StateNotice
            icon="cloud-download"
            title="Fetching live schedules"
            body="Loading bus routes from verified Jordanian operators…"
            loading
            tone={colors.blue}
          />
        ) : null}

        {fetchState === 'error' ? (
          <StateNotice
            icon="warning"
            title="Could not load live routes"
            body={fetchError ?? 'Showing sample routes. Pull to refresh when online.'}
            tone={colors.amber}
            testID="bus-fetch-error"
          />
        ) : null}

        <View style={styles.searchRow}>
          <PremiumPanel style={styles.searchPanel}>
            <TextInput
              placeholder="Search city, operator, or route code…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="words"
              testID="bus-search-input"
            />
          </PremiumPanel>
          <PrimaryButton
            label=""
            icon="refresh"
            tone={isOnline ? colors.blue : colors.muted}
            disabled={!isOnline || fetchState === 'loading'}
            onPress={() => loadRoutes(true)}
            testID="bus-refresh-button"
          />
        </View>

        {booked ? (
          <StateNotice
            icon="checkmark-circle"
            title="Booking confirmed"
            body="Your bus booking is queued and will sync when online."
            tone={colors.green}
            testID="bus-booking-confirmed"
          />
        ) : null}

        {selectedRoute ? (
          <PremiumPanel tone="dark">
            <SectionHeader
              eyebrow={`${selectedRoute.operator} · ${selectedRoute.routeCode ?? ''}`}
              title={`${selectedRoute.from} → ${selectedRoute.to}`}
              body={`Departs ${selectedRoute.departure}${selectedRoute.arrivalEstimate ? ` · Arrives ~${selectedRoute.arrivalEstimate}` : ''} · ${selectedRoute.seats} seats · ${selectedRoute.priceJod} JOD`}
              tone="dark"
            />
            <View style={styles.bookRow}>
              <PrimaryButton
                label={booking ? 'Booking…' : 'Confirm booking'}
                icon="checkmark"
                tone={colors.teal}
                loading={booking}
                onPress={() => void bookRoute(selectedRoute)}
                testID="confirm-bus-booking"
              />
              <PrimaryButton
                label="Cancel"
                icon="close"
                tone={colors.muted}
                onPress={() => setSelectedRoute(null)}
              />
            </View>
          </PremiumPanel>
        ) : null}

        {filtered.length === 0 && fetchState !== 'loading' ? (
          <StateNotice
            icon="bus"
            title="No routes found"
            body="Try a different city name, operator, or route code."
            tone={colors.muted}
          />
        ) : null}

        {filtered.map(route => (
          <View key={route.id}>
            <RoutePreview
              from={`${route.from} ${route.departure}`}
              to={`${route.to}${route.arrivalEstimate ? ` ~${route.arrivalEstimate}` : ''}`}
              eta={`${route.seats} seats`}
              distance={`${route.priceJod} JOD`}
              tone={booked === route.id ? colors.green : colors.teal}
            />
            {!selectedRoute && (
              <PrimaryButton
                label={booked === route.id ? `Booked — ${route.from} → ${route.to}` : `Book · ${route.operator} · ${route.from} → ${route.to} ${route.departure}`}
                icon={booked === route.id ? 'checkmark-circle' : 'bus'}
                tone={booked === route.id ? colors.green : colors.blue}
                onPress={() => setSelectedRoute(route)}
                testID={`book-route-${route.id}`}
              />
            )}
          </View>
        ))}

        <InfoCard
          icon="time"
          title="Offline booking"
          body="Bus bookings queue locally when offline and sync automatically when the device reconnects."
          tone={colors.amber}
        />
        <InfoCard
          icon="shield-checkmark"
          title="Verified operators"
          body="Routes are sourced from JETT and licensed Jordanian intercity operators via the live API."
          tone={colors.green}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchPanel: { flex: 1, padding: 0 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  bookRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
});

export default BusScreen;
