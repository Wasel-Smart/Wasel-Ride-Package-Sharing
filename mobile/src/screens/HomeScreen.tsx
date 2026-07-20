import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  RoutePreview,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
  PrimaryButton,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { waselMobileConfig } from '../lib/config';
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
  Wallet: undefined;
  Operations: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const readiness = [
  { label: 'الخادم', value: waselMobileConfig.hasSupabase ? 'مباشر' : 'البيئة', ready: waselMobileConfig.hasSupabase },
  { label: 'الدفع', value: waselMobileConfig.hasStripe ? 'جاهز' : 'المفتاح', ready: waselMobileConfig.hasStripe },
  { label: 'الخرائط', value: waselMobileConfig.hasMaps ? 'جاهزة' : 'المفتاح', ready: waselMobileConfig.hasMaps },
  { label: 'الدوال', value: waselMobileConfig.hasFunctions ? 'جاهزة' : 'الرابط', ready: waselMobileConfig.hasFunctions },
] as const;

const readinessRows = [readiness.slice(0, 2), readiness.slice(2, 4)];

const HomeScreen = React.memo(function HomeScreen() {
  const { user, loading } = useAuth();
  const { isOnline, queueSize, cacheSize } = useOffline();
  const navigation = useNavigation<NavProp>();

  const displayName = useMemo(
    () =>
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      (loading ? 'جاري التحميل' : 'زائر'),
    [loading, user?.email, user?.user_metadata?.name],
  );

  const operationalScore = useMemo(() => {
    const readyCount = readiness.filter(item => item.ready).length;
    return `${Math.round((readyCount / readiness.length) * 100)}%`;
  }, []);

  const QUICK_LINKS: Array<{
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    screen: keyof RootStackParamList;
    tone: string;
  }> = [
    { label: 'مشاويري', icon: 'time', screen: 'Trips', tone: colors.teal },
    { label: 'خطوط الباصات', icon: 'bus', screen: 'Bus', tone: colors.blue },
    { label: 'تجهيز السائق', icon: 'car', screen: 'Driver', tone: colors.green },
    { label: 'مركز الأمان', icon: 'shield-checkmark', screen: 'Safety', tone: colors.amber },
    { label: 'الإشعارات', icon: 'notifications', screen: 'Notifications', tone: colors.lilac },
    { label: 'بحث ذكي عن مشوار', icon: 'search', screen: 'AdvancedSearch', tone: colors.cyan },
  ];

  return (
    <ScreenShell testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'الشبكة مباشرة' : 'وضع آمن بدون إنترنت'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label={queueSize ? `${queueSize} بالانتظار` : 'ما في انتظار'}
            tone={queueSize ? colors.amber : colors.teal}
            icon={queueSize ? 'time' : 'checkmark-circle'}
          />
        </View>

        <PremiumPanel tone="dark" testID="mobile-command-center">
          <SectionHeader
            eyebrow="مركز قيادة واصل"
            title={`أهلاً، ${displayName}`}
            body="المشاوير والطرود والشبكات والمحفظة والأمان وتجهيز السائق كلها من هون."
            tone="dark"
          />
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <StatusPill label={operationalScore} tone={colors.cyan} icon="flash" />
            </View>
            <View style={styles.heroStatItem}>
              <StatusPill label={`${cacheSize} محفوظ محلياً`} tone={colors.gold} icon="archive" />
            </View>
          </View>
        </PremiumPanel>

        <RoutePreview from="عمّان" to="العقبة" eta="٣س ٤٢د" distance="٣٣١ كم" />

        {loading ? (
          <StateNotice
            icon="person-circle"
            title="جاري تحميل الحساب"
            body="بنرجّع حالة الجلسة من تخزين التطبيق الآمن."
            loading
            tone={colors.blue}
            testID="home-loading-state"
          />
        ) : !user ? (
          <StateNotice
            icon="shield-checkmark"
            title="مركز تحكم الزائر"
            body="التحقق والتقييمات والدفع الآمن بظهروا بعد تسجيل الدخول."
            tone={colors.amber}
            testID="home-empty-state"
          />
        ) : null}

        {readinessRows.map((row, index) => (
          <View key={index} style={styles.metrics}>
            {row.map(item => (
              <MetricTile
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.ready ? colors.teal : colors.amber}
              />
            ))}
          </View>
        ))}

        <SectionHeader
          eyebrow="وصول سريع"
          title="كل الميزات"
          body="افتح أي قسم من التطبيق مباشرة."
        />

        {QUICK_LINKS.map(link => (
          <PrimaryButton
            key={link.screen}
            label={link.label}
            icon={link.icon}
            tone={link.tone}
            onPress={() => navigation.navigate(link.screen)}
            testID={`quick-link-${link.screen.toLowerCase()}`}
          />
        ))}

        <InfoCard
          icon="car-sport"
          title="سعة مشاركة موثقة"
          body="طلبات الخط بتضل واضحة وموثقة ومتابعة من المطابقة للاستلام والوصول."
          tone={colors.teal}
        />
        <InfoCard
          icon="cube"
          title="طرود بتتبع العهدة"
          body="تسليمات الطرود بتحافظ على الخط والوزن والملاحظات وحالة المزامنة حتى مع ضعف الشبكة."
          tone={colors.blue}
        />
        <InfoCard
          icon="git-network"
          title="الشبكات والخطوط"
          body="استعرض شبكات المشاوير الموثقة وخطوط الشركاء ومجموعات المشغلين على كل الخطوط النشطة."
          tone={colors.green}
        />
        <InfoCard
          icon="shield-checkmark"
          title="طبقة ثقة متقدمة"
          body="حالة الهوية والجلسات الآمنة وجاهزية الدفع واضحة قبل تأكيد أي إجراء."
          tone={colors.lilac}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  heroStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' },
  heroStatItem: { gap: 3 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
});

export default HomeScreen;
