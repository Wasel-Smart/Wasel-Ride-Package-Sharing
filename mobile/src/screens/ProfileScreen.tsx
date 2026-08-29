import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
import { useAuth } from '../providers/AuthProvider';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../lib/api';
import { useOffline } from '../hooks/useOffline';
import { colors, radii, spacing } from '../theme';
import * as ImagePicker from 'expo-image-picker';

interface ProfileStats {
  totalTrips: number;
  completedTrips: number;
  averageRating: number | null;
  totalSpentJod: number;
}

const ProfileScreen = React.memo(function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const { t, language } = useLanguage();
  const { cacheSize, clearCache, clearQueue, isOnline, queueSize, sync, isSyncing } = useOffline();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const displayName = user?.user_metadata?.name || user?.email || (loading ? (language === 'ar' ? 'جاري تحميل الحساب' : 'Loading account') : (language === 'ar' ? 'زائر' : 'Guest'));
  const initials = displayName.slice(0, 1).toUpperCase();

  const loadStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const response = await apiClient.request<{ rides: Array<{ status: string; fare?: number; rating?: number }> }>('/trips?limit=100');
      const rides = response.data?.rides ?? [];
      const completed = rides.filter(r => r.status === 'completed');
      const totalSpent = completed
        .filter(t => t.fare !== null)
        .reduce((sum, t) => sum + (t.fare ?? 0), 0);

      const ratedTrips = completed.filter(t => (t as { rating?: number }).rating !== null);
      const ratings = ratedTrips.map(t => (t as unknown as { rating: number }).rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      setStats({
        totalTrips: rides.length,
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

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const response = await apiClient.request<{
        full_name?: string;
        phone_number?: string;
        avatar_url?: string;
      }>('/profile/me');
      if (response.data) {
        setName(response.data.full_name ?? displayName);
        setPhone(response.data.phone_number ?? '');
        setAvatar(response.data.avatar_url ?? null);
      }
    } catch {
      // non-fatal
    }
  }, [user, displayName]);

  useEffect(() => {
    void loadStats();
    void loadProfile();
  }, [loadStats, loadProfile]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const response = await apiClient.request(`/profile/${user.id}`, {
        method: 'PATCH',
        body: {
          full_name: name.trim(),
          phone_number: phone.trim(),
          ...(avatar ? { avatar_url: avatar } : {}),
        },
      });
      if (response.error) throw new Error(response.error);
      setEditing(false);
      Alert.alert(language === 'ar' ? 'تم الحفظ' : 'Saved', t('profile.saved'));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert(language === 'ar' ? 'خطأ' : 'Error', t('profile.saveError'), [{ text: t('profile.cancel') }]);
    } finally {
      setSaving(false);
    }
  }, [user, name, phone, avatar, language, t]);

  const handlePickAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(language === 'ar' ? 'تنبيه' : 'Notice', language === 'ar' ? 'نحتاج صلاحية الوصول للصور' : 'We need photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatar(result.assets[0].uri);
    }
  }, [language]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatar(null);
  }, []);

  return (
    <ScreenShell
      footer={
        queueSize > 0 ? (
          <PrimaryButton
            icon="sync"
            label={isOnline ? (language === 'ar' ? 'زامن الإجراءات المعلقة' : 'Sync pending actions') : (language === 'ar' ? 'بانتظار الشبكة' : 'Waiting for network')}
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
            <TouchableOpacity onPress={editing ? handlePickAvatar : undefined} disabled={!editing}>
              <View style={styles.avatar}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                {editing ? (
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarBadgeText}>{t('profile.changePhoto')}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            <StatusPill
              label={user ? (language === 'ar' ? 'جلسة موثقة' : 'Verified session') : (language === 'ar' ? 'وضع الزائر' : 'Guest mode')}
              tone={user ? colors.green : colors.amber}
              icon={user ? 'shield-checkmark' : 'person'}
            />
          </View>

          {editing ? (
            <View style={styles.editStack}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('profile.nameLabel')}
                style={styles.input}
                placeholderTextColor={colors.muted}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={t('profile.phoneLabel')}
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor={colors.muted}
              />
              {avatar ? (
                <PrimaryButton label={t('profile.removePhoto')} variant="outline" tone={colors.red} onPress={handleRemoveAvatar} />
              ) : (
                <PrimaryButton label={t('profile.changePhoto')} variant="outline" tone={colors.cyan} onPress={handlePickAvatar} />
              )}
              <View style={styles.editActions}>
                <PrimaryButton label={t('profile.save')} tone={colors.teal} loading={saving} onPress={handleSave} />
                <PrimaryButton label={t('profile.cancel')} variant="outline" tone={colors.muted} onPress={() => setEditing(false)} />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.profileName}>{displayName}</Text>
              {user?.email && user?.user_metadata?.name ? (
                <Text style={styles.profileEmail}>{user.email}</Text>
              ) : null}
              <Text style={styles.profileMeta}>{t('profile.trustBody')}</Text>
              <PrimaryButton
                label={t('profile.edit')}
                variant="outline"
                tone={colors.cyan}
                onPress={() => setEditing(true)}
                testID="profile-edit-button"
              />
            </>
          )}
        </PremiumPanel>

        {/* Live stats from ride history */}
        {statsLoading ? (
          <StateNotice
            icon="stats-chart"
            title={language === 'ar' ? 'جاري تحميل إحصاءاتك' : 'Loading your stats'}
            body={language === 'ar' ? 'بنحمّل سجل المشاوير ومقاييس الحساب...' : 'Loading your ride history and account metrics...'}
            loading
            tone={colors.blue}
          />
        ) : (
          <View style={styles.metrics}>
            <MetricTile
              label={t('profile.stats.trips')}
              value={stats ? String(stats.totalTrips) : user ? '…' : '—'}
              tone={colors.teal}
            />
            <MetricTile
              label={t('profile.stats.completed')}
              value={stats ? String(stats.completedTrips) : user ? '…' : '—'}
              tone={colors.green}
            />
            <MetricTile
              label={t('profile.stats.rating')}
              value={stats?.averageRating ? stats.averageRating.toFixed(1) : user ? '…' : '—'}
              tone={colors.gold}
            />
          </View>
        )}

        <View style={styles.metrics}>
          <MetricTile label={t('profile.storage')} value={`${cacheSize}`} tone={colors.blue} />
          <MetricTile label={t('profile.queue')} value={`${queueSize}`} tone={queueSize ? colors.amber : colors.teal} />
          <MetricTile label={t('profile.network')} value={isOnline ? t('profile.online') : t('profile.offline')} tone={isOnline ? colors.green : colors.amber} />
        </View>

        {loading ? (
          <StateNotice
            icon="person-circle"
            title={t('profile.loading')}
            body={language === 'ar' ? 'بنرجّع حالة الجلسة من التطبيق.' : 'Restoring session state from the app.'}
            loading
            tone={colors.blue}
          />
        ) : null}

        {!user ? (
          <StateNotice
            icon="person"
            title={t('profile.guestTitle')}
            body={t('profile.guestBody')}
            tone={colors.amber}
            testID="profile-guest-state"
          />
        ) : null}

        <SectionHeader
          eyebrow={language === 'ar' ? 'الأمان' : 'Security'}
          title={t('profile.trustTitle')}
          body={t('profile.trustBody')}
        />

        <InfoCard
          icon="notifications"
          title={t('profile.notificationsReady')}
          body={t('profile.notificationsBody')}
          tone={colors.blue}
        />
        <InfoCard
          icon="lock-closed"
          title={t('profile.secureSession')}
          body={t('profile.secureSessionBody')}
          tone={colors.green}
        />

        <View style={styles.actions}>
          <ActionRow icon="shield-checkmark" label={t('trustCenter.title')} onPress={() => {}} />
          <ActionRow icon="trash" label={t('profile.actions.clearCache')} value={`${cacheSize}`} onPress={clearCache} />
          <ActionRow icon="archive" label={t('profile.actions.clearQueue')} value={`${queueSize}`} onPress={clearQueue} />
          <ActionRow icon="refresh" label={t('profile.actions.refreshStats')} onPress={loadStats} />
          {user ? <ActionRow destructive icon="log-out" label={t('profile.actions.signOut')} onPress={signOut} /> : null}
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
    position: 'relative',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    resizeMode: 'cover',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: colors.navy,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  avatarBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: spacing.lg,
  },
  profileEmail: {
    color: 'rgba(196,220,238,0.68)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  profileMeta: {
    color: 'rgba(196,220,238,0.86)',
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
  editStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default ProfileScreen;
