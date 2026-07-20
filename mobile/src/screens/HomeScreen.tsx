import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing } from '../theme';

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
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const quickActions: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: keyof RootStackParamList;
  tone: string;
}> = [
  { label: 'ابحث عن مشوار', icon: 'search', screen: 'AdvancedSearch', tone: colors.teal },
  { label: 'جدول مشوار', icon: 'calendar', screen: 'ScheduledRide', tone: colors.blue },
  { label: 'افتح الخريطة', icon: 'map', screen: 'Map', tone: colors.green },
  { label: 'مشاويري السابقة', icon: 'time', screen: 'Trips', tone: colors.lilac },
];

const HomeScreen = React.memo(function HomeScreen() {
  const { user } = useAuth();
  const { isOnline, queueSize } = useOffline();
  const navigation = useNavigation<NavProp>();

  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || 'صديقنا',
    [user?.email, user?.user_metadata?.name],
  );

  return (
    <ScreenShell testID="home-screen">
      <ScrollView
        accessibilityLabel="الصفحة الرئيسية"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'متصل' : 'بدون إنترنت'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label={queueSize ? `${queueSize} عملية بانتظار المزامنة` : 'كل شيء متزامن'}
            tone={queueSize ? colors.amber : colors.teal}
            icon={queueSize ? 'time' : 'checkmark-circle'}
          />
        </View>

        <PremiumPanel tone="dark" testID="customer-home-hero">
          <SectionHeader
            eyebrow="واصل معك بكل طريق"
            title={`أهلاً، ${displayName}`}
            body="احجز مشوارك، أرسل طردك، وتابع كل خطوة من مكان واحد."
            tone="dark"
          />
          <View style={styles.heroActions}>
            <PrimaryButton
              label="ابدأ مشواراً"
              icon="car"
              tone={colors.teal}
              onPress={() => navigation.navigate('AdvancedSearch')}
              testID="home-start-ride"
            />
            <PrimaryButton
              label="استعرض الخريطة"
              icon="map"
              tone={colors.blue}
              onPress={() => navigation.navigate('Map')}
              testID="home-open-map"
            />
          </View>
        </PremiumPanel>

        {!isOnline ? (
          <StateNotice
            icon="cloud-offline"
            title="أنت الآن في الوضع غير المتصل"
            body="يمكنك متابعة البيانات المحفوظة، وسنزامن عملياتك تلقائياً عند عودة الشبكة."
            tone={colors.amber}
            testID="home-offline-state"
          />
        ) : null}

        <SectionHeader
          eyebrow="وصول سريع"
          title="ماذا تريد أن تفعل؟"
          body="اختر الإجراء المناسب وسنأخذك مباشرة إلى الخطوة التالية."
        />

        <View style={styles.actionsGrid}>
          {quickActions.map(action => (
            <View key={action.screen} style={styles.actionItem}>
              <PrimaryButton
                label={action.label}
                icon={action.icon}
                tone={action.tone}
                onPress={() => navigation.navigate(action.screen)}
                testID={`quick-action-${action.screen.toLowerCase()}`}
              />
            </View>
          ))}
        </View>

        <SectionHeader
          eyebrow="خدمات واصل"
          title="كل احتياجات التنقل والتوصيل"
          body="خدمات واضحة وآمنة ومصممة للاستخدام اليومي."
        />

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
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  heroActions: { gap: spacing.sm, marginTop: spacing.lg },
  actionsGrid: { gap: spacing.sm },
  actionItem: { width: '100%' },
  lastCard: { marginBottom: spacing.xs },
});

export default HomeScreen;
