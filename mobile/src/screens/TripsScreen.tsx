import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { useOffline } from '../hooks/useOffline';
import { rideLifecycle, type Ride } from '../services/ride';
import { colors, spacing } from '../theme';
import { useEffect } from 'react';

const TripsScreen = React.memo(function TripsScreen() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [trips, setTrips] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  const STATUS_COLOR: Record<string, string> = {
    completed: colors.green,
    cancelled: colors.red,
    in_progress: colors.teal,
    matched: colors.blue,
    requested: colors.amber,
  };

  const loadTrips = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [history, active] = await Promise.all([
        rideLifecycle.getRideHistory(20),
        rideLifecycle.getActiveRide(),
      ]);
      setTrips(history);
      setActiveRide(active);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const handleCancel = useCallback(async () => {
    if (!activeRide) return;
    await rideLifecycle.cancelRide(activeRide.id, 'User cancelled from mobile');
    setActiveRide(null);
    await loadTrips();
  }, [activeRide, loadTrips]);

  const completedCount = trips.filter(t => t.status === 'completed').length;
  const totalFare = trips
    .filter(t => t.fare != null)
    .reduce((sum, t) => sum + (t.fare ?? 0), 0);

  return (
    <ScreenShell testID="trips-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'Live data' : 'Cached trips'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label={loading ? 'Loading…' : `${trips.length} trips`}
            tone={colors.teal}
            icon="time"
          />
        </View>

        <SectionHeader
          eyebrow="My trips"
          title="Your ride history"
          body="Completed, active, and cancelled rides are listed here."
        />

        <View style={styles.metrics}>
          <MetricTile label="Completed" value={String(completedCount)} tone={colors.green} />
          <MetricTile label="Total trips" value={String(trips.length)} tone={colors.teal} />
          <MetricTile label="Spent JOD" value={totalFare.toFixed(1)} tone={colors.gold} />
        </View>

        {activeRide ? (
          <>
            <SectionHeader
              eyebrow="Active ride"
              title={`${activeRide.origin.address} → ${activeRide.destination.address}`}
               body={`Status: ${activeRide.status} · ${(activeRide as unknown as { seats?: number }).seats ?? 1} seat(s)`}
            />
            <PremiumPanel tone="dark">
              <StateNotice
                icon="car-sport"
                title="Ride in progress"
                body={`From ${activeRide.origin.address} to ${activeRide.destination.address}`}
                tone={STATUS_COLOR[activeRide.status] ?? colors.teal}
              />
            </PremiumPanel>
            <PrimaryButton
              label="Cancel active ride"
              icon="close-circle"
              tone={colors.red}
              onPress={handleCancel}
              testID="cancel-ride-button"
            />
          </>
        ) : null}

        {!user ? (
          <StateNotice
            icon="person"
            title="Sign in to see your trips"
            body="Your ride history appears here after signing in."
            tone={colors.amber}
          />
        ) : loading ? (
          <StateNotice
            icon="time"
            title="Loading trips"
            body="Fetching your ride history…"
            loading
            tone={colors.blue}
          />
        ) : trips.length === 0 ? (
          <StateNotice
            icon="car-outline"
            title="No trips yet"
            body="Book your first ride and it will appear here."
            tone={colors.muted}
          />
        ) : (
          trips.map(trip => (
            <StateNotice
              key={trip.id}
              icon={trip.status === 'completed' ? 'checkmark-circle' : trip.status === 'cancelled' ? 'close-circle' : 'car-sport'}
              title={`${trip.origin.address} → ${trip.destination.address}`}
              body={`${trip.status.replace('_', ' ')}${trip.fare != null ? ` · ${trip.fare} JOD` : ''} · ${new Date(trip.requestedAt).toLocaleDateString()}`}
              tone={STATUS_COLOR[trip.status] ?? colors.muted}
            />
          ))
        )}

        <PrimaryButton
          label="Refresh trips"
          icon="refresh"
          tone={colors.blue}
          onPress={loadTrips}
          testID="refresh-trips-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="Offline access"
          body="Your recent trip history is cached locally and available even without a network connection."
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
});

export default TripsScreen;
