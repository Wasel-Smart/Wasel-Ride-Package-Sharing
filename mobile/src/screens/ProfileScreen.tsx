import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ActionRow,
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { rideLifecycle } from '../services/ride';
import { colors, radii, spacing } from '../theme';

interface ProfileStats {
  totalTrips: number;
  completedTrips: number;
  averageRating: number | null;
  totalSpentJod: number;
}

const ProfileScreen = React.memo(function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const { cacheSize, clearCache, clearQueue, isOnline, queueSize, sync, isSyncing } = useOffline();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const name = user?.user_metadata?.name || user?.email || (loading ? 'جاري تحميل الحساب' : 'زائر');
  const initials = name.slice(0, 1).toUpperCase();

  const loadStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const trips = await rideLifecycle.getRideHistory(100);
      const completed = trips.filter(t => t.status === 'completed');
      const totalSpent = completed
        .filter(t => t.fare != null)
        .reduce((sum, t) => sum + (t.fare ?? 0), 0);

      const ratedTrips = completed.filter(t => (t as { rating?: number }).rating != null);
      const ratings = ratedTrips.map(t => (t as unknown as { rating: number }).rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      setStats({
        totalTrips: trips.length,
        completedTrips: completed.length,
        averageRating,
        totalSpentJod: totalSpent,
      });
    } catch {
      setStats({
        totalTrips: 0,
        completedTrips: 0,
        averageRating: null,
        totalSpentJod: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <ScreenShell
      footer={
        queueSize > 0 ? (
          <PrimaryButton
            icon="sync"
            label={isOnline ? 'زامن الإجراءات المعلقة' : 'بانتظار الشبكة'}
            loading={isSyncing}
            disabled={!isOnline}
            tone={colors.amber}
            onPress={sync}
            testID="sync-queue-button"
          />
        ) : null
      }
      testID="profile-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PremiumPanel tone="dark">
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <StatusPill
              label={user ? 'جلسة موثقة' : 'وضع الزائر'}
              tone={user ? colors.green : colors.amber}
              icon={user ? 'shield-checkmark' : 'person'}
            />
          </View>
          <Text style={styles.profileName}>{name}</Text>
          {user?.email && user?.user_metadata?.name ? (
            <Text style={styles.profileEmail}>{user.email}</Text>
          ) : null}
          <Text style={styles.profileMeta}>الثقة والجلسة والتخزين والتحكم بدون إنترنت</Text>
        </PremiumPanel>

        {/* Live stats from ride history */}
        {statsLoading ? (
          <StateNotice
            icon="stats-chart"
            title="جاري تحميل إحصاءاتك"
            body="بنحمّل سجل المشاوير ومقاييس الحساب..."
            loading
            tone={colors.blue}
          />
        ) : (
          <View style={styles.metrics}>
            <MetricTile
              label="المشاوير"
              value={stats ? String(stats.totalTrips) : user ? '…' : '—'}
              tone={colors.teal}
            />
            <MetricTile
              label="المكتملة"
              value={stats ? String(stats.completedTrips) : user ? '…' : '—'}
              tone={colors.green}
            />
            <MetricTile
              label="التقييم"
              value={stats?.averageRating ? stats.averageRating.toFixed(1) : user ? '…' : '—'}
              tone={colors.gold}
            />
          </View>
        )}

        <View style={styles.metrics}>
          <MetricTile label="التخزين" value={String(cacheSize)} tone={colors.blue} />
          <MetricTile label="الطابور" value={String(queueSize)} tone={queueSize ? colors.amber : colors.teal} />
          <MetricTile label="الشبكة" value={isOnline ? 'مباشر' : 'بدون إنترنت'} tone={isOnline ? colors.green : colors.amber} />
        </View>

        {loading ? (
          <StateNotice
            icon="person-circle"
            title="جاري تحميل الحساب"
            body="بنرجّع حالة الجلسة من التطبيق."
            loading
            tone={colors.blue}
          />
        ) : null}

        {!user ? (
          <StateNotice
            icon="person"
            title="وضع الزائر"
            body="سجّل دخولك لتشوف مشاويرك وتقييماتك وكل إعدادات الحساب."
            tone={colors.amber}
            testID="profile-guest-state"
          />
        ) : null}

        <SectionHeader
          eyebrow="جاهزية الحساب"
          title="تحكمات الثقة المتقدمة"
          body="التحقق والجلسة الآمنة وجاهزية الإشعارات والتعافي بدون إنترنت مجمعة هون."
        />

        <InfoCard
          icon="notifications"
          title="جاهزية الإشعارات"
          body="إعدادات التطبيق بتشمل أذونات الإشعارات والتوصيل بالخلفية."
          tone={colors.blue}
        />
        <InfoCard
          icon="lock-closed"
          title="جلسة آمنة"
          body="Supabase sessions are persisted in native storage with refresh-token support."
          tone={colors.green}
        />

        <View style={styles.actions}>
          <ActionRow icon="trash" label="امسح التخزين" value={`${cacheSize}`} onPress={clearCache} />
          <ActionRow icon="archive" label="امسح طابور المزامنة" value={`${queueSize}`} onPress={clearQueue} />
          <ActionRow icon="refresh" label="حدّث الإحصاءات" onPress={loadStats} />
          {user ? <ActionRow destructive icon="log-out" label="تسجيل الخروج" onPress={signOut} /> : null}
        </View>
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: spacing.lg,
  },
  profileEmail: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  profileMeta: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 5,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    backgroundColor: colors.surface,
    borderColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default ProfileScreen;
