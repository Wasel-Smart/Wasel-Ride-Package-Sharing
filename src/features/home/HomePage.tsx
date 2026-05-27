import { useMemo, useState } from 'react';
import { Bus, Car, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLiveUserStats } from '../../services/liveDataService';
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
        kicker: ar ? 'للحجز الآن' : 'Book now',
        title: ar ? 'ابحث عن رحلة' : 'Find Ride',
        desc: ar
          ? 'احجز مقعداً بين المدن مع سعر واضح وتوفر مباشر قبل التأكيد.'
          : 'Book city-to-city rides with clear seat pricing and live availability.',
        outcome: ar ? 'من 2 د.أ للمقعد حسب المسار' : 'From JOD 2 per seat, route dependent',
        color: C.cyan,
        dim: C.cyanDim,
        border: 'rgba(88,221,255,0.24)',
        path: '/find-ride',
      },
      {
        icon: Car,
        kicker: ar ? 'للسائقين' : 'For drivers',
        title: ar ? 'اعرض رحلة' : 'Offer Ride',
        desc: ar
          ? 'شارك المقاعد الفارغة واربح من رحلتك مع قواعد حجز واضحة.'
          : 'Share empty seats and earn from trips you already plan to take.',
        outcome: ar ? 'تحكم بالمقاعد والسعر والطلبات' : 'Control seats, price, and booking requests',
        color: C.gold,
        dim: C.goldDim,
        border: 'rgba(255,190,92,0.24)',
        path: '/offer-ride',
      },
      {
        icon: Package,
        kicker: ar ? 'للطرود' : 'For parcels',
        title: ar ? 'أرسل طرد' : 'Send Package',
        desc: ar
          ? 'أرسل الطرود بين المدن عبر الرحلات المتاحة مع تتبع واضح.'
          : 'Send parcels between cities through available trips with clear tracking.',
        outcome: ar ? 'سعر حسب الحجم والمسافة' : 'Price depends on size and distance',
        color: '#D9965B',
        dim: 'rgba(217,149,91,0.12)',
        border: 'rgba(217,149,91,0.24)',
        path: '/packages',
      },
      {
        icon: Bus,
        kicker: ar ? 'مواعيد مجدولة' : 'Scheduled trips',
        title: ar ? 'احجز باص' : 'Book Bus',
        desc: ar
          ? 'تصفح مواعيد الباصات عندما تريد خياراً ثابتاً بين المدن.'
          : 'Browse scheduled bus departures when you need a fixed option.',
        outcome: ar ? 'تذاكر واضحة لكل راكب' : 'Clear ticket pricing per passenger',
        color: C.green,
        dim: C.greenDim,
        border: 'rgba(71,214,158,0.24)',
        path: '/bus',
      },
    ],
    [ar],
  );

  const corridorCards = useMemo<CorridorCard[]>(
    () =>
      POPULAR_ROUTES.slice(0, 3).map((route, index) => ({
        key: `${route.from}-${route.to}`,
        title: ar ? `${route.fromAr} إلى ${route.toAr}` : `${route.from} to ${route.to}`,
        detail: ar
          ? `${route.dist} كم · مقعد من ${svc.formatFromJOD(route.priceJod)}`
          : `${route.dist} km · seat from ${svc.formatFromJOD(route.priceJod)}`,
        meta: ar ? 'مسار شائع' : 'Popular route',
        insight:
          index === 0
            ? ar
              ? 'توفر جيد وسعر واضح للمسار اليوم.'
              : 'Good availability and clear pricing on this route today.'
            : ar
              ? 'جاهز للمقارنة والحجز السريع.'
              : 'Ready for quick comparison and booking.',
        featured: index === 0,
        path: `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&search=1`,
        accent: route.color,
      })),
    [ar, svc],
  );

  const trustScore = liveStats
    ? Math.max(78, Math.min(96, Math.round(72 + liveStats.totalTrips / 5 + liveStats.rating * 2)))
    : 87;

  const primaryTripPath = tripMode === 'round' ? '/find-ride?mode=round' : '/find-ride';

  return (
    <div className="min-h-screen relative" dir={dir} style={{ background: C.bg, color: C.text, fontFamily: F }}>
      <HomePageStyles />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(88,221,255,0.08), transparent 260px)',
        }}
      />

      <div className="wasel-home-shell relative z-10 mx-auto">
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
