import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  MetricTile,
  PremiumPanel,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { apiClient } from '../lib/api';
import { colors, radii, shadows, spacing, typography } from '../theme';

interface NetworkCorridor {
  id: string;
  from: string;
  to: string;
  fromAr?: string;
  toAr?: string;
  activeRides: number;
  activePackages: number;
  avgPriceJod: number;
  demandScore: number; // 0-100
  operatorCount: number;
}

function DemandBar({ score }: { score: number }) {
  const color =
    score >= 70 ? colors.green : score >= 40 ? colors.amber : colors.muted;
  return (
    <View style={styles.demandBarTrack}>
      <View style={[styles.demandBarFill, { width: `${score}%` as never, backgroundColor: color }]} />
    </View>
  );
}

function CorridorCard({ corridor }: { corridor: NetworkCorridor }) {
  const demandColor =
    corridor.demandScore >= 70
      ? colors.green
      : corridor.demandScore >= 40
      ? colors.amber
      : colors.muted;

  return (
    <View style={styles.corridorCard}>
      <View style={styles.corridorHeader}>
        <Text style={styles.corridorRoute}>
          {corridor.fromAr ?? corridor.from} ← → {corridor.toAr ?? corridor.to}
        </Text>
        <View style={[styles.demandPill, { backgroundColor: demandColor + '18', borderColor: demandColor + '44' }]}>
          <Text style={[styles.demandPillText, { color: demandColor }]}>
            {corridor.demandScore}/100
          </Text>
        </View>
      </View>
      <DemandBar score={corridor.demandScore} />
      <View style={styles.corridorMetrics}>
        <View style={styles.metric}>
          <Ionicons name="car-outline" size={13} color={colors.teal} />
          <Text style={styles.metricValue}>{corridor.activeRides}</Text>
          <Text style={styles.metricLabel}>مشاوير</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="cube-outline" size={13} color={colors.blue} />
          <Text style={styles.metricValue}>{corridor.activePackages}</Text>
          <Text style={styles.metricLabel}>طرود</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="people-outline" size={13} color={colors.green} />
          <Text style={styles.metricValue}>{corridor.operatorCount}</Text>
          <Text style={styles.metricLabel}>مشغّلين</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="cash-outline" size={13} color={colors.gold} />
          <Text style={styles.metricValue}>{corridor.avgPriceJod.toFixed(1)} JOD</Text>
          <Text style={styles.metricLabel}>متوسط</Text>
        </View>
      </View>
    </View>
  );
}

const NetworksScreen = React.memo(function NetworksScreen() {
  const { isOnline } = useOffline();
  const [corridors, setCorridors] = useState<NetworkCorridor[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadCorridors = React.useCallback(async () => {
    if (!isOnline) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiClient.get<{ corridors?: NetworkCorridor[] }>('mobility/corridors');
      if (res.error || !res.data?.corridors) {
        setFetchError(res.error ?? 'تعذّر تحميل الشبكات');
        return;
      }
      setCorridors(res.data.corridors);
    } catch {
      setFetchError('خطأ بالشبكة');
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void loadCorridors();
  }, [loadCorridors]);

  const totalRides = corridors.reduce((s, c) => s + c.activeRides, 0);
  const totalPackages = corridors.reduce((s, c) => s + c.activePackages, 0);
  const highDemand = corridors.filter(c => c.demandScore >= 70).length;

  return (
    <ScreenShell testID="networks-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'شبكة مباشرة' : 'آمن بدون إنترنت'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill label="الشبكات" tone={colors.teal} icon="git-network" />
        </View>

        <PremiumPanel tone="dark" testID="networks-command-center">
          <SectionHeader
            eyebrow="شبكات واصل"
            title="خريطة شبكة الخطوط"
            body="استعرض شبكات المشاوير المشتركة وخطوط الشركاء ومجموعات المشغلين الموثقين."
            tone="dark"
          />
          <View style={styles.summaryMetrics}>
            <MetricTile label="مشاوير نشطة" value={String(totalRides)} tone={colors.teal} />
            <MetricTile label="طرود" value={String(totalPackages)} tone={colors.blue} />
            <MetricTile label="طلب عالي" value={String(highDemand)} tone={colors.green} />
          </View>
        </PremiumPanel>

        {loading && (
          <StateNotice
            icon="cloud-download"
            title="جاري تحميل الشبكات..."
            tone={colors.teal}
            testID="networks-loading"
          />
        )}

        {fetchError && !loading && (
          <StateNotice
            icon="warning"
            title="تعذّر تحميل الشبكات"
            body={fetchError}
            tone={colors.amber}
            testID="networks-error"
          />
        )}

        {!loading && !fetchError && corridors.length === 0 && (
          <StateNotice
            icon="git-network"
            title="لا توجد شبكات مباشرة"
            body="سيتم تحميل بيانات الشبكة حالما تتوفر."
            tone={colors.muted}
            testID="networks-empty"
          />
        )}

        {corridors.map(c => (
          <CorridorCard key={c.id} corridor={c} />
        ))}

        {!loading && isOnline && (
          <Pressable
            style={styles.refreshBtn}
            onPress={() => void loadCorridors()}
            accessible
            accessibilityRole="button"
            accessibilityLabel="تحديث الشبكات"
          >
            <Ionicons name="refresh" size={16} color={colors.teal} />
            <Text style={styles.refreshText}>تحديث</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  summaryMetrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  corridorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  corridorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  corridorRoute: { ...typography.subtitle, color: colors.textPrimary, fontWeight: '800', flex: 1 },
  demandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  demandPillText: { fontSize: 11, fontWeight: '800' },
  demandBarTrack: {
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  demandBarFill: { height: 4, borderRadius: 2 },
  corridorMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { ...typography.caption, fontWeight: '800', color: colors.textPrimary },
  metricLabel: { fontSize: 10, color: colors.muted },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  refreshText: { ...typography.caption, color: colors.teal, fontWeight: '700' },
});

export default NetworksScreen;
