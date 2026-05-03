import { useMemo, useState } from 'react';
import { Bus, Car, CheckCircle, Package, Search, Shield, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLiveUserStats } from '../../services/liveDataService';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { CurrencyService } from '../../utils/currency';
import {
  C,
  F,
  POPULAR_ROUTES,
} from './HomePageShared';
import {
  CorridorsSection,
  HomeHeroSection,
  HomePageStyles,
  QuickActionsSection,
  SignedInUtilitySection,
  SignedOutCtaSection,
  type CorridorCard,
  type HeadlineStat,
  type ProofPoint,
  type QuickAction,
  type TripMode,
} from './HomePageSections';

export function HomePage() {
  const { language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useIframeSafeNavigate();
  const { stats: liveStats, loading } = useLiveUserStats();
  const [tripMode, setTripMode] = useState<TripMode>('one-way');

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();
  const firstName =
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    '';

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        badge: 'R',
        icon: Search,
        title: ar ? 'ابحث عن رحلة' : 'Find a ride',
        desc: ar
          ? 'ابدأ من المسار وشاهد المقاعد المتاحة بسرعة.'
          : 'Start from the corridor and see available seats fast.',
        color: C.cyan,
        dim: C.cyanDim,
        border: 'rgba(0,200,232,0.25)',
        path: '/find-ride',
      },
      {
        badge: 'O',
        icon: Car,
        title: ar ? 'اعرض رحلتك' : 'Offer a ride',
        desc: ar
          ? 'شارك المقاعد وخفف تكلفة المشوار بوضوح.'
          : 'Open seats and lower the trip cost clearly.',
        color: C.gold,
        dim: C.goldDim,
        border: 'rgba(240,168,48,0.25)',
        path: '/offer-ride',
      },
      {
        badge: 'P',
        icon: Package,
        title: ar ? 'أرسل طرداً' : 'Send a package',
        desc: ar
          ? 'حرّك الطرد على نفس المسار بدون منتج منفصل.'
          : 'Move a parcel on the same corridor without a separate flow.',
        color: '#D9965B',
        dim: 'rgba(217,149,91,0.12)',
        border: 'rgba(217,149,91,0.25)',
        path: '/packages',
      },
      {
        badge: 'B',
        icon: Bus,
        title: ar ? 'احجز باص' : 'Book a bus',
        desc: ar
          ? 'اختر المغادرة المجدولة عندما لا تناسبك المشاركة.'
          : 'Use scheduled departures when shared supply is not the fit.',
        color: C.green,
        dim: C.greenDim,
        border: 'rgba(0,200,117,0.25)',
        path: '/bus',
      },
    ],
    [ar],
  );

  const headlineStats = useMemo<HeadlineStat[]>(
    () => [
      {
        icon: Car,
        label: ar ? 'إجمالي الرحلات' : 'Trips',
        value: liveStats?.totalTrips?.toString() ?? '...',
        accent: C.cyan,
      },
      {
        icon: TrendingUp,
        label: ar ? 'إجمالي التوفير' : 'Savings',
        value: liveStats ? svc.formatFromJOD(liveStats.totalSaved) : '...',
        accent: C.green,
      },
      {
        icon: Star,
        label: ar ? 'التقييم' : 'Rating',
        value: liveStats ? String(liveStats.rating) : '...',
        accent: C.gold,
      },
      {
        icon: Package,
        label: ar ? 'طرود مكتملة' : 'Packages',
        value: liveStats?.pkgsDelivered?.toString() ?? '...',
        accent: C.purple,
      },
    ],
    [ar, liveStats, svc],
  );

  const proofPoints = useMemo<ProofPoint[]>(
    () => [
      {
        icon: Shield,
        title: ar ? 'ثقة قبل الحجز' : 'Trust before booking',
        desc: ar
          ? 'التحقق والتسعير والخطوة التالية كلها ظاهرة قبل القرار.'
          : 'Verification, pricing, and the next step stay visible before commitment.',
      },
      {
        icon: CheckCircle,
        title: ar ? 'منتج واحد لا أربعة' : 'One product, not four',
        desc: ar
          ? 'الرحلات والطرود والباصات تبدأ من نفس منطق المسار.'
          : 'Rides, parcels, and buses all begin from the same corridor logic.',
      },
      {
        icon: Bus,
        title: ar ? 'خيار احتياطي واضح' : 'Clear fallback',
        desc: ar
          ? 'عندما لا يوجد تطابق مناسب، يبقى الباص خياراً مفهوماً فوراً.'
          : 'When shared supply is thin, the bus path stays obvious.',
      },
    ],
    [ar],
  );

  const corridorCards = useMemo<CorridorCard[]>(() => {
    const leaders = getCorridorDemandLeaders().slice(0, 3);
    if (leaders.length > 0) {
      return leaders.map((item) => ({
        key: item.corridor,
        title: item.corridor,
        detail: item.serviceLabel,
        meta: `${item.active} ${ar ? 'نشط الآن' : 'active now'}`,
        path: (() => {
          const [from, to] = item.corridor.split(' to ');
          return `/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`;
        })(),
        accent: C.cyan,
      }));
    }

    return POPULAR_ROUTES.slice(0, 3).map((route) => ({
      key: `${route.from}-${route.to}`,
      title: ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`,
      detail: ar
        ? `${route.dist} كم • ${svc.formatFromJOD(route.priceJod)}`
        : `${route.dist} km • ${svc.formatFromJOD(route.priceJod)}`,
      meta: ar ? 'مسار شائع' : 'Popular corridor',
      path: `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`,
      accent: route.color,
    }));
  }, [ar, svc]);

  const trustScore = liveStats
    ? Math.max(78, Math.min(96, Math.round(72 + liveStats.totalTrips / 5 + liveStats.rating * 2)))
    : 87;

  const primaryTripPath =
    tripMode === 'round' ? '/find-ride?mode=round' : '/find-ride';

  return (
    <div
      className="min-h-screen relative"
      dir={dir}
      style={{ background: C.bg, color: C.text, fontFamily: F }}
    >
      <HomePageStyles />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 16% 16%, rgba(0,200,232,0.09), transparent 24%), radial-gradient(circle at 82% 18%, rgba(240,168,48,0.08), transparent 20%), radial-gradient(circle at 72% 76%, rgba(0,200,117,0.08), transparent 22%)',
        }}
      />

      <div
        className="relative z-10 mx-auto px-4 py-8"
        style={{ maxWidth: 1140 }}
      >
        <HomeHeroSection
          ar={ar}
          user={user}
          firstName={firstName}
          tripMode={tripMode}
          onTripModeChange={setTripMode}
          onNavigate={navigate}
          primaryTripPath={primaryTripPath}
          headlineStats={headlineStats}
          proofPoints={proofPoints}
          loading={loading}
        />

        <QuickActionsSection
          ar={ar}
          quickActions={quickActions}
          onNavigate={navigate}
        />

        <CorridorsSection
          ar={ar}
          corridorCards={corridorCards}
          onNavigate={navigate}
        />

        {user ? (
          <SignedInUtilitySection
            ar={ar}
            loading={loading}
            walletBalance={svc.formatFromJOD(liveStats?.walletBalance ?? 0)}
            trustScore={trustScore}
          />
        ) : (
          <SignedOutCtaSection
            ar={ar}
            onNavigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

export default HomePage;
