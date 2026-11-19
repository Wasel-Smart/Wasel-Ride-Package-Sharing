import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  InfoCard,
  PremiumPanel,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
  PrimaryButton,
} from '../components/MobilePrimitives';
import { RideCard, type RideCardProps } from '../components/domain/RideCard';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { rideLifecycle, type AvailableTrip } from '../services/ride';
import { apiClient } from '../lib/api';
import { colors, spacing, radii, typography, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Helper for dynamic time-based greeting
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'صباح الخير،';
  } else if (hour >= 12 && hour < 18) {
    return 'مساء الخير،';
  } else {
    return 'مساء الخير،';
  }
};

// --- Skeleton Loader ---
const HomeSkeleton = React.memo(() => (
  <View style={styles.skeletonContainer} accessible accessibilityLabel="جارٍ تحميل الشاشة الرئيسية">
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonTextBlock}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineLong} />
      </View>
    </View>
    <View style={styles.skeletonCard} />
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonCardSmall} />
      <View style={styles.skeletonCardSmall} />
      <View style={styles.skeletonCardSmall} />
    </View>
    <View style={styles.skeletonCard} />
    <View style={styles.skeletonCard} />
    <ActivityIndicator color={colors.cyan} size="large" style={styles.skeletonLoader} />
  </View>
));

// --- Header with Time-Based Greeting & Trust Score Pill ---
const HomeHeader = React.memo(({
  displayName,
  avatarUrl,
  unreadCount,
  trustScore,
  onNotificationsPress,
  onTrustPress,
}: {
  displayName: string;
  avatarUrl?: string | null;
  unreadCount: number;
  /** null = loading, undefined = unavailable */
  trustScore: number | null | undefined;
  onNotificationsPress: () => void;
  onTrustPress: () => void;
}) => {
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  return (
    <View style={styles.homeHeader}>
      {avatarUrl && !avatarLoadFailed ? (
        <Image
          style={styles.avatar}
          source={{ uri: avatarUrl }}
          onError={() => setAvatarLoadFailed(true)}
          accessible
          accessibilityLabel={`صورة ${displayName}`}
        />
      ) : (
        <View
          style={[styles.avatar, styles.avatarPlaceholder]}
          accessible
          accessibilityLabel={`صورة ${displayName}`}
        >
          <Ionicons name="person" size={24} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.headerText}>
        <Text style={styles.welcomeText}>{greeting}</Text>
        <View style={styles.displayNameRow}>
          <Text style={styles.displayName}>{displayName}</Text>
          <Pressable
            style={styles.trustBadgePill}
            onPress={onTrustPress}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              trustScore != null
                ? `مركز الثقة - موثوق ${trustScore}%`
                : 'مركز الثقة'
            }
          >
            <Ionicons name="shield-checkmark" size={12} color={colors.teal} />
            <Text style={styles.trustBadgeText}>
              {trustScore != null ? `موثوق ${trustScore}%` : 'موثوق'}
            </Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        style={styles.notificationButton}
        onPress={onNotificationsPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={unreadCount > 0 ? `${unreadCount} إشعارات غير مقروءة` : 'الإشعارات'}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {unreadCount > 9 ? '9+' : String(unreadCount)}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
});

// --- Smart Search Hero with Location Swap & Map Overlay ---
const SmartSearch = React.memo(({ onPress }: { onPress: () => void }) => {
  const [swapped, setSwapped] = useState(false);

  const handleSwap = useCallback((e: any) => {
    e.stopPropagation();
    setSwapped(prev => !prev);
  }, []);

  const originText = swapped ? 'ابحث عن وجهة...' : 'موقعي الحالي';
  const destText = swapped ? 'موقعي الحالي' : 'ابحث عن وجهة...';

  return (
    <Pressable
      style={({ pressed }: { pressed: boolean }) => [styles.searchContainer, pressed && styles.searchContainerPressed]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel="ابحث عن وجهة"
    >
      {/* Visual Map Background Preview Overlay (Uber/Careem style) */}
      <View style={styles.mapBackgroundPreview} pointerEvents="none">
        <View style={styles.mapGridLineHorizontal1} />
        <View style={styles.mapGridLineHorizontal2} />
        <View style={styles.mapGridLineVertical} />
        <View style={styles.mapRoutePathLine} />
        <View style={styles.mapPickupDot} />
        <View style={styles.mapDestinationPin}>
          <Ionicons name="location" size={18} color={colors.teal} />
        </View>
      </View>

      <View style={styles.searchCardContent}>
        <SectionHeader eyebrow="ابدأ رحلتك" title="إلى أين تريد أن تذهب؟" tone="dark" />
        <View style={styles.searchInputs}>
          <View style={styles.inputGroup}>
            <View style={styles.inputDotOrigin} />
            <View style={styles.inputTextFields}>
              <Text style={styles.inputLabel}>من</Text>
              <Text style={swapped ? [styles.inputField, styles.inputFieldPlaceholder] : styles.inputField}>
                {originText}
              </Text>
            </View>
          </View>
          
          <View style={styles.inputSeparatorRow}>
            <View style={styles.inputSeparator} />
            <Pressable
              style={styles.swapButton}
              onPress={handleSwap}
              accessible
              accessibilityRole="button"
              accessibilityLabel="تبديل نقطة الانطلاق والوجهة"
            >
              <Ionicons name="swap-vertical" size={16} color={colors.teal} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputDotDestination} />
            <View style={styles.inputTextFields}>
              <Text style={styles.inputLabel}>إلى</Text>
              <Text style={!swapped ? [styles.inputField, styles.inputFieldPlaceholder] : styles.inputField}>
                {destText}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.searchArrow}>
          <Ionicons name="arrow-forward-circle" size={32} color={colors.teal} />
        </View>
      </View>
    </Pressable>
  );
});

// --- Quick Action Card with Micro Badge ---
const QuickActionCard = React.memo(({
  label,
  icon,
  badge,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }: { pressed: boolean }) => [styles.quickAction, pressed && styles.quickActionPressed]}
    onPress={onPress}
    accessible
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {badge && (
      <View style={styles.actionBadgeTag}>
        <Text style={styles.actionBadgeTagText}>{badge}</Text>
      </View>
    )}
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={28} color={colors.primary} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </Pressable>
));

const quickActions: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  screen: keyof RootStackParamList;
}> = [
  { label: 'ابحث عن رحلة', icon: 'search-outline', badge: 'سريع', screen: 'AdvancedSearch' },
  { label: 'أرسل طرد', icon: 'cube-outline', badge: 'تتبع 24/7', screen: 'Packages' },
  { label: 'اعرض رحلة', icon: 'add-circle-outline', screen: 'Driver' },
];

// --- Recommended Ride section with Live Demand Scarcity Tag ---
const RecommendedRideSection = React.memo(({
  trip,
  onReserve,
}: {
  trip: AvailableTrip | null;
  onReserve: () => void;
}) => {
  if (!trip) return null;

  const rideCardProps: RideCardProps = {
    driver: {
      name: trip.driver.name,
      rating: trip.driver.rating,
      isVerified: trip.driver.verified,
    },
    trip: {
      from: trip.from,
      to: trip.to,
      departureTime: trip.time,
      availableSeats: trip.seats,
    },
    onReserve,
  };

  return (
    <View style={styles.recommendationSection}>
      <View style={styles.recommendationHeaderRow}>
        <View style={styles.recommendationHeaderText}>
          <SectionHeader
            eyebrow="اقتراح ذكي"
            title="أفضل خيار لك الآن"
            body="احجز الآن على هذا المسار قبل امتلاء المقاعد."
          />
        </View>
        <View style={styles.urgencyBadgePill}>
          <Ionicons name="flame" size={12} color="#ff6b6b" />
          <Text style={styles.urgencyBadgeText}>طلب مرتفع</Text>
        </View>
      </View>
      <RideCard {...rideCardProps} />
    </View>
  );
});

// --- Main Screen ---

const HomeScreen = React.memo(() => {
  const { user, loading } = useAuth();
  const { isOnline } = useOffline();
  const navigation = useNavigation<NavProp>();
  const [recommendedTrip, setRecommendedTrip] = useState<AvailableTrip | null>(null);
  const [trustScore, setTrustScore] = useState<number | null | undefined>(null);

  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || 'صديق',
    [user?.email, user?.user_metadata?.name],
  );

  // Load a recommended trip from the API on mount
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    rideLifecycle.searchTrips('عمّان', 'العقبة', 1)
      .then(trips => {
        if (!cancelled && trips.length > 0) setRecommendedTrip(trips[0]);
      })
      .catch(() => { /* Silent fallback if offline or backend missing */ });
    return () => { cancelled = true; };
  }, [isOnline]);

  // Fetch real trust score from the backend.
  useEffect(() => {
    if (!user?.id || !isOnline) {
      setTrustScore(undefined);
      return;
    }
    let cancelled = false;
    apiClient.get<{ completedSteps: number; totalSteps: number }>('trust/status')
      .then(res => {
        if (cancelled) return;
        if (res.data && res.data.totalSteps > 0) {
          setTrustScore(Math.round((res.data.completedSteps / res.data.totalSteps) * 100));
        } else {
          setTrustScore(undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setTrustScore(undefined);
      });
    return () => { cancelled = true; };
  }, [user?.id, isOnline]);

  const handleReserveRecommended = useCallback(() => {
    navigation.navigate('AdvancedSearch');
  }, [navigation]);

  const handleNotificationsPress = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const handleTrustPress = useCallback(() => {
    navigation.navigate('TrustCenter');
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('AdvancedSearch');
  }, [navigation]);

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <ScreenShell testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header with Time-Based Greeting & Trust Badge */}
        <HomeHeader
          displayName={displayName}
          avatarUrl={user?.user_metadata?.avatar_url}
          unreadCount={0}
          trustScore={trustScore}
          onNotificationsPress={handleNotificationsPress}
          onTrustPress={handleTrustPress}
        />

        {/* Smart Search with Location Swap & Map Overlay */}
        <SmartSearch onPress={handleSearchPress} />

        {/* Quick Actions with Micro Badges */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map(action => (
            <QuickActionCard
              key={action.screen}
              label={action.label}
              icon={action.icon}
              badge={action.badge}
              onPress={() => navigation.navigate(action.screen)}
            />
          ))}
        </View>

        {/* AI Route Recommendation */}
        <RecommendedRideSection
          trip={recommendedTrip}
          onReserve={handleReserveRecommended}
        />

        {/* Services Section */}
        <SectionHeader
          eyebrow="خدمات واصل"
          title="كل ما تحتاجه للتنقل والتوصيل"
          body="خدمات واضحة وآمنة ومصممة للاستخدام اليومي."
        />

        <View style={styles.infoCardsContainer}>
          <InfoCard
            icon="car-sport"
            title="مشاوير موثوقة"
            body="اعثر على مشوار مناسب، راجع تفاصيل السائق، وتابع الرحلة حتى الوصول."
            tone={colors.teal}
          />
          <InfoCard
            icon="cube"
            title="توصيل طرود مع تتبع"
            body="أنشئ طلب توصيل واحتفظ بحالة الطرد وملاحظاته وسجل الاستلام والتسليم."
            tone={colors.blue}
          />
          <InfoCard
            icon="git-network"
            title="شبكة وخطوط مشتركة"
            body="استعرض الخطوط والمجموعات النشطة للوصول إلى خيارات نقل أكثر."
            tone={colors.green}
          />
          <InfoCard
            icon="shield-checkmark"
            title="الأمان أولاً"
            body="الوصول السريع لمركز الأمان، مشاركة الرحلة، ومعلومات الحساب الموثوقة."
            tone={colors.lilac}
            style={styles.lastCard}
          />
        </View>

        <PrimaryButton
          label="افتح مركز الأمان"
          icon="shield-checkmark"
          tone={colors.navy}
          onPress={() => navigation.navigate('Safety')}
          testID="home-safety-center"
        />
      </ScrollView>
    </ScreenShell>
  );
});

const SKELETON_BG = colors.surfaceElevated ?? '#2a2a2a';

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // Header
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  displayName: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  trustBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.teal,
  },
  notificationButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: spacing.sm - 2,
    right: spacing.sm - 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },

  // Search Container & Map Background Preview
  searchContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.lift,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchContainerPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  mapBackgroundPreview: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    backgroundColor: '#1b2a38',
  },
  mapGridLineHorizontal1: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.teal,
  },
  mapGridLineHorizontal2: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.textMuted,
  },
  mapGridLineVertical: {
    position: 'absolute',
    left: '25%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.teal,
  },
  mapRoutePathLine: {
    position: 'absolute',
    left: '25%',
    top: '30%',
    width: '50%',
    height: 3,
    backgroundColor: colors.cyan,
    borderRadius: radii.pill,
    transform: [{ rotate: '-12deg' }],
  },
  mapPickupDot: {
    position: 'absolute',
    left: '23%',
    top: '28%',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapDestinationPin: {
    position: 'absolute',
    right: '25%',
    top: '20%',
  },
  searchCardContent: {
    zIndex: 1,
  },

  // Search Inputs & Swap
  searchInputs: {
    marginTop: spacing.lg,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  inputDotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  inputDotDestination: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  inputTextFields: {
    flex: 1,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 2,
  },
  inputField: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputFieldPlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  inputSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  inputSeparator: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  swapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginHorizontal: spacing.xs,
  },
  searchArrow: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },

  // Quick actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  quickActionPressed: {
    backgroundColor: colors.surfaceElevated,
    transform: [{ scale: 0.98 }],
  },
  actionBadgeTag: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  actionBadgeTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Recommendation
  recommendationSection: {
    gap: spacing.md,
  },
  recommendationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recommendationHeaderText: {
    flex: 1,
  },
  urgencyBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginTop: 4,
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff6b6b',
  },

  // Info cards
  infoCardsContainer: {
    gap: spacing.md,
  },
  lastCard: { marginBottom: spacing.xs },

  // Skeleton
  skeletonContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xl,
    backgroundColor: colors.bg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: SKELETON_BG,
  },
  skeletonTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonLineShort: {
    height: 12,
    width: '40%',
    borderRadius: radii.sm,
    backgroundColor: SKELETON_BG,
  },
  skeletonLineLong: {
    height: 16,
    width: '70%',
    borderRadius: radii.sm,
    backgroundColor: SKELETON_BG,
  },
  skeletonCard: {
    height: 120,
    borderRadius: radii.xl,
    backgroundColor: SKELETON_BG,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonCardSmall: {
    flex: 1,
    height: 80,
    borderRadius: radii.lg,
    backgroundColor: SKELETON_BG,
  },
  skeletonLoader: {
    marginTop: spacing.xl,
  },
});

export default HomeScreen;
