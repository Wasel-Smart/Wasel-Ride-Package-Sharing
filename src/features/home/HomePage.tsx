import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Car, Package, Bus, Calendar, Route, BarChart3, BadgeCheck, Headphones, Play, ArrowRight, ArrowLeft, MessageSquareQuote, Star, Globe2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
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
import { TYPE } from '../../utils/wasel-ds';
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
  const { user, waselUser } = useAuth();
  const navigate = useIframeSafeNavigate();
  const { stats: liveStats, loading } = useLiveUserStats();
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [cookieConsented, setCookieConsented] = useState(false);
  const [cookieDeclined, setCookieDeclined] = useState(false);
  const cookieBannerRef = useRef<HTMLDivElement | null>(null);
  const [liveCorridors, setLiveCorridors] = useState<LiveCorridor[]>([]);
  const [corridorsLoading, setCorridorsLoading] = useState(true);

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const role = waselUser?.role;

   const detectBrowserLanguage = (): Language | null => {
     if (typeof navigator === 'undefined') {return null;}
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
          if (!res.ok) {throw new Error(`snapshot_${res.status}`);}
          const data = (await res.json()) as { corridors?: LiveCorridor[] };
          if (!cancelled && Array.isArray(data.corridors)) {
            setLiveCorridors(data.corridors);
          }
        } catch {
          if (!cancelled) {setLiveCorridors([]);}
        } finally {
          if (!cancelled) {setCorridorsLoading(false);}
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

  // Cookie banner: Escape key dismissal + focus trap
  useEffect(() => {
    if (cookieConsented || cookieDeclined) {return;}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        declineCookies();
        return;
      }
      if (e.key !== 'Tab') {return;}
      const banner = cookieBannerRef.current;
      if (!banner) {return;}
      const focusable = Array.from(
        banner.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (focusable.length === 0) {return;}
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
   
  }, [cookieConsented, cookieDeclined]);

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

  const quickActions = useMemo<QuickAction[]>(() => {
    const base: QuickAction[] = [
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
    ];

    if (role === 'driver' || role === 'both') {
      return [base[1], base[0], base[2], base[3], base[4]] as QuickAction[];
    }
    if (role === 'admin') {
      return [base[0], base[2], base[1], base[3], base[4]] as QuickAction[];
    }
    return base;
  }, [role, t]);

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
            ref={cookieBannerRef}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: C.glass,
              color: C.text,
              padding: `${TYPE.size.sm} 20px calc(14px + env(safe-area-inset-bottom))`,
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
            aria-modal="true"
          >
            <span
              style={{
                fontSize: TYPE.size.sm,
                fontFamily: F,
                flex: 1,
                minWidth: 200,
                lineHeight: 1.5,
              }}
            >
              {t('cookies.description')}{' '}
              <a
                href="/app/privacy"
                style={{ color: C.cyan, textDecoration: 'underline', fontSize: TYPE.size.xs }}
              >
                {t('cookies.privacy_policy')}
              </a>
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <WaselButton
                variant="ghost"
                size="sm"
                onClick={() => { void declineCookies(); }}
              >
                {t('cookies.reject_all')}
              </WaselButton>
              <WaselButton
                variant="primary"
                size="sm"
                onClick={() => { void acceptCookies(); }}
              >
                {t('cookies.accept_all')}
              </WaselButton>
            </div>
          </div>
        )}

        {/* Sticky mobile CTA */}
        <div className="wasel-home-sticky-cta">
          <WaselButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={() => { void handleNavigate(primaryTripPath, 'sticky_find'); }}
          >
            {t('homeSections.findRideCTA')}
          </WaselButton>
          <WaselButton
            type="button"
            variant="outline"
            size="md"
            fullWidth
            onClick={() => { void handleNavigate('/offer-ride', 'sticky_offer'); }}
          >
            {t('homeSections.offerRideCTA')}
          </WaselButton>
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

          {user && role && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="wasel-home-section"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 16,
                background: C.cyanDim,
                border: `1px solid ${C.borderHov}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: C.brandBlue,
                  color: C.text,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: TYPE.weight.black,
                  fontSize: TYPE.size.sm,
                }}
              >
                {role === 'admin' ? 'A' : role === 'driver' ? 'D' : role === 'both' ? 'B' : 'R'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: TYPE.weight.black, fontSize: TYPE.size.base, color: C.text }}>
                  {role === 'admin'
                    ? t('homeSections.roleBannerAdmin')
                    : role === 'driver'
                      ? t('homeSections.roleBannerDriver')
                      : role === 'both'
                        ? t('homeSections.roleBannerBoth')
                        : t('homeSections.roleBannerRider')}
                </div>
                <div style={{ fontSize: TYPE.size.xs, color: C.textMuted, marginTop: 2 }}>
                  {role === 'admin'
                    ? t('homeSections.roleBannerAdminDesc')
                    : role === 'driver'
                      ? t('homeSections.roleBannerDriverDesc')
                      : role === 'both'
                        ? t('homeSections.roleBannerBothDesc')
                        : t('homeSections.roleBannerRiderDesc')}
                </div>
              </div>
            </motion.div>
          )}

          <QuickActionsSection quickActions={quickActions} onNavigate={handleNavigate} />

          {/* Show onboarding demo only for new/signed-out users */}
          {!user && <OnboardingDemoSection ar={ar} onNavigate={handleNavigate} />}

          <CorridorBetaFocusSection ar={ar} plan={corridorBetaPlan} onNavigate={handleNavigate} />

          {/* Single corridor section — OutcomesSection removed to eliminate redundancy */}
          <CorridorsSection corridorCards={corridorCards} onNavigate={handleNavigate} />

          <TrustPagesSection ar={ar} onNavigate={handleNavigate} />

          <StatsStrip />
          <HowItWorksSection />
          <TestimonialsSection />
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
            <SignedOutCtaSection onNavigate={handleNavigate} />
          )}
        </div>
      </div>
    </WaselErrorBoundary>
  );
}

function StatsStrip() {
  const { t } = useLanguage();
  const stats = [
    { value: '4', label: t('homeSections.statCoreFlows') },
    { value: '5', label: t('homeSections.statTrustChecks') },
    { value: '0', label: t('homeSections.statDataResale') },
    { value: t('homeSections.statUxSignalsValue'), label: t('homeSections.statUxSignals') },
  ];

  return (
    <motion.section initial={false} className="wasel-home-section" aria-label={t('homeSections.statsTitle')}>
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

function HowItWorksSection() {
  const { t } = useLanguage();
  const steps = [
    {
      icon: Route,
      title: t('homeSections.howStep1Title'),
      detail: t('homeSections.howStep1Detail'),
    },
    {
      icon: BarChart3,
      title: t('homeSections.howStep2Title'),
      detail: t('homeSections.howStep2Detail'),
    },
    {
      icon: BadgeCheck,
      title: t('homeSections.howStep3Title'),
      detail: t('homeSections.howStep3Detail'),
    },
    {
      icon: Headphones,
      title: t('homeSections.howStep4Title'),
      detail: t('homeSections.howStep4Detail'),
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
            {t('homeSections.howItWorksTitle')}
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

function TestimonialsSection() {
  const { t } = useLanguage();
  const testimonials = [
    {
      text: t('homeSections.testimonial1Text'),
      name: t('homeSections.testimonial1Name'),
      role: t('homeSections.testimonial1Role'),
      stars: 5,
    },
    {
      text: t('homeSections.testimonial2Text'),
      name: t('homeSections.testimonial2Name'),
      role: t('homeSections.testimonial2Role'),
      stars: 5,
    },
    {
      text: t('homeSections.testimonial3Text'),
      name: t('homeSections.testimonial3Name'),
      role: t('homeSections.testimonial3Role'),
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
            {t('homeSections.testimonialsTitle')}
          </h2>
        </div>
      </div>
      <div className="wasel-home-testimonials">
        {testimonials.map((item, index) => {
          const AVATAR_GRADIENTS = [
            'linear-gradient(135deg, #00E5FF 0%, #32D8A6 100%)',
            'linear-gradient(135deg, #FFBE5C 0%, #FF8A0B 100%)',
            'linear-gradient(135deg, #72C70D 0%, #34D8A7 100%)',
          ];
          const AVATAR_GLOWS = [
            'rgba(0,229,255,0.35)',
            'rgba(255,190,92,0.35)',
            'rgba(114,199,13,0.35)',
          ];
          const grad = AVATAR_GRADIENTS[index % 3];
          const glow = AVATAR_GLOWS[index % 3];
          return (
            <div key={index} className="wasel-home-testimonial">
              <div className="wasel-home-testimonial-stars">
                {Array.from({ length: item.stars }).map((_, i) => (
                  <Star key={i} size={14} fill={C.brandOrange} color={C.brandOrange} />
                ))}
              </div>
              <div className="wasel-home-testimonial-text">"{item.text}"</div>
              <div className="wasel-home-testimonial-author">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: grad,
                    boxShadow: `0 0 0 2px ${C.cardSolid}, 0 0 0 4px ${glow}, 0 4px 14px ${glow}`,
                    display: 'grid',
                    placeItems: 'center',
                    color: C.bgDeep,
                    fontSize: TYPE.size.base,
                    fontWeight: TYPE.weight.ultra,
                    flexShrink: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="wasel-home-testimonial-name">{item.name}</div>
                  <div className="wasel-home-testimonial-role">{item.role}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function FinalCtaBanner({ ar, onNavigate }: { ar: boolean; onNavigate: (path: string, source?: string) => void }) {
  const { t } = useLanguage();
  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-cta-banner">
        <h2 className="wasel-home-cta-title">
          {t('homeSections.finalCtaTitle')}
        </h2>
        <p className="wasel-home-cta-subtitle">
          {t('homeSections.finalCtaSubtitle')}
        </p>
        <div className="wasel-home-cta-actions">
          <WaselButton
            type="button"
            variant="primary"
            size="lg"
            icon={<Route size={17} />}
            iconEnd={ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            onClick={() => { void onNavigate('/find-ride', 'final_cta_find'); }}
          >
            {t('homeSections.finalCtaFind')}
          </WaselButton>
          <WaselButton
            type="button"
            variant="outline"
            size="lg"
            icon={<Globe2 size={17} />}
            onClick={() => { void onNavigate('/auth?tab=register', 'final_cta_register'); }}
            style={{ background: C.elevated, color: C.text, border: `1px solid ${C.border}` }}
          >
            {t('homeSections.finalCtaRegister')}
          </WaselButton>
        </div>
      </div>
    </motion.section>
  );
}

export default HomePage;
