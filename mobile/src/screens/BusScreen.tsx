import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { colors, radii, spacing, typography } from '../theme';

interface BusRoute {
  id: string;
  from: string;
  to: string;
  departure: string;
  seats: number;
  priceJod: number;
  operator: string;
}

const SAMPLE_ROUTES: BusRoute[] = [
  { id: '1', from: 'Amman', to: 'Irbid', departure: '08:00', seats: 12, priceJod: 2.5, operator: 'JETT' },
  { id: '2', from: 'Amman', to: 'Aqaba', departure: '07:30', seats: 8, priceJod: 7.0, operator: 'JETT' },
  { id: '3', from: 'Amman', to: 'Zarqa', departure: '09:15', seats: 20, priceJod: 1.0, operator: 'Hijazi' },
  { id: '4', from: 'Amman', to: 'Madaba', departure: '10:00', seats: 15, priceJod: 1.5, operator: 'Hijazi' },
];

const BusScreen = React.memo(function BusScreen() {
  const { isOnline, queueSize } = useOffline();
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);

  const filtered = SAMPLE_ROUTES.filter(
    r =>
      r.from.toLowerCase().includes(search.toLowerCase()) ||
      r.to.toLowerCase().includes(search.toLowerCase()),
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
          bookedAt: new Date().toISOString(),
        },
      });
      setBooked(route.id);
      setSelectedRoute(null);
    } finally {
      setBooking(false);
    }
  }, []);

  return (
    <ScreenShell testID="bus-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'Live schedules' : 'Cached routes'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'bus' : 'archive'}
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
          body="Book verified bus seats on Jordan's main corridors."
        />

        <View style={styles.metrics}>
          <MetricTile label="Routes" value={String(SAMPLE_ROUTES.length)} tone={colors.teal} />
          <MetricTile label="Queued" value={String(queueSize)} tone={queueSize ? colors.amber : colors.green} />
          <MetricTile label="Currency" value="JOD" tone={colors.gold} />
        </View>

        <PremiumPanel>
          <TextInput
            placeholder="Search city…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="words"
            testID="bus-search-input"
          />
        </PremiumPanel>

        {booked ? (
          <StateNotice
            icon="checkmark-circle"
            title="Booking confirmed"
            body={`Your bus booking is queued and will sync when online.`}
            tone={colors.green}
            testID="bus-booking-confirmed"
          />
        ) : null}

        {selectedRoute ? (
          <PremiumPanel tone="dark">
            <SectionHeader
              eyebrow="Selected route"
              title={`${selectedRoute.from} → ${selectedRoute.to}`}
              body={`Departure ${selectedRoute.departure} · ${selectedRoute.seats} seats · ${selectedRoute.priceJod} JOD · ${selectedRoute.operator}`}
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

        {filtered.length === 0 ? (
          <StateNotice
            icon="bus"
            title="No routes found"
            body="Try a different city name."
            tone={colors.muted}
          />
        ) : (
          filtered.map(route => (
            <RoutePreview
              key={route.id}
              from={`${route.from} ${route.departure}`}
              to={route.to}
              eta={`${route.seats} seats`}
              distance={`${route.priceJod} JOD`}
              tone={booked === route.id ? colors.green : colors.teal}
            />
          ))
        )}

        {!selectedRoute && filtered.map(route => (
          <PrimaryButton
            key={`book-${route.id}`}
            label={booked === route.id ? `Booked — ${route.from} → ${route.to}` : `Book ${route.from} → ${route.to} ${route.departure}`}
            icon={booked === route.id ? 'checkmark-circle' : 'bus'}
            tone={booked === route.id ? colors.green : colors.blue}
            onPress={() => setSelectedRoute(route)}
            testID={`book-route-${route.id}`}
          />
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
          body="Routes are sourced from JETT and licensed Jordanian intercity operators."
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
