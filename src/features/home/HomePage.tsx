import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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

const CorridorGlobeSection = lazy( () =>
  import( './sections/CorridorGlobeSection' ).then( m => ( { default: m.CorridorGlobeSection } ) ),
);

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

interface CookieBannerProps {
  bannerRef: React.RefObject<HTMLDivElement | null>;
  onAccept: () => void;
  onDecline: () => void;
  t: ( key: string ) => string;
}

function CookieBanner ( { bannerRef, onAccept, onDecline, t }: CookieBannerProps ) {
  return (
    <div
      ref={ bannerRef }
      style={ {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: C.glass,
        color: C.text,
        padding: `${ TYPE.size.sm } 20px calc(14px + env(safe-area-inset-bottom))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        zIndex: 200,
        flexWrap: 'wrap',
        borderTop: `1px solid ${ C.borderHov }`,
        backdropFilter: 'blur(16px)',
      } }
      role="dialog"
      aria-label={ t( 'cookies.title' ) }
      aria-modal="true"
    >
      <span
        style={ {
          fontSize: TYPE.size.sm,
          fontFamily: F,
          flex: 1,
          minWidth: 200,
          lineHeight: 1.5,
        } }
      >
        { t( 'cookies.description' ) }{ ' ' }
        <a
          href="/app/privacy"
          style={ { color: C.cyan, textDecoration: 'underline', fontSize: TYPE.size.xs } }
        >
          { t( 'cookies.privacy_policy' ) }
        </a>
      </span>
      <div style={ { display: 'flex', gap: 8, flexShrink: 0 } }>
        <WaselButton
          variant="ghost"
          size="sm"
          onClick={ onDecline }
        >
          { t( 'cookies.reject_all' ) }
        </WaselButton>
        <WaselButton
          variant="primary"
          size="sm"
          onClick={ onAccept }
        >
          { t( 'cookies.accept_all' ) }
        </WaselButton>
      </div>
    </div>
  );
}

function useCookieConsent ( language: Language, setLanguage: ( lang: Language ) => void ) {
  const [ cookieConsented, setCookieConsented ] = useState( false );
  const [ cookieDeclined, setCookieDeclined ] = useState( false );
  const cookieBannerRef = useRef<HTMLDivElement | null>( null );

  useEffect( () => {
    const savedCookieConsent = localStorage.getItem( 'wasel-cookie-consent' );
    const savedLanguage = localStorage.getItem( 'wasel-language' );
    if ( savedCookieConsent ) {
      setCookieConsented( true );
    }

    if ( typeof navigator === 'undefined' ) { return; }
    const browserLang = navigator.language.split( '-' )[ 0 ];
    const detectedLang = ( browserLang === 'ar' || browserLang === 'en' ) ? browserLang : null;
    if ( !savedCookieConsent && !savedLanguage && detectedLang && detectedLang !== language ) {
      setLanguage( detectedLang );
    }
  }, [ language, setLanguage ] );

  const acceptCookies = () => {
    localStorage.setItem( 'wasel-cookie-consent', 'accepted' );
    setCookieConsented( true );
  };

  const declineCookies = () => {
    localStorage.setItem( 'wasel-cookie-consent', 'declined' );
    setCookieDeclined( true );
    setCookieConsented( true );
  };

  useEffect( () => {
    if ( cookieConsented || cookieDeclined ) { return; }

    const handleKeyDown = ( e: KeyboardEvent ) => {
      if ( e.key === 'Escape' ) {
        declineCookies();
        return;
      }
      if ( e.key !== 'Tab' ) { return; }
      const banner = cookieBannerRef.current;
      if ( !banner ) { return; }
      const focusable = Array.from(
        banner.querySelectorAll<HTMLElement>( 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])' )
      );
      if ( focusable.length === 0 ) { return; }
      const first = focusable[ 0 ]!;
      const last = focusable[ focusable.length - 1 ]!;
      if ( e.shiftKey ) {
        if ( document.activeElement === first ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if ( document.activeElement === last ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener( 'keydown', handleKeyDown );
    return () => document.removeEventListener( 'keydown', handleKeyDown );
  }, [ cookieConsented, cookieDeclined ] );

  return {
    cookieConsented,
    cookieDeclined,
    cookieBannerRef,
    acceptCookies,
    declineCookies,
  };
}

interface StickyMobileCtaProps {
  onNavigate: ( path: string, source?: string ) => void;
  primaryTripPath: string;
  t: ( key: string ) => string;
}

function StickyMobileCta ( { onNavigate, primaryTripPath, t }: StickyMobileCtaProps ) {
  return (
    <div className="wasel-home-sticky-cta">
      <WaselButton
        type="button"
        variant="primary"
        size="md"
        fullWidth
        onClick={ () => { void onNavigate( primaryTripPath, 'sticky_find' ); } }
      >
        { t( 'homeSections.findRideCTA' ) }
      </WaselButton>
      <WaselButton
        type="button"
        variant="outline"
        size="md"
        fullWidth
        onClick={ () => { void onNavigate( '/offer-ride', 'sticky_offer' ); } }
      >
        { t( 'homeSections.offerRideCTA' ) }
      </WaselButton>
    </div>
  );
}

interface RoleBannerProps {
  role: string;
  t: ( key: string ) => string;
}

function RoleBanner ( { role, t }: RoleBannerProps ) {
  const roleLetter = role === 'admin' ? 'A' : role === 'driver' ? 'D' : role === 'both' ? 'B' : 'R';
  const roleTitleKey = role === 'admin'
    ? 'homeSections.roleBannerAdmin'
    : role === 'driver'
      ? 'homeSections.roleBannerDriver'
      : role === 'both'
        ? 'homeSections.roleBannerBoth'
        : 'homeSections.roleBannerRider';
  const roleDescKey = role === 'admin'
    ? 'homeSections.roleBannerAdminDesc'
    : role === 'driver'
      ? 'homeSections.roleBannerDriverDesc'
      : role === 'both'
        ? 'homeSections.roleBannerBothDesc'
        : 'homeSections.roleBannerRiderDesc';

  return (
    <motion.div
      initial={ { opacity: 0, y: 8 } }
      animate={ { opacity: 1, y: 0 } }
      className="wasel-home-section"
      style={ {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 16,
        background: C.cyanDim,
        border: `1px solid ${ C.borderHov }`,
      } }
    >
      <div
        style={ {
          width: 36,
          height: 36,
          borderRadius: 10,
          background: C.brandBlue,
          color: C.text,
          display: 'grid',
          placeItems: 'center',
          fontWeight: TYPE.weight.black,
          fontSize: TYPE.size.sm,
        } }
      >
        { roleLetter }
      </div>
      <div style={ { flex: 1 } }>
        <div style={ { fontWeight: TYPE.weight.black, fontSize: TYPE.size.base, color: C.text } }>
          { t( roleTitleKey ) }
        </div>
        <div style={ { fontSize: TYPE.size.xs, color: C.textMuted, marginTop: 2 } }>
          { t( roleDescKey ) }
        </div>
      </div>
    </motion.div>
  );
}

function useHomeQuickActions ( role: string | undefined, t: ( key: string ) => string ) {
  return useMemo<QuickAction[]>( () => {
    const base: QuickAction[] = [
      {
        icon: Search,
        kicker: t( 'homeSections.findRideKicker' ),
        title: t( 'homeSections.findRideTitle' ),
        desc: t( 'homeSections.findRideDesc' ),
        outcome: t( 'homeSections.findRideOutcome' ),
        color: C.cyan,
        dim: C.cyanDim,
        border: C.borderHov,
        path: '/find-ride',
      },
      {
        icon: Car,
        kicker: t( 'homeSections.offerRideKicker' ),
        title: t( 'homeSections.offerRideTitle' ),
        desc: t( 'homeSections.offerRideDesc' ),
        outcome: t( 'homeSections.offerRideOutcome' ),
        color: C.gold,
        dim: C.goldDim,
        border: C.goldDim,
        path: '/offer-ride',
      },
      {
        icon: Package,
        kicker: t( 'homeSections.sendPackageKicker' ),
        title: t( 'homeSections.sendPackageTitle' ),
        desc: t( 'homeSections.sendPackageDesc' ),
        outcome: t( 'homeSections.sendPackageOutcome' ),
        color: C.orange,
        dim: C.orangeDim,
        border: C.orangeDim,
        path: '/packages',
      },
      {
        icon: Bus,
        kicker: t( 'homeSections.busFallbackKicker' ),
        title: t( 'homeSections.busFallbackTitle' ),
        desc: t( 'homeSections.busFallbackDesc' ),
        outcome: t( 'homeSections.busFallbackOutcome' ),
        color: C.green,
        dim: C.greenDim,
        border: C.greenDim,
        path: '/bus',
      },
      {
        icon: Calendar,
        kicker: t( 'homeSections.scheduleKicker' ),
        title: t( 'homeSections.scheduleTitle' ),
        desc: t( 'homeSections.scheduleDesc' ),
        outcome: t( 'homeSections.scheduleOutcome' ),
        color: C.blue,
        dim: C.blueDim,
        border: C.blueDim,
        path: '/schedule',
      },
    ];

    if ( role === 'driver' || role === 'both' ) {
      return [ base[ 1 ], base[ 0 ], base[ 2 ], base[ 3 ], base[ 4 ] ];
    }
    if ( role === 'admin' ) {
      return [ base[ 0 ], base[ 2 ], base[ 1 ], base[ 3 ], base[ 4 ] ];
    }
    return base;
  }, [ role, t ] );
}

function useCorridorCards ( ar: boolean, svc: CurrencyService, t: ( key: string ) => string ) {
  const [ liveCorridors, setLiveCorridors ] = useState<LiveCorridor[]>( [] );
  const [ corridorsLoading, setCorridorsLoading ] = useState( true );

  useEffect( () => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCorridors () {
      setCorridorsLoading( true );
      try {
        const res = await fetch( `${ API_URL }/mobility-os/public-snapshot`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        } );
        if ( !res.ok ) { throw new Error( `snapshot_${ res.status }` ); }
        const data = ( await res.json() ) as { corridors?: LiveCorridor[] };
        if ( !cancelled && Array.isArray( data.corridors ) ) {
          setLiveCorridors( data.corridors );
        }
      } catch {
        if ( !cancelled ) { setLiveCorridors( [] ); }
      } finally {
        if ( !cancelled ) { setCorridorsLoading( false ); }
      }
    }

    if ( API_URL ) {
      void loadCorridors();
    } else {
      setCorridorsLoading( false );
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [] );

  return useMemo<CorridorCard[]>( () => {
    if ( !corridorsLoading && liveCorridors.length > 0 ) {
      return liveCorridors.map( ( item, index ) => {
        const from = item.from || '';
        const to = item.to || '';
        const occupancy = item.seatsTotal > 0 ? Math.round( ( item.seatsBooked / item.seatsTotal ) * 100 ) : 0;
        return {
          key: item.id,
          title: ar ? `${ item.from } ← ${ item.to }` : `${ item.from } → ${ item.to }`,
          detail: `${ svc.formatFromJOD( item.priceJod ) } ${ ar ? 'لكرسي' : 'per seat' } · ${ occupancy }% ${ ar ? 'محجوز' : 'booked' }`,
          meta: `${ ar ? 'الضغط' : 'Pressure' } ${ item.demand.toFixed( 2 ) }x`,
          insight: index === 0
            ? ( ar ? 'أفضل توازن بين العرض والطلب اليوم' : 'Best balance of supply and demand today' )
            : ( ar ? 'حركة واضحة على هذا المسار الآن' : 'Visible live movement on this corridor' ),
          featured: index === 0,
          path: `/find-ride?from=${ encodeURIComponent( from ) }&to=${ encodeURIComponent( to ) }&search=1`,
          accent: C.cyan,
        };
      } );
    }

    const leaders = getCorridorDemandLeaders().slice( 0, 3 );
    if ( leaders.length > 0 ) {
      return leaders.map( ( item, index ) => {
        const [ from, to ] = item.corridor.split( ' to ' );
        return {
          key: item.corridor,
          title: item.corridor,
          detail: item.serviceLabel,
          meta: `${ item.active } ${ ar ? 'نشط الآن' : 'active now' }`,
          insight: index === 0
            ? ( ar ? 'أفضل توازن بين العرض والطلب اليوم' : 'Best balance of supply and demand today' )
            : ( ar ? 'حركة واضحة على هذا المسار الآن' : 'Visible live movement on this corridor' ),
          featured: index === 0,
          path: `/find-ride?from=${ encodeURIComponent( from ?? '' ) }&to=${ encodeURIComponent( to ?? '' ) }&search=1`,
          accent: C.cyan,
        };
      } );
    }

    return POPULAR_ROUTES.slice( 0, 3 ).map( ( route, index ) => ( {
      key: `${ route.from }-${ route.to }`,
      title: ar ? `${ route.fromAr } ← ${ route.toAr }` : `${ route.from } → ${ route.to }`,
      detail: `${ route.dist } ${ ar ? 'كم' : 'km' } - ${ svc.formatFromJOD( route.priceJod ) }`,
      meta: t( 'homeSections.popularCorridor' ),
      insight: index === 0 ? t( 'homeSections.balancedPick' ) : t( 'homeSections.readyForComparison' ),
      featured: index === 0,
      path: `/find-ride?from=${ encodeURIComponent( route.from ) }&to=${ encodeURIComponent( route.to ) }`,
      accent: route.color,
    } ) );
  }, [ ar, svc, t, liveCorridors, corridorsLoading ] );
}

export function HomePage () {
  const { language, dir, setLanguage, t } = useLanguage();
  const { user, waselUser } = useAuth();
  const navigate = useIframeSafeNavigate();
  const { stats: liveStats, loading } = useLiveUserStats();
  const [ tripMode, setTripMode ] = useState<TripMode>( 'one-way' );

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();
  const firstName = user?.user_metadata?.name?.split( ' ' )[ 0 ] || user?.email?.split( '@' )[ 0 ] || '';
  const role = waselUser?.role;
  const corridorBetaPlan = useMemo( () => buildCorridorBetaPlan(), [] );
  const trustScore = waselUser?.trustScore ?? 87;
  const primaryTripPath = tripMode === 'round' ? '/find-ride?mode=round' : '/find-ride';

  const { cookieConsented, cookieDeclined, cookieBannerRef, acceptCookies, declineCookies } =
    useCookieConsent( language, setLanguage );

  const corridorCards = useCorridorCards( ar, svc, t );
  const quickActions = useHomeQuickActions( role, t );

  useEffect( () => {
    if ( typeof window !== 'undefined' && 'performance' in window ) {
      window.performance.mark( 'wasel_home_visible' );
    }
    trackUserAction( 'homepage.view', {
      signedIn: Boolean( user?.id ),
      language,
    } );
  }, [ language, user?.id ] );

  const handleNavigate = ( path: string, source = 'homepage' ) => {
    trackUserAction( 'homepage.cta_click', {
      source,
      path,
      tripMode,
      signedIn: Boolean( user?.id ),
    } );
    navigate( path );
  };

  const handleTripModeChange = ( mode: TripMode ) => {
    setTripMode( mode );
    trackUserAction( 'homepage.trip_mode_select', { mode } );
  };

  return (
    <WaselErrorBoundary>
      <div className="wasel-home-shell" dir={ dir } style={ { color: C.text, fontFamily: F } }>
        <HomePageStyles />

        { !cookieConsented && !cookieDeclined && (
          <CookieBanner
            bannerRef={ cookieBannerRef }
            onAccept={ acceptCookies }
            onDecline={ declineCookies }
            t={ t }
          />
        ) }

        <StickyMobileCta
          onNavigate={ handleNavigate }
          primaryTripPath={ primaryTripPath }
          t={ t }
        />

        <div className="wasel-home-container relative z-10">
          <HomeHeroSection
            ar={ ar }
            user={ user }
            firstName={ firstName }
            tripMode={ tripMode }
            onTripModeChange={ handleTripModeChange }
            onNavigate={ handleNavigate }
            primaryTripPath={ primaryTripPath }
          />

          { !user && <ProofSection ar={ ar } onNavigate={ handleNavigate } /> }

          { user && <ActiveTripsBanner onNavigate={ handleNavigate } /> }

          { user && role && <RoleBanner role={ role } t={ t } /> }

          <QuickActionsSection quickActions={ quickActions } onNavigate={ handleNavigate } />

          { !user && <OnboardingDemoSection ar={ ar } onNavigate={ handleNavigate } /> }

          <CorridorBetaFocusSection ar={ ar } plan={ corridorBetaPlan } onNavigate={ handleNavigate } />

          <CorridorsSection corridorCards={ corridorCards } onNavigate={ handleNavigate } />

          <Suspense fallback={ null }>
            <CorridorGlobeSection ar={ ar } />
          </Suspense>

          <TrustPagesSection ar={ ar } onNavigate={ handleNavigate } />

          <StatsStrip />
          <HowItWorksSection />
          <TestimonialsSection />
          <FinalCtaBanner ar={ ar } onNavigate={ handleNavigate } />

          { user ? (
            <SignedInUtilitySection
              ar={ ar }
              loading={ loading }
              walletBalance={ svc.formatFromJOD( liveStats?.walletBalance ?? 0 ) }
              trustScore={ trustScore }
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
            <SignedOutCtaSection onNavigate={ handleNavigate } />
          ) }
        </div>
      </div>
    </WaselErrorBoundary>
  );
}

function StatsStrip () {
  const { t } = useLanguage();
  const stats = [
    { value: '4', label: t( 'homeSections.statCoreFlows' ), color: '#00E5FF' },
    { value: '5', label: t( 'homeSections.statTrustChecks' ), color: '#72C70D' },
    { value: '0', label: t( 'homeSections.statDataResale' ), color: '#FFBE5C' },
    { value: t( 'homeSections.statUxSignalsValue' ), label: t( 'homeSections.statUxSignals' ), color: '#58DDFF' },
  ];

  return (
    <motion.section initial={ false } className="wasel-home-section" aria-label={ t( 'homeSections.statsTitle' ) }>
      <div className="wasel-home-stats-strip">
        { stats.map( stat => (
          <div
            key={ stat.label }
            className="wasel-home-stat-item"
            style={ {
              background: 'rgba(8, 29, 57, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(20, 127, 228, 0.16)',
              borderTop: `1px solid ${ stat.color }45`,
              boxShadow: '0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 8px 24px rgba(8, 29, 57, 0.35)',
            } }
          >
            <div className="wasel-home-stat-value" style={ { color: stat.color, fontSize: '1.85rem' } }>
              { stat.value }
            </div>
            <div className="wasel-home-stat-label" style={ { marginTop: 4, color: C.textSub, fontWeight: 700 } }>
              { stat.label }
            </div>
          </div>
        ) ) }
      </div>
    </motion.section>
  );
}

function HowItWorksSection () {
  const { language, t } = useLanguage();
  const ar = language === 'ar';
  const steps = [
    {
      icon: Route,
      title: t( 'homeSections.howStep1Title' ),
      detail: t( 'homeSections.howStep1Detail' ),
      accent: '#00E5FF',
    },
    {
      icon: BarChart3,
      title: t( 'homeSections.howStep2Title' ),
      detail: t( 'homeSections.howStep2Detail' ),
      accent: '#72C70D',
    },
    {
      icon: BadgeCheck,
      title: t( 'homeSections.howStep3Title' ),
      detail: t( 'homeSections.howStep3Detail' ),
      accent: '#FFBE5C',
    },
    {
      icon: Headphones,
      title: t( 'homeSections.howStep4Title' ),
      detail: t( 'homeSections.howStep4Detail' ),
      accent: '#58DDFF',
    },
  ];

  return (
    <motion.section initial={ false } className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
          <div
            className="wasel-home-section-icon"
            style={ {
              background: 'rgba(0, 229, 255, 0.12)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              color: '#00E5FF',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.15)',
            } }
          >
            <Play size={ 16 } />
          </div>
          <div>
            <div
              style={ {
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#00E5FF',
              } }
            >
              { ar ? 'خطوات بسيطة وسريعة' : 'Effortless 4 Steps' }
            </div>
            <h2 className="wasel-home-section-title" style={ { marginTop: 2 } }>
              { t( 'homeSections.howItWorksTitle' ) }
            </h2>
          </div>
        </div>
      </div>
      <div className="wasel-home-steps">
        { steps.map( ( step, index ) => {
          const Icon = step.icon;
          return (
            <div
              key={ step.title }
              className="wasel-home-step"
              style={ {
                background: 'rgba(8, 29, 57, 0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(20, 127, 228, 0.16)',
                borderTop: `1px solid ${ step.accent }50`,
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 8px 24px rgba(8, 29, 57, 0.3)',
                padding: '22px 18px',
                borderRadius: 18,
              } }
            >
              <div
                className="wasel-home-step-number"
                style={ {
                  color: step.accent,
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                } }
              >
                <span>0{ index + 1 }</span>
                <span
                  style={ {
                    width: 38,
                    height: 38,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 12,
                    background: `${ step.accent }14`,
                    border: `1px solid ${ step.accent }30`,
                    color: step.accent,
                  } }
                >
                  <Icon size={ 19 } />
                </span>
              </div>
              <div
                className="wasel-home-step-title"
                style={ { fontSize: '1.05rem', fontWeight: 850, marginTop: 10, color: '#f8fbff' } }
              >
                { step.title }
              </div>
              <div
                className="wasel-home-step-desc"
                style={ { fontSize: '0.84rem', color: C.textMuted, lineHeight: 1.65 } }
              >
                { step.detail }
              </div>
            </div>
          );
        } ) }
      </div>
    </motion.section>
  );
}

// eslint-disable-next-line max-lines-per-function
function TestimonialsSection () {
  const { language, t } = useLanguage();
  const ar = language === 'ar';
  const testimonials = [
    {
      text: t( 'homeSections.testimonial1Text' ),
      name: t( 'homeSections.testimonial1Name' ),
      role: t( 'homeSections.testimonial1Role' ),
      routeAr: 'عمّان ⇄ إربد',
      routeEn: 'Amman ⇄ Irbid',
      stars: 5,
    },
    {
      text: t( 'homeSections.testimonial2Text' ),
      name: t( 'homeSections.testimonial2Name' ),
      role: t( 'homeSections.testimonial2Role' ),
      routeAr: 'عمّان ⇄ العقبة',
      routeEn: 'Amman ⇄ Aqaba',
      stars: 5,
    },
    {
      text: t( 'homeSections.testimonial3Text' ),
      name: t( 'homeSections.testimonial3Name' ),
      role: t( 'homeSections.testimonial3Role' ),
      routeAr: 'عمّان ⇄ الزرقاء',
      routeEn: 'Amman ⇄ Zarqa',
      stars: 5,
    },
  ];

  return (
    <motion.section initial={ false } className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
          <div
            className="wasel-home-section-icon"
            style={ {
              background: 'rgba(0, 229, 255, 0.12)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              color: '#00E5FF',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.15)',
            } }
          >
            <MessageSquareQuote size={ 16 } />
          </div>
          <div>
            <div
              style={ {
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#00E5FF',
              } }
            >
              { ar ? 'تجارب مستخدمي واصل' : 'Jordanian Community Stories' }
            </div>
            <h2 className="wasel-home-section-title" style={ { marginTop: 2 } }>
              { t( 'homeSections.testimonialsTitle' ) }
            </h2>
          </div>
        </div>
      </div>
      <div className="wasel-home-testimonials">
        { testimonials.map( ( item, index ) => {
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
          const grad = AVATAR_GRADIENTS[ index % 3 ];
          const glow = AVATAR_GLOWS[ index % 3 ];
          return (
            <div
              key={ index }
              className="wasel-home-testimonial"
              style={ {
                background: 'rgba(8, 29, 57, 0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(20, 127, 228, 0.16)',
                borderTop: '1px solid rgba(0, 229, 255, 0.3)',
                boxShadow: '0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 10px 28px rgba(8, 29, 57, 0.35)',
                borderRadius: 18,
                padding: '22px',
              } }
            >
              <div style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } }>
                <div className="wasel-home-testimonial-stars">
                  { Array.from( { length: item.stars } ).map( ( _, i ) => (
                    <Star key={ i } size={ 14 } fill={ C.brandOrange } color={ C.brandOrange } />
                  ) ) }
                </div>
                <div
                  style={ {
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    color: '#00E5FF',
                  } }
                >
                  { ar ? item.routeAr : item.routeEn }
                </div>
              </div>

              <div
                className="wasel-home-testimonial-text"
                style={ { fontSize: '0.94rem', color: '#f8fbff', lineHeight: 1.7, marginTop: 10 } }
              >
                "{ item.text }"
              </div>

              <div className="wasel-home-testimonial-author" style={ { marginTop: 'auto', paddingTop: 14 } }>
                <div
                  style={ {
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: grad,
                    boxShadow: `0 0 0 2px ${ C.cardSolid }, 0 0 0 4px ${ glow }, 0 4px 14px ${ glow }`,
                    display: 'grid',
                    placeItems: 'center',
                    color: C.bgDeep,
                    fontSize: TYPE.size.base,
                    fontWeight: TYPE.weight.ultra,
                    flexShrink: 0,
                    letterSpacing: '-0.01em',
                  } }
                >
                  { item.name.charAt( 0 ) }
                </div>
                <div style={ { flex: 1 } }>
                  <div style={ { display: 'flex', alignItems: 'center', gap: 6 } }>
                    <span className="wasel-home-testimonial-name" style={ { fontSize: '0.92rem', fontWeight: 850 } }>
                      { item.name }
                    </span>
                    <span
                      style={ {
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#72C70D',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      } }
                    >
                      ✓ { ar ? 'موثق' : 'Verified' }
                    </span>
                  </div>
                  <div className="wasel-home-testimonial-role" style={ { fontSize: '0.76rem', color: C.textMuted } }>
                    { item.role }
                  </div>
                </div>
              </div>
            </div>
          );
        } ) }
      </div>
    </motion.section>
  );
}

function FinalCtaBanner ( { ar, onNavigate }: { ar: boolean; onNavigate: ( path: string, source?: string ) => void } ) {
  const { t } = useLanguage();
  return (
    <motion.section initial={ false } className="wasel-home-section">
      <div className="wasel-home-cta-banner">
        <h2 className="wasel-home-cta-title">
          { t( 'homeSections.finalCtaTitle' ) }
        </h2>
        <p className="wasel-home-cta-subtitle">
          { t( 'homeSections.finalCtaSubtitle' ) }
        </p>
        <div className="wasel-home-cta-actions">
          <WaselButton
            type="button"
            variant="primary"
            size="lg"
            icon={ <Route size={ 17 } /> }
            iconEnd={ ar ? <ArrowLeft size={ 16 } /> : <ArrowRight size={ 16 } /> }
            onClick={ () => { void onNavigate( '/find-ride', 'final_cta_find' ); } }
          >
            { t( 'homeSections.finalCtaFind' ) }
          </WaselButton>
          <WaselButton
            type="button"
            variant="outline"
            size="lg"
            icon={ <Globe2 size={ 17 } /> }
            onClick={ () => { void onNavigate( '/app/auth?tab=register', 'final_cta_register' ); } }
            style={ { background: C.elevated, color: C.text, border: `1px solid ${ C.border }` } }
          >
            { t( 'homeSections.finalCtaRegister' ) }
          </WaselButton>
        </div>
      </div>
    </motion.section>
  );
}

export default HomePage;
