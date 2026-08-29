import React, { useCallback, useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const TripsScreen = React.memo(function TripsScreen() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [trips, setTrips] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

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

      const completed = history.filter(t => t.status === 'completed');
      const eligibility = await Promise.all(
        completed.map(t => rideLifecycle.canRateRide(t.id).then(can => [t.id, can] as const)),
      );
      setRatedIds(new Set(eligibility.filter(([, can]) => !can).map(([id]) => id)));
    } catch {
      setRatedIds(new Set());
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
    .filter(t => t.fare !== null)
    .reduce((sum, t) => sum + (t.fare ?? 0), 0);

  return (
    <ScreenShell testID="trips-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'بيانات مباشرة' : 'مشاوير محفوظة'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label={loading ? 'جاري التحميل...' : `${trips.length} مشاوير`}
            tone={colors.teal}
            icon="time"
          />
        </View>

        <SectionHeader
          eyebrow="مشاويري"
          title="سجل مشاويرك"
          body="المشاوير المكتملة والنشطة والملغاة بتظهر هون."
        />

        <View style={styles.metrics}>
          <MetricTile label="المكتملة" value={String(completedCount)} tone={colors.green} />
          <MetricTile label="كل المشاوير" value={String(trips.length)} tone={colors.teal} />
          <MetricTile label="المدفوع JOD" value={totalFare.toFixed(1)} tone={colors.gold} />
        </View>

        {activeRide ? (
          <>
            <SectionHeader
              eyebrow="مشوار نشط"
              title={`${activeRide.origin.address} → ${activeRide.destination.address}`}
              body={`الحالة: ${activeRide.status} · ${activeRide.seats ?? 1} مقاعد`}
            />
            <PremiumPanel tone="dark">
              <StateNotice
                icon="car-sport"
                title="المشوار شغال"
                body={`من ${activeRide.origin.address} إلى ${activeRide.destination.address}`}
                tone={STATUS_COLOR[activeRide.status] ?? colors.teal}
              />
            </PremiumPanel>
            <PrimaryButton
              label="إلغاء المشوار النشط"
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
            title="سجّل دخولك لتشوف مشاويرك"
            body="سجل مشاويرك بظهر هون بعد تسجيل الدخول."
            tone={colors.amber}
          />
        ) : loading ? (
          <StateNotice
            icon="time"
            title="جاري تحميل المشاوير"
            body="بنحمّل سجل مشاويرك..."
            loading
            tone={colors.blue}
          />
        ) : trips.length === 0 ? (
          <StateNotice
            icon="car-outline"
            title="لسه ما في مشاوير"
            body="احجز أول مشوار وبظهر هون."
            tone={colors.muted}
          />
        ) : (
          trips.map(trip => {
            const rated = trip.rating !== null;
            return (
              <View key={trip.id}>
                <StateNotice
                  icon={trip.status === 'completed' ? 'checkmark-circle' : trip.status === 'cancelled' ? 'close-circle' : 'car-sport'}
                  title={`${trip.origin.address} → ${trip.destination.address}`}
                  body={`${trip.status.replace('_', ' ')}${trip.fare !== null ? ` · ${trip.fare} JOD` : ''} · ${new Date(trip.requestedAt).toLocaleDateString()}${rated ? ` · ⭐ ${trip.rating}` : ''}`}
                  tone={STATUS_COLOR[trip.status] ?? colors.muted}
                />
                {trip.status === 'completed' && !ratedIds.has(trip.id) ? (
                  <PrimaryButton
                    label="قيّم هذا المشوار"
                    icon="star"
                    tone={colors.gold}
                    onPress={() =>
                      navigation.navigate('RateRide', {
                        rideId: trip.id,
                        driverName: trip.driverName ?? 'سائقك',
                        driverId: trip.driverId,
                        tripId: trip.tripId,
                      })
                    }
                    testID={`rate-trip-button-${trip.id}`}
                  />
                ) : null}
              </View>
            );
          })
        )}

        <PrimaryButton
          label="حدّث المشاوير"
          icon="refresh"
          tone={colors.blue}
          onPress={loadTrips}
          testID="refresh-trips-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="وصول بدون إنترنت"
          body="سجل مشاويرك الأخيرة محفوظ محلياً ومتاح حتى بدون اتصال."
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
