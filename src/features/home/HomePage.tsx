import { useMemo, useState } from 'react';
import { Bus, Car, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLiveUserStats } from '../../services/liveDataService';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { CurrencyService } from '../../utils/currency';
import { C, F, POPULAR_ROUTES } from './HomePageShared';
import {
  CorridorsSection,
  HomeHeroSection,
  HomePageStyles,
  QuickActionsSection,
  SignedInUtilitySection,
  SignedOutCtaSection,
  type CorridorCard,
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
  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        icon: Search,
        kicker: ar ? 'للحجز السريع' : 'For immediate booking',
        title: ar ? 'ابحث عن رحلة' : 'Find a ride',
        desc: ar
          ? 'ابدأ من المسار وشاهد المقاعد المتاحة والسعر بوضوح قبل الحجز.'
          : 'Start from the corridor and compare available seats before you commit.',
        outcome: ar
          ? 'عرض حي للمقاعد والأسعار على نفس المسار'
          : 'Live seat supply and price on the same corridor',
        color: C.cyan,
        dim: C.cyanDim,
        border: 'rgba(88,221,255,0.24)',
        path: '/find-ride',
      },
      {
        icon: Car,
        kicker: ar ? 'للسائقين' : 'For drivers',
        title: ar ? 'اعرض رحلتك' : 'Offer a ride',
        desc: ar
          ? 'افتح المقاعد الفارغة وخفف تكلفة المشوار من نفس واجهة الحركة.'
          : 'Open empty seats and offset trip cost from the same mobility surface.',
        outcome: ar
          ? 'إدارة المقاعد والسعر والوضوح من شاشة واحدة'
          : 'Manage seat supply, pricing, and clarity in one flow',
        color: C.gold,
        dim: C.goldDim,
        border: 'rgba(255,190,92,0.24)',
        path: '/offer-ride',
      },
      {
        icon: Package,
        kicker: ar ? 'للطرود' : 'For parcels',
        title: ar ? 'أرسل طرداً' : 'Send a package',
        desc: ar
          ? 'حرّك الطرد على نفس المسار بدون منتج منفصل أو منطق مختلف.'
          : 'Move a parcel on the same corridor without a separate product logic.',
        outcome: ar
          ? 'تتبع واضح وتسليم ضمن شبكة الرحلات نفسها'
          : 'Clear tracking inside the same route network',
        color: '#D9965B',
        dim: 'rgba(217,149,91,0.12)',
        border: 'rgba(217,149,91,0.24)',
        path: '/packages',
      },
      {
        icon: Bus,
        kicker: ar ? 'الخيار الاحتياطي' : 'The fallback',
        title: ar ? 'احجز باص' : 'Book a bus',
        desc: ar
          ? 'اختر المغادرة المجدولة عندما لا تكون المشاركة هي الخيار الأنسب.'
          : 'Use scheduled departures when shared supply is not the right fit.',
        outcome: ar
          ? 'استمر في الحركة حتى عندما يضعف العرض المشترك'
          : 'Keep moving even when shared supply is thin',
        color: C.green,
        dim: C.greenDim,
        border: 'rgba(71,214,158,0.24)',
        path: '/bus',
      },
    ],
    [ar],
  );

  const corridorCards = useMemo<CorridorCard[]>(() => {
    const leaders = getCorridorDemandLeaders().slice(0, 3);
    if (leaders.length > 0) {
      return leaders.map((item, index) => ({
        key: item.corridor,
        title: item.corridor,
        detail: item.serviceLabel,
        meta: `${item.active} ${ar ? 'نشط الآن' : 'active now'}`,
        insight:
          index === 0
            ? ar
              ? 'أفضل توازن بين العرض والطلب اليوم'
              : 'Best balance of supply and demand today'
            : ar
              ? 'حركة واضحة على هذا المسار الآن'
              : 'Visible live movement on this corridor',
        featured: index === 0,
        path: (() => {
          const [from, to] = item.corridor.split(' to ');
          return `/find-ride?from=${encodeURIComponent(from ?? '')}&to=${encodeURIComponent(to ?? '')}&search=1`;
        })(),
        accent: C.cyan,
      }));
    }

    return POPULAR_ROUTES.slice(0, 3).map((route, index) => ({
      key: `${route.from}-${route.to}`,
      title: ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`,
      detail: ar
        ? `${route.dist} كم • ${svc.formatFromJOD(route.priceJod)}`
        : `${route.dist} km • ${svc.formatFromJOD(route.priceJod)}`,
      meta: ar ? 'مسار شائع' : 'Popular corridor',
      insight:
        index === 0
          ? ar
            ? 'خيار متوازن للسعر وطول المسار'
            : 'Balanced pick for price and distance'
          : ar
            ? 'جاهز للمقارنة والبحث الفوري'
            : 'Ready for quick comparison and search',
      featured: index === 0,
      path: `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`,
      accent: route.color,
    }));
  }, [ar, svc]);

  const trustScore = liveStats
    ? Math.max(78, Math.min(96, Math.round(72 + liveStats.totalTrips / 5 + liveStats.rating * 2)))
    : 87;

  const primaryTripPath = tripMode === 'round' ? '/find-ride?mode=round' : '/find-ride';

  return (
    <div
      className="min-h-[var(--app-min-height)] relative"
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
            'radial-gradient(circle at 14% 14%, rgba(88,221,255,0.12), transparent 24%), radial-gradient(circle at 84% 20%, rgba(255,190,92,0.08), transparent 18%), radial-gradient(circle at 72% 78%, rgba(71,214,158,0.09), transparent 22%)',
        }}
      />

      <div className="relative z-10 mx-auto px-4 py-8" style={{ maxWidth: 1140 }}>
        <HomeHeroSection
          ar={ar}
          user={user}
          firstName={firstName}
          tripMode={tripMode}
          onTripModeChange={setTripMode}
          onNavigate={navigate}
          primaryTripPath={primaryTripPath}
        />

        <QuickActionsSection ar={ar} quickActions={quickActions} onNavigate={navigate} />

        <CorridorsSection ar={ar} corridorCards={corridorCards} onNavigate={navigate} />

        {user ? (
          <SignedInUtilitySection
            ar={ar}
            loading={loading}
            walletBalance={svc.formatFromJOD(liveStats?.walletBalance ?? 0)}
            trustScore={trustScore}
          />
        ) : (
          <SignedOutCtaSection ar={ar} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

export default HomePage;
