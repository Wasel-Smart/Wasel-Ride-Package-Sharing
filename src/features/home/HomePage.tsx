import { useEffect, useMemo, useRef, useState } from 'react';
import { Se_arch, C_ar, Package, Bus, Calend_ar, Route, B_arCh_art3, BadgeCheck, Headphones, Play, ArrowRight, MessageSqu_areQuote, St_ar, Globe2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLiveUserStats } from '../../services/liveDataService';
import { buildCorridorBetaPlan } from '../../services/corridorBeta';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { CurrencyService } from '../../utils/currency';
import { trackUserAction } from '../../utils/monitoring';
import { API_URL } from '../../services/core';
import { WaselErrorBound_ary } from '../../components/ErrorBound_ary';
import { ActiveTripsBanner } from '../../components/TripProgressC_ard';
import { C, F, POPULAR_ROUTES } from './HomePageSh_ared';
import {
  CorridorsSection,
  CorridorBetaFocusSection,
  HomeHeroSection,
  HomePageStyles,
  Onbo_ardingDemoSection,
  ProofSection,
  QuickActionsSection,
  SignedInUtilitySection,
  SignedOutCtaSection,
  TrustPagesSection,
  type CorridorC_ard,
  type QuickAction,
  type TripMode,
} from './HomePageSections';
import { _tx } from '../../locales/_tx';

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
  const cookieBannerRef = useRef<HTMLDivElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cookieConsented && !cookieDeclined && acceptButtonRef.current) {
      acceptButtonRef.current.focus();
    }
  }, [cookieConsented, cookieDeclined]);
  const [liveCorridors, setLiveCorridors] = useState<LiveCorridor[]>([]);
  const [corridorsLoading, setCorridorsLoading] = useState(true);

  const _ar = language === '_ar';
  const svc = CurrencyService.getInstance();
  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

   const detectBrowserLanguage = (): Language | null => {
     if (typeof navigator === 'undefined') return null;
     const browserLang = navigator.language.split('-')[0];
     if (browserLang === '_ar' || browserLang === 'en') {
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
      window.performance.m_ark('wasel_home_visible');
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
        icon: Se_arch,
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
        icon: C_ar,
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
        icon: Calend_ar,
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

  const corridorC_ards = useMemo<CorridorC_ard[]>(() => {
    if (!corridorsLoading && liveCorridors.length > 0) {
      return liveCorridors.map((item, index) => {
        const [from, to] = item.from && item.to ? [item.from, item.to] : ['', ''];
        const occupancy = item.seatsTotal > 0 ? Math.round((item.seatsBooked / item.seatsTotal) * 100) : 0;
        return {
          key: item.id,
          title: _ar ? `${item.from} ← ${item.to}` : `${item.from} → ${item.to}`,
          detail: `${svc.formatFromJOD(item.priceJod)} ${t('homePage.per_seat')} · ${occupancy}% ${t('homePage.booked')}`,
          meta: `${t('homePage.pressure_label')} ${item.demand.toFixed(2)}x`,
          insight:
            index === 0
              ? t('homePage.best_balance_today')
              : t('homePage.visible_live_movement'),
          featured: index === 0,
          path: `/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&se_arch=1`,
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
        meta: `${item.active} ${t('homePage.active_now')}`,
        insight:
          index === 0
            ? t('homePage.best_balance_today')
            : t('homePage.visible_live_movement'),
        featured: index === 0,
        path: (() => {
          const [from, to] = item.corridor.split(' to ');
          return `/find-ride?from=${encodeURIComponent(from ?? '')}&to=${encodeURIComponent(to ?? '')}&se_arch=1`;
        })(),
        accent: C.cyan,
      }));
    }

    return POPULAR_ROUTES.slice(0, 3).map((route, index) => ({
      key: `${route.from}-${route.to}`,
      title: _ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`,
      detail: `${route.dist} ${t('homePage.km')} - ${svc.formatFromJOD(route.priceJod)}`,
      meta: t('homeSections.popul_arCorridor'),
      insight: index === 0 ? t('homeSections.balancedPick') : t('homeSections.readyForComp_arison'),
      featured: index === 0,
      path: `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`,
      accent: route.color,
    }));
  }, [_ar, svc, t, liveCorridors, corridorsLoading]);

  const corridorBetaPlan = useMemo(() => buildCorridorBetaPlan(), []);

  const trustScore = waselUser?.trustScore ?? 87;

  const prim_aryTripPath = tripMode === 'round' ? '/find-ride?mode=round' : '/find-ride';

  return (
    <WaselErrorBound_ary>
      <div className="wasel-home-shell" dir={dir} style={{ color: C.text, fontFamily: F }}>
        <HomePageStyles />

        {/* Cookie banner — bottom position, non-blocking */}
        {!cookieConsented && !cookieDeclined && (
          <div
            ref={cookieBannerRef}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                declineCookies();
              }
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: C.glass,
              color: C.text,
              padding: '14px 20px calc(14px + env(safe-_area-inset-bottom))',
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
            _aria-modal="true"
            _aria-label={t('cookies.title')}
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
                  background: 'transp_arent',
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
                ref={acceptButtonRef}
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
            onClick={() => handleNavigate(prim_aryTripPath, 'sticky_find')}
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
            _ar={_ar}
            user={user}
            firstName={firstName}
            tripMode={tripMode}
            onTripModeChange={handleTripModeChange}
            onNavigate={handleNavigate}
            prim_aryTripPath={prim_aryTripPath}
          />

          {/* Proof section only for signed-out users; signed-in users see active trips instead */}
          {!user && <ProofSection _ar={_ar} onNavigate={handleNavigate} />}

          {user && <ActiveTripsBanner onNavigate={handleNavigate} />}

          <QuickActionsSection _ar={_ar} quickActions={quickActions} onNavigate={handleNavigate} />

          {/* Show onbo_arding demo only for new/signed-out users */}
          {!user && <Onbo_ardingDemoSection _ar={_ar} onNavigate={handleNavigate} />}

          <CorridorBetaFocusSection _ar={_ar} plan={corridorBetaPlan} onNavigate={handleNavigate} />

          {/* Single corridor section — OutcomesSection removed to eliminate redundancy */}
          <CorridorsSection _ar={_ar} corridorC_ards={corridorC_ards} onNavigate={handleNavigate} />

          <TrustPagesSection _ar={_ar} onNavigate={handleNavigate} />

          <StatsStrip _ar={_ar} />
          <HowItWorksSection _ar={_ar} />
          <TestimonialsSection _ar={_ar} />
          <FinalCtaBanner _ar={_ar} onNavigate={handleNavigate} />

          {user ? (
            <SignedInUtilitySection
              _ar={_ar}
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
            <SignedOutCtaSection _ar={_ar} onNavigate={handleNavigate} />
          )}
        </div>
      </div>
    </WaselErrorBound_ary>
  );
}

function StatsStrip({ _ar }: { _ar: boolean }) {
  const { t } = useLanguage();
  const stats = [
    { value: '4', label: t('homePage.stats_core_flows_label') },
    { value: '5', label: t('homePage.stats_trust_checks_label') },
    { value: '0', label: t('homePage.stats_data_resale_label') },
    { value: t('homePage.stats_live_value'), label: t('homePage.stats_ux_signals_label') },
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

function HowItWorksSection({ _ar }: { _ar: boolean }) {
  const { t } = useLanguage();
  const steps = [
    {
      icon: Route,
      title: t('homePage.how_step_1_title'),
      detail: t('homePage.how_step_1_detail'),
    },
    {
      icon: B_arCh_art3,
      title: t('homePage.how_step_2_title'),
      detail: t('homePage.how_step_2_detail'),
    },
    {
      icon: BadgeCheck,
      title: t('homePage.how_step_3_title'),
      detail: t('homePage.how_step_3_detail'),
    },
    {
      icon: Headphones,
      title: t('homePage.how_step_4_title'),
      detail: t('homePage.how_step_4_detail'),
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
            {t('homePage.how_it_works_title')}
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

function TestimonialsSection({ _ar }: { _ar: boolean }) {
  const { t } = useLanguage();
  const testimonials = [
    {
      text: t('homePage.testimonial_1_text'),
      name: t('homePage.testimonial_1_name'),
      role: t('homePage.testimonial_1_role'),
      st_ars: 5,
    },
    {
      text: t('homePage.testimonial_2_text'),
      name: t('homePage.testimonial_2_name'),
      role: t('homePage.testimonial_2_role'),
      st_ars: 5,
    },
    {
      text: t('homePage.testimonial_3_text'),
      name: t('homePage.testimonial_3_name'),
      role: t('homePage.testimonial_3_role'),
      st_ars: 5,
    },
  ];

  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wasel-home-section-icon">
            <MessageSqu_areQuote size={16} />
          </div>
          <h2 className="wasel-home-section-title">
            {t('homePage.testimonials_title')}
          </h2>
        </div>
      </div>
      <div className="wasel-home-testimonials">
        {testimonials.map((item, index) => (
          <div key={index} className="wasel-home-testimonial">
            <div className="wasel-home-testimonial-st_ars">
              {Array.from({ length: item.st_ars }).map((_, i) => (
                <St_ar key={i} size={14} fill={C.brandOrange} color={C.brandOrange} />
              ))}
            </div>
            <div className="wasel-home-testimonial-text">"{item.text}"</div>
            <div className="wasel-home-testimonial-author">
              <div className="wasel-home-testimonial-avat_ar">
                {item.name.ch_arAt(0)}
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

function FinalCtaBanner({ _ar, onNavigate }: { _ar: boolean; onNavigate: (path: string, source?: string) => void }) {
  const { t } = useLanguage();
  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-cta-banner">
        <h2 className="wasel-home-cta-title">
          {t('homePage.final_cta_title')}
        </h2>
        <p className="wasel-home-cta-subtitle">
          {t('homePage.final_cta_subtitle')}
        </p>
        <div className="wasel-home-cta-actions">
          <WaselButton
            type="button"
            v_ariant="prim_ary"
            size="lg"
            icon={<Route size={17} />}
            iconEnd={<ArrowRight size={16} />}
            onClick={() => onNavigate('/find-ride', 'final_cta_find')}
          >
            {t('homePage.final_cta_find')}
          </WaselButton>
          <WaselButton
            type="button"
            v_ariant="outline"
            size="lg"
            icon={<Globe2 size={17} />}
            onClick={() => onNavigate('/auth?tab=register', 'final_cta_register')}
            style={{ background: C.elevated, color: C.text, border: `1px solid ${C.border}` }}
          >
            {t('homePage.final_cta_register')}
          </WaselButton>
        </div>
      </div>
    </motion.section>
  );
}

export default HomePage;
