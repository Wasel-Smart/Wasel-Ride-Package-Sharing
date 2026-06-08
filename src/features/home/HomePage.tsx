import { useEffect, useMemo, useState } from 'react';
import { Bus, Car, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLiveUserStats } from '../../services/liveDataService';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { CurrencyService } from '../../utils/currency';
import { trackUserAction } from '../../utils/monitoring';
import { C, F, POPULAR_ROUTES } from './HomePageShared';
import {
  CorridorsSection,
  HomeHeroSection,
  HomePageStyles,
  OnboardingDemoSection,
  OutcomesSection,
  ProofSection,
  QuickActionsSection,
  SignedInUtilitySection,
  SignedOutCtaSection,
  TrustPagesSection,
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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.performance.mark('wasel_home_visible');
    }
    trackUserAction('homepage.view', {
      signedIn: Boolean(user?.id),
      language,
    });
  }, [language, user?.id]);

  const handleNavigate = (path: string, source = 'homepage') => {
    trackUserAction('homepage.cta_click', {
      source,
      path,
      tripMode,
      signedIn: Boolean(user?.id),
    });
    navigate(path);
  };

  const handleTripModeChange = (mode: TripMode) => {
    setTripMode(mode);
    trackUserAction('homepage.trip_mode_select', { mode });
  };

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        icon: Search,
        kicker: ar ? 'للحجز السريع' : 'Find a seat',
        title: ar ? 'ابحث عن رحلة' : 'Book a lower-cost route',
        desc: ar
          ? 'ابدأ من المسار وشاهد المقاعد المتاحة والسعر بوضوح قبل الحجز.'
          : 'Start from the corridor, compare available seats, and keep bus fallback visible.',
        outcome: ar
          ? 'عرض حي للمقاعد والأسعار على نفس المسار'
          : 'Outcome: price clarity before booking',
        color: C.cyan,
        dim: C.cyanDim,
        border: C.borderHov,
        path: '/find-ride',
      },
      {
        icon: Car,
        kicker: ar ? 'للسائقين' : 'Offer seats',
        title: ar ? 'اعرض رحلتك' : 'Turn empty seats into earnings',
        desc: ar
          ? 'افتح المقاعد الفارغة وخفف تكلفة المشوار من نفس واجهة الحركة.'
          : 'Publish a route, review request context, and offset trip cost with trusted riders.',
        outcome: ar
          ? 'إدارة المقاعد والسعر والوضوح من شاشة واحدة'
          : 'Outcome: more value from the same trip',
        color: C.gold,
        dim: C.goldDim,
        border: C.goldDim,
        path: '/offer-ride',
      },
      {
        icon: Package,
        kicker: ar ? 'للطرود' : 'Send a parcel',
        title: ar ? 'أرسل طردا' : 'Attach parcels to trusted movement',
        desc: ar
          ? 'حرك الطرد على نفس المسار بدون منتج منفصل أو منطق مختلف.'
          : 'Match packages to live route supply, then keep pickup proof and support attached.',
        outcome: ar
          ? 'تتبع واضح وتسليم ضمن شبكة الرحلات نفسها'
          : 'Outcome: fewer handoff gaps',
        color: C.orange,
        dim: C.orangeDim,
        border: C.orangeDim,
        path: '/packages',
      },
      {
        icon: Bus,
        kicker: ar ? 'الخيار الاحتياطي' : 'Scheduled fallback',
        title: ar ? 'احجز باص' : 'Use bus when it is the better fit',
        desc: ar
          ? 'اختر المغادرة المجدولة عندما لا تكون المشاركة هي الخيار الأنسب.'
          : 'Compare scheduled departures when shared seats are thin or timing matters more.',
        outcome: ar
          ? 'استمر في الحركة حتى عندما يضعف العرض المشترك'
          : 'Outcome: no dead end when supply is thin',
        color: C.green,
        dim: C.greenDim,
        border: C.greenDim,
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
        ? `${route.dist} كم - ${svc.formatFromJOD(route.priceJod)}`
        : `${route.dist} km - ${svc.formatFromJOD(route.priceJod)}`,
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
    <div className="wasel-home-shell" dir={dir} style={{ color: C.text, fontFamily: F }}>
      <HomePageStyles />

      <div className="wasel-home-container relative z-10">
        <HomeHeroSection
          ar={ar}
          user={user}
          firstName={firstName}
          tripMode={tripMode}
          onTripModeChange={handleTripModeChange}
          onNavigate={handleNavigate}
          primaryTripPath={primaryTripPath}
        />

        <ProofSection ar={ar} onNavigate={handleNavigate} />

        <OnboardingDemoSection ar={ar} onNavigate={handleNavigate} />

        <QuickActionsSection ar={ar} quickActions={quickActions} onNavigate={handleNavigate} />

        <OutcomesSection ar={ar} corridorCards={corridorCards} onNavigate={handleNavigate} />

        <CorridorsSection ar={ar} corridorCards={corridorCards} onNavigate={handleNavigate} />

        <TrustPagesSection ar={ar} onNavigate={handleNavigate} />

        {user ? (
          <SignedInUtilitySection
            ar={ar}
            loading={loading}
            walletBalance={svc.formatFromJOD(liveStats?.walletBalance ?? 0)}
            trustScore={trustScore}
          />
        ) : (
          <SignedOutCtaSection ar={ar} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
}

export default HomePage;
