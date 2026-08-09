import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Image, Pressable } from 'react-native';
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
import { colors, spacing, radii, typography, shadows } from '../theme';

type RootStackParamList = {
  Tabs: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
  LiveTracking: { rideId: string };
  Chat: { rideId: string; driverName: string };
  RateRide: { rideId: string; driverName: string };
  AdvancedSearch: undefined;
  SignIn: undefined;
  Map: undefined;
  Networks: undefined;
  Wallet: undefined;
  ScheduledRide: undefined;
  Packages: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// --- Mock Data for AI Recommendation ---
const recommendedRide: RideCardProps = {
  driver: {
    name: 'Yousef Al-Majeed',
    photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    rating: 4.9,
    isVerified: true,
    completedTrips: 214,
    trustScore: 99,
  },
  vehicle: {
    brand: 'Hyundai',
    model: 'Elantra',
    color: 'White',
    plate: '50-12345',
  },
  trip: {
    from: 'Amman',
    to: 'Aqaba',
    distance: '330 km',
    departureTime: '17:30',
    availableSeats: 2,
    packageCapacityKg: 10,
  },
  onReserve: () => console.log('Reserve Recommended Ride'),
};

// --- New Sub-components ---

const HomeHeader = React.memo(({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) => {
  return (
    <View style={styles.homeHeader}>
      <Image
        style={styles.avatar}
        source={{ uri: avatarUrl || 'https://example.com/default-avatar.png' }}
      />
      <View>
        <Text style={styles.welcomeText}>أهلاً بعودتك،</Text>
        <Text style={styles.displayName}>{displayName}</Text>
      </View>
      <Pressable style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
        <View style={styles.notificationBadge} />
      </Pressable>
    </View>
  );
});

const SmartSearch = React.memo(() => {
  return (
    <View style={styles.searchContainer}>
      <SectionHeader
        eyebrow="ابدأ رحلتك"
        title="إلى أين تريد أن تذهب؟"
        tone="dark"
      />
      <View style={styles.searchInputs}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>من</Text>
          <Text style={styles.inputField}>موقعي الحالي</Text>
        </View>
        <View style={styles.inputSeparator} />
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>إلى</Text>
          <Text style={styles.inputField}>ابحث عن وجهة...</Text>
        </View>
      </View>
    </View>
  );
});

const QuickActionCard = React.memo(({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
      onPress={onPress}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
});

const quickActions: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
  tone: string;
}> = [
  { label: 'ابحث عن رحلة', icon: 'search-outline', screen: 'AdvancedSearch', tone: colors.teal },
  { label: 'أرسل طرد', icon: 'cube-outline', screen: 'Packages', tone: colors.blue },
  { label: 'اعرض رحلة', icon: 'add-circle-outline', screen: 'Driver', tone: colors.green },
];

// --- Main Screen ---

const HomeScreen = React.memo(() => {
  const { user, loading } = useAuth();
  const { isOnline, queueSize } = useOffline();
  const navigation = useNavigation<NavProp>();

  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || 'صديقنا',
    [user?.email, user?.user_metadata?.name],
  );

  return (
    <ScreenShell testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Premium Header */}
        <HomeHeader displayName={displayName} avatarUrl={user?.user_metadata?.avatar_url} />

        {/* Smart Search Hero */}
        <SmartSearch />

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map(action => (
            <QuickActionCard
              key={action.screen}
              label={action.label}
              icon={action.icon}
              onPress={() => navigation.navigate(action.screen)}
            />
          ))}
        </View>

        {/* AI Route Recommendation */}
        <View style={styles.recommendationSection}>
          <SectionHeader
            eyebrow="اقتراح ذكي"
            title="أفضل خيار لك الآن"
            body={`الطلب منخفض على هذا المسار. احجز الآن بسعر أفضل.`}
          />
          <RideCard {...recommendedRide} />
        </View>

        {/* Services Section */}
        <SectionHeader
          eyebrow="خدمات واصل"
          title="كل احتياجات التنقل والتوصيل"
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
            title="شبكات وخطوط مشتركة"
            body="استعرض الخطوط والمجموعات النشطة للوصول إلى خيارات تنقل أكثر."
            tone={colors.green}
          />
          <InfoCard
            icon="shield-checkmark"
            title="الأمان أولاً"
            body="الوصول السريع لمركز الأمان، مشاركة الرحلة، ومعلومات الحساب الموثقة."
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

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
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
  },
  welcomeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  displayName: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  notificationButton: {
    marginLeft: 'auto',
    padding: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  searchContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.lift,
  },
  searchInputs: {
    marginTop: spacing.lg,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  inputGroup: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 4,
  },
  inputField: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputSeparator: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: spacing.md,
  },
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
  },
  quickActionPressed: {
    backgroundColor: colors.surfaceElevated,
    transform: [{ scale: 0.98 }],
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
  },
  recommendationSection: {
    gap: spacing.md,
  },
  infoCardsContainer: {
    gap: spacing.md,
  },
  lastCard: { marginBottom: spacing.xs },
});

export default HomeScreen;
