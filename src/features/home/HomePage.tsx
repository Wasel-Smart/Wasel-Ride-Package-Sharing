import { useEffect, useMemo, useState } from 'react';
import { Search, Car, Package, Bus, Calendar, Route, BarChart3, BadgeCheck, Headphones, Play, ArrowRight, MessageSquareQuote, Star, Globe2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Language } from '../../locales/translations';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLiveUserStats } from '../../services/liveDataService';
import { buildCorridorBetaPlan } from '../../services/corridorBeta';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { CurrencyService } from '../../utils/currency';
import { trackUserAction } from '../../utils/monitoring';
import { API_URL } from '../../services/core';
import { WaselErrorBoundary } from '../../components/ErrorBoundary';
import { ActiveTripsBanner } from '../../components/TripProgressCard';
import { C, F, POPULAR_ROUTES } from './HomePageShared';
import {
  CorridorsSection,
  CorridorBetaFocusSection,
  HomeHeroSection,
  HomePageStyles,
  OnboardingDemoSection,
  ProofSection,
  QuickActionsSection,
  SignedInUtilitySection,
  SignedOutCtaSection,
  TrustPagesSection,
  type CorridorCard,
  type QuickAction,
  type TripMode,
} from './HomePageSections';

interface LiveCorridor {
  id: string;
  from: string;
  to: string;
  priceJod: number;
  demand: number;
  seatsTotal: number;
  seatsBooked: number;
  updatedAt: string;
}

export function HomePage() {
  const { language, dir, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { user: waselUser } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const { stats: liveStats, loading } = useLiveUserStats();
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [cookieConsented, setCookieConsented] = useState(false);
  const [cookieDeclined, setCookieDeclined] = useState(false);
  const [liveCorridors, setLiveCorridors] = useState<LiveCorridor[]>([]);
  const [corridorsLoading, setCorridorsLoading] = useState(true);

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

   const detectBrowserLanguage = (): Language | null => {
     if (typeof navigator === 'undefined') return null;
     const browserLang = navigator.language.split('-')[0];
     if (browserLang === 'ar' || browserLang === 'en') {
       return browserLang;
     }
     return null;
   };

    useEffect(() => {
      const savedCookieConsent = localStorage.getItem('wasel-cookie-consent');
      const savedLanguage = localStorage.getItem('wasel-language');
      if (savedCookieConsent) {
        setCookieConsented(true);
      }

      const detectedLang = detectBrowserLanguage();
      if (!savedCookieConsent && !savedLanguage && detectedLang && detectedLang !== language) {
        setLanguage(detectedLang);
      }
    }, [language, setLanguage]);

   useEffect(() => {
      let cancelled = false;
      const controller = new AbortController();

      async function loadCorridors() {
        setCorridorsLoading(true);
        try {
          const res = await fetch(`${API_URL}/mobility-os/public-snapshot`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error(`snapshot_${res.status}`);
          const data = (await res.json()) as { corridors?: LiveCorridor[] };
          if (!cancelled && Array.isArray(data.corridors)) {
            setLiveCorridors(data.corridors);
          }
        } catch {
          if (!cancelled) setLiveCorridors([]);
        } finally {
          if (!cancelled) setCorridorsLoading(false);
        }
      }

      if (API_URL) {
        void loadCorridors();
      } else {
        setCorridorsLoading(false);
      }

      return () => {
        cancelled = true;
        controller.abort();
      };
    }, [API_URL]);

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
        kicker: t('homeSections.findRideKicker'),
        title: t('homeSections.findRideTitle'),
        desc: t('homeSections.findRideDesc'),
        outcome: t('homeSections.findRideOutcome'),
        color: C.cyan,
        dim: C.cyanDim,
        border: C.borderHov,
        path: '/find-ride',
      },
      {
        icon: Car,
        kicker: t('homeSections.offerRideKicker'),
        title: t('homeSections.offerRideTitle'),
        desc: t('homeSections.offerRideDesc'),
        outcome: t('homeSections.offerRideOutcome'),
        color: C.gold,
        dim: C.goldDim,
        border: C.goldDim,
        path: '/offer-ride',
      },
      {
        icon: Package,
        kicker: t('homeSections.sendPackageKicker'),
        title: t('homeSections.sendPackageTitle'),
        desc: t('homeSections.sendPackageDesc'),
        outcome: t('homeSections.sendPackageOutcome'),
        color: C.orange,
        dim: C.orangeDim,
        border: C.orangeDim,
        path: '/packages',
      },
      {
        icon: Bus,
        kicker: t('homeSections.busFallbackKicker'),
        title: t('homeSections.busFallbackTitle'),
        desc: t('homeSections.busFallbackDesc'),
        outcome: t('homeSections.busFallbackOutcome'),
        color: C.green,
        dim: C.greenDim,
        border: C.greenDim,
        path: '/bus',
      },
      {
        icon: Calendar,
        kicker: t('homeSections.scheduleKicker'),
        title: t('homeSections.scheduleTitle'),
        desc: t('homeSections.scheduleDesc'),
        outcome: t('homeSections.scheduleOutcome'),
        color: C.blue,
        dim: C.blueDim,
        border: C.blueDim,
        path: '/schedule',
      },
    ],
    [t],
  );

  const corridorCards = useMemo<CorridorCard[]>(() => {
    if (!corridorsLoading && liveCorridors.length > 0) {
      return liveCorridors.map((item, index) => {
        const [from, to] = item.from && item.to ? [item.from, item.to] : ['', ''];
        const occupancy = item.seatsTotal > 0 ? Math.round((item.seatsBooked / item.seatsTotal) * 100) : 0;
        return {
          key: item.id,
          title: ar ? `${item.from} ← ${item.to}` : `${item.from} → ${item.to}`,
          detail: `${svc.formatFromJOD(item.priceJod)} ${ar ? 'لكرسي' : 'per seat'} · ${occupancy}% ${ar ? 'محجوز' : 'booked'}`,
          meta: `${ar ? 'الضغط' : 'Pressure'} ${item.demand.toFixed(2)}x`,
          insight:
            index === 0
              ? ar
                ? 'أفضل توازن بين العرض والطلب اليوم'
                : 'Best balance of supply and demand today'
              : ar
                ? 'حركة واضحة على هذا المسار الآن'
                : 'Visible live movement on this corridor',
          featured: index === 0,
          path: `/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`,
          accent: C.cyan,
        };
      });
    }

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
      detail: `${route.dist} ${ar ? 'كم' : 'km'} - ${svc.formatFromJOD(route.priceJod)}`,
      meta: t('homeSections.popularCorridor'),
      insight: index === 0 ? t('homeSections.balancedPick') : t('homeSections.readyForComparison'),
      featured: index === 0,
      path: `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`,
      accent: route.color,
    }));
  }, [ar, svc, t, liveCorridors, corridorsLoading]);

  const corridorBetaPlan = useMemo(() => buildCorridorBetaPlan(), []);

  const trustScore = waselUser?.trustScore ?? 87;

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
              background: C.glass,
              color: C.text,
              padding: '14px 20px calc(14px + env(safe-area-inset-bottom))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              zIndex: 200,
              flexWrap: 'wrap',
              borderTop: `1px solid ${C.borderHov}`,
              backdropFilter: 'blur(16px)',
            }}
            role="dialog"
            aria-label={t('cookies.title')}
          >
            <span
              style={{
                fontSize: '0.84rem',
                fontFamily: F,
                flex: 1,
                minWidth: 200,
                lineHeight: 1.5,
              }}
            >
              {t('cookies.description')}{' '}
              <a
                href="/app/privacy"
                style={{ color: C.cyan, textDecoration: 'underline', fontSize: '0.8rem' }}
              >
                {t('cookies.privacy_policy')}
              </a>
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={declineCookies}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  fontWeight: 600,
                  fontFamily: F,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {t('cookies.reject_all')}
              </button>
              <button
                onClick={acceptCookies}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: C.brandBlue,
                  color: C.text,
                  border: 'none',
                  fontWeight: 800,
                  fontFamily: F,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                {t('cookies.accept_all')}
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
              background: C.brandBlue,
              color: C.text,
              fontWeight: 800,
              fontFamily: F,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {t('homeSections.findRideCTA')}
          </button>
          <button
            onClick={() => handleNavigate('/offer-ride', 'sticky_offer')}
            style={{
              height: 48,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.elevated,
              color: C.text,
              fontWeight: 700,
              fontFamily: F,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {t('homeSections.offerRideCTA')}
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

          <CorridorBetaFocusSection ar={ar} plan={corridorBetaPlan} onNavigate={handleNavigate} />

          {/* Single corridor section — OutcomesSection removed to eliminate redundancy */}
          <CorridorsSection ar={ar} corridorCards={corridorCards} onNavigate={handleNavigate} />

          <TrustPagesSection ar={ar} onNavigate={handleNavigate} />

          <StatsStrip ar={ar} />
          <HowItWorksSection ar={ar} />
          <TestimonialsSection ar={ar} />
          <FinalCtaBanner ar={ar} onNavigate={handleNavigate} />

          {user ? (
            <SignedInUtilitySection
              ar={ar}
              loading={loading}
              walletBalance={svc.formatFromJOD(liveStats?.walletBalance ?? 0)}
              trustScore={trustScore}
              user={
                waselUser
                  ? {
                      emailVerified: waselUser.emailVerified,
                      phoneVerified: waselUser.phoneVerified,
                      sanadVerified: waselUser.sanadVerified,
                      verified: waselUser.verified,
                      trips: waselUser.trips,
                      rating: waselUser.rating,
                    }
                  : undefined
              }
            />
          ) : (
            <SignedOutCtaSection ar={ar} onNavigate={handleNavigate} />
          )}
        </div>
      </div>
    </WaselErrorBoundary>
  );
}

function StatsStrip({ ar }: { ar: boolean }) {
  const stats = [
    { value: '4', label: ar ? 'تدفقات أساسية' : 'Core flows' },
    { value: '5', label: ar ? 'فحوصات ثقة' : 'Trust checks' },
    { value: '0', label: ar ? 'بيع بيانات' : 'Data resale' },
    { value: ar ? 'مباشر' : 'Live', label: ar ? 'إشارات تجربة' : 'UX signals' },
  ];

  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-stats-strip">
        {stats.map(stat => (
          <div key={stat.label} className="wasel-home-stat-item">
            <div className="wasel-home-stat-value">{stat.value}</div>
            <div className="wasel-home-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function HowItWorksSection({ ar }: { ar: boolean }) {
  const steps = [
    {
      icon: Route,
      title: ar ? 'اختار المسار' : 'Choose the corridor',
      detail: ar ? 'ابدأ من عمّان، العقبة، إربد، الزرقاء، البحر الميت، البتراء، أو مسارك المحفوظ.' : 'Start with Amman, Aqaba, Irbid, Zarqa, Dead Sea, Petra, or your saved route.',
    },
    {
      icon: BarChart3,
      title: ar ? 'قارن الخيارات' : 'Compare real options',
      detail: ar ? 'شاهد المقاعد المتاحة، البديل المجدول، سعر المسار، وسياق الثقة معاً.' : 'See seat supply, scheduled fallback, route price, and trust context together.',
    },
    {
      icon: BadgeCheck,
      title: ar ? 'أكد بثقة' : 'Confirm with confidence',
      detail: ar ? 'احجز، اعرض مقاعد، أو أرسل طرداً فقط بعد ظهور التفاصيل الصحيحة.' : 'Book, offer seats, or send a parcel only after the right details are visible.',
    },
    {
      icon: Headphones,
      title: ar ? 'تتبع وحل' : 'Track and resolve',
      detail: ar ? 'التتبع المباشر، إثبات التسليم، حالة المحفظة، والدعم تبقى مرتبطة.' : 'Live tracking, handoff proof, wallet status, and support stay attached.',
    },
  ];

  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wasel-home-section-icon">
            <Play size={16} />
          </div>
          <h2 className="wasel-home-section-title">
            {ar ? 'كيف يعمل Wasel' : 'How Wasel works'}
          </h2>
        </div>
      </div>
      <div className="wasel-home-steps">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="wasel-home-step">
              <div className="wasel-home-step-number">0{index + 1}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 10, background: `${C.cyan}14`, border: `1px solid ${C.cyan}24`, color: C.cyan }}>
                  <Icon size={18} />
                </span>
                <div className="wasel-home-step-title">{step.title}</div>
              </div>
              <div className="wasel-home-step-desc">{step.detail}</div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function TestimonialsSection({ ar }: { ar: boolean }) {
  const testimonials = [
    {
      text: ar ? 'أفضل طريقة للسفر بين المدن. الأسعار واضحة والسائقون موثوقون.' : 'Best way to travel between cities. Clear prices and trusted drivers.',
      name: ar ? 'أحمد' : 'Ahmad',
      role: ar ? 'راكب منتظم' : 'Regular rider',
      stars: 5,
    },
    {
      text: ar ? 'أعرض مقاعدي بسهولة وأحصل على طلبات موثوقة. التطبيق يثق في المستخدمين.' : 'I offer my seats easily and get trusted requests. The app trusts its users.',
      name: ar ? 'سارة' : 'Sara',
      role: ar ? 'سائقة' : 'Driver',
      stars: 5,
    },
    {
      text: ar ? 'أرسل طرودي مع إثبات التسليم. لم أعد أقلق على شحناتي.' : 'I send parcels with delivery proof. I no longer worry about my shipments.',
      name: ar ? 'خالد' : 'Khaled',
      role: ar ? 'مرسل طرود' : 'Parcel sender',
      stars: 5,
    },
  ];

  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wasel-home-section-icon">
            <MessageSquareQuote size={16} />
          </div>
          <h2 className="wasel-home-section-title">
            {ar ? 'ماذا يقول مستخدموا Wasel' : 'What Wasel users say'}
          </h2>
        </div>
      </div>
      <div className="wasel-home-testimonials">
        {testimonials.map((item, index) => (
          <div key={index} className="wasel-home-testimonial">
            <div className="wasel-home-testimonial-stars">
              {Array.from({ length: item.stars }).map((_, i) => (
                <Star key={i} size={14} fill={C.brandOrange} color={C.brandOrange} />
              ))}
            </div>
            <div className="wasel-home-testimonial-text">"{item.text}"</div>
            <div className="wasel-home-testimonial-author">
              <div className="wasel-home-testimonial-avatar">
                {item.name.charAt(0)}
              </div>
              <div>
                <div className="wasel-home-testimonial-name">{item.name}</div>
                <div className="wasel-home-testimonial-role">{item.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function FinalCtaBanner({ ar, onNavigate }: { ar: boolean; onNavigate: (path: string, source?: string) => void }) {
  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-cta-banner">
        <h2 className="wasel-home-cta-title">
          {ar ? 'ابدأ رحلتك مع Wasel اليوم' : 'Start your Wasel journey today'}
        </h2>
        <p className="wasel-home-cta-subtitle">
          {ar
            ? 'انضم إلى آلاف المستخدمين الذين يثقون بـ Wasel للتنقل الذكي في الأردن.'
            : 'Join thousands of users who trust Wasel for smart mobility across Jordan.'}
        </p>
        <div className="wasel-home-cta-actions">
          <WaselButton
            type="button"
            variant="primary"
            size="lg"
            icon={<Route size={17} />}
            iconEnd={<ArrowRight size={16} />}
            onClick={() => onNavigate('/find-ride', 'final_cta_find')}
          >
            {ar ? 'اعرض المسارات المتاحة' : 'Find a lower-cost route'}
          </WaselButton>
          <WaselButton
            type="button"
            variant="outline"
            size="lg"
            icon={<Globe2 size={17} />}
            onClick={() => onNavigate('/auth?tab=register', 'final_cta_register')}
            style={{ background: C.elevated, color: C.text, border: `1px solid ${C.border}` }}
          >
            {ar ? 'أنشئ حسابا مجانيا' : 'Create free account'}
          </WaselButton>
        </div>
      </div>
    </motion.section>
  );
}

export default HomePage;
