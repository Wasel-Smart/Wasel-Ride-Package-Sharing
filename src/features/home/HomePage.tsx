import { useEffect, useMemo, useState } from 'react';
import { Bus, Calendar, Car, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLiveUserStats } from '../../services/liveDataService';
import { buildCorridorBetaPlan } from '../../services/corridorBeta';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { CurrencyService } from '../../utils/currency';
import { trackUserAction } from '../../utils/monitoring';
import { WaselErrorBoundary } from '../../components/ErrorBoundary';
import { ActiveTripsBanner } from '../../components/TripProgressCard';
import { C, F, POPULAR_ROUTES } from './HomePageShared';
import {
  CorridorsSection,
  CorridorBetaFocusSection,
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
  const { language, dir, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useIframeSafeNavigate();
  const { stats: liveStats, loading } = useLiveUserStats();
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [cookieConsented, setCookieConsented] = useState(false);
  const [cookieDeclined, setCookieDeclined] = useState(false);

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  useEffect(() => {
    const savedCookieConsent = localStorage.getItem('wasel-cookie-consent');
    if (savedCookieConsent) {
      setCookieConsented(true);
    }

    const detectedLang = detectBrowserLanguage();
    if (!savedCookieConsent && detectedLang && detectedLang !== language) {
      setLanguage(detectedLang);
    }
  }, [language, setLanguage]);

  const detectBrowserLanguage = (): string | null => {
    if (typeof navigator === 'undefined') return null;
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'ar' || browserLang === 'en') {
      return browserLang;
    }
    return null;
  };

  const acceptCookies = () => {
    localStorage.setItem('wasel-cookie-consent', 'accepted');
    setCookieConsented(true);
  };

  const declineCookies = () => {
    localStorage.setItem('wasel-cookie-consent', 'declined');
    setCookieDeclined(true);
    setCookieConsented(true); // hide banner
  };

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
      {
        icon: Calendar,
        kicker: ar ? 'مسبقاً' : 'Plan ahead',
        title: ar ? 'جدولة' : 'Schedule rides & pickups',
        desc: ar
          ? 'خطط لرحلاتك وتوصيلاتك مسبقاً مع تذكيرات ذكية.'
          : 'Pre-book rides and deliveries with smart reminders.',
        outcome: ar
          ? 'لا تفوت رحلة أو توصيل بعد اليوم'
          : 'Never miss a ride or delivery again',
        color: C.blue,
        dim: C.blueDim,
        border: C.blueDim,
        path: '/schedule',
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

  const corridorBetaPlan = useMemo(() => buildCorridorBetaPlan(), []);

  const trustScore = liveStats
    ? Math.max(78, Math.min(96, Math.round(72 + liveStats.totalTrips / 5 + liveStats.rating * 2)))
    : 87;

  const primaryTripPath = tripMode === 'round' ? '/find-ride?mode=round' : '/find-ride';

return (
    <WaselErrorBoundary>
      <div className="wasel-home-shell" dir={dir} style={{ color: C.text, fontFamily: F }}>
        <HomePageStyles />

        {/* Cookie banner — bottom position, non-blocking */}
        {!cookieConsented && !cookieDeclined && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(6,17,27,0.97)',
              color: '#fff',
              padding: '14px 20px calc(14px + env(safe-area-inset-bottom))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              zIndex: 200,
              flexWrap: 'wrap',
              borderTop: `1px solid rgba(88,221,255,0.14)`,
              backdropFilter: 'blur(16px)',
            }}
            role="dialog"
            aria-label={ar ? 'إشعار ملفات تعريف الارتباط' : 'Cookie consent'}
          >
            <span style={{ fontSize: '0.84rem', fontFamily: F, flex: 1, minWidth: 200, lineHeight: 1.5 }}>
              {ar
                ? 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك.'
                : 'We use cookies to improve your experience.'}{' '}
              <a href="/app/privacy" style={{ color: C.cyan, textDecoration: 'underline', fontSize: '0.8rem' }}>
                {ar ? 'سياسة الخصوصية' : 'Privacy policy'}
              </a>
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={declineCookies}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  color: '#aaa',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontWeight: 600,
                  fontFamily: F,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {ar ? 'رفض' : 'Decline'}
              </button>
              <button
                onClick={acceptCookies}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: C.cyan,
                  color: '#000',
                  border: 'none',
                  fontWeight: 800,
                  fontFamily: F,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {ar ? 'قبول' : 'Accept'}
              </button>
            </div>
          </div>
        )}

        {/* Sticky mobile CTA */}
        <div className="wasel-home-sticky-cta">
          <button
            onClick={() => handleNavigate(primaryTripPath, 'sticky_find')}
            style={{
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: C.cyan,
              color: '#000',
              fontWeight: 800,
              fontFamily: F,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {ar ? 'ابحث عن رحلة' : 'Find a ride'}
          </button>
          <button
            onClick={() => handleNavigate('/offer-ride', 'sticky_offer')}
            style={{
              height: 48,
              borderRadius: 12,
              border: `1px solid rgba(255,255,255,0.15)`,
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 700,
              fontFamily: F,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {ar ? 'اعرض مقاعد' : 'Offer seats'}
          </button>
        </div>

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

          {/* Proof section only for signed-out users; signed-in users see active trips instead */}
          {!user && <ProofSection ar={ar} onNavigate={handleNavigate} />}

          {user && <ActiveTripsBanner onNavigate={handleNavigate} />}

          <QuickActionsSection ar={ar} quickActions={quickActions} onNavigate={handleNavigate} />

          {/* Show onboarding demo only for new/signed-out users */}
          {!user && <OnboardingDemoSection ar={ar} onNavigate={handleNavigate} />}

          <CorridorBetaFocusSection
            ar={ar}
            plan={corridorBetaPlan}
            onNavigate={handleNavigate}
          />

          {/* Single corridor section — OutcomesSection removed to eliminate redundancy */}
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
    </WaselErrorBoundary>
  );
}

export default HomePage;
