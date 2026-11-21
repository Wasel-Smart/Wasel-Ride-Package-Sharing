import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Car, Package, Bus, Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Language } from '../../locales/translations';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLiveUserStats } from '../../services/liveDataService';
import { buildCorridorBetaPlan } from '../../services/corridorBeta';
import { CurrencyService } from '../../utils/currency';
import { trackUserAction } from '../../utils/monitoring';
import { API_URL } from '../../services/core';
import { WaselErrorBoundary } from '../../components/ErrorBoundary';
import { SkipToContent } from '../../components/SkipToContent';
import { readCookieDecision, saveCookieDecision } from '../../utils/analyticsConsent';
import { ActiveTripsBanner } from '../../components/TripProgressCard';
import { C, F, POPULAR_ROUTES, TYPE } from './HomePageShared';
import cookieBannerStyles from './sections/CookieBanner.module.css';
import {
  CorridorsSection,
  CorridorBetaFocusSection,
  CoverageSection,
  FinalCtaBanner,
  HomeHeroSection,
  HomePageStyles,
  LandingLegalFooter,
  LandingSections,
  OnboardingDemoSection,
  ProofSection,
  QuickActionsSection,
  SignedInUtilitySection,
  StructuredData,
  TrustPagesSection,
  type CorridorCard,
  type HeroTickerItem,
  type QuickAction,
} from './HomePageSections';

// BRAND_GUIDELINES.md motion rules: 150/200/280ms durations, standard easing
// cubic-bezier(0.4, 0, 0.2, 1), opacity/position only (no glow animation).
// Applied via whileInView so sections settle in once as they scroll into
// view, and skipped outright for prefers-reduced-motion via useReducedMotion
// below — previously these were framer-motion components with no motion at
// all (`initial={false}`, no animate/whileInView), which cost bundle weight
// and a wrapper element for zero visible effect.
const sectionRiseTransition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

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
      className={ cookieBannerStyles.cookieBanner }
      role="dialog"
      aria-label={ t( 'cookies.title' ) }
      aria-modal="true"
    >
      <span className={ cookieBannerStyles.cookieBannerContent }>
        { t( 'cookies.description' ) }{ ' ' }
        <a
          href="/app/privacy"
          className={ cookieBannerStyles.cookieBannerLink }
        >
          { t( 'cookies.privacy_policy' ) }
        </a>
      </span>
      <div className={ cookieBannerStyles.cookieBannerActions }>
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
  const [ decision, setDecision ] = useState( readCookieDecision );
  const cookieBannerRef = useRef<HTMLDivElement | null>( null );

  useEffect( () => {
    const savedCookieConsent = readCookieDecision();
    let savedLanguage: string | null = null;
    try {
      savedLanguage = localStorage.getItem( 'wasel-language' );
    } catch {
      // Language detection is optional; keep the current language if storage is blocked.
    }

    if ( typeof navigator === 'undefined' ) { return; }
    const browserLang = navigator.language.split( '-' )[ 0 ];
    const detectedLang = ( browserLang === 'ar' || browserLang === 'en' ) ? browserLang : null;
    if ( !savedCookieConsent && !savedLanguage && detectedLang && detectedLang !== language ) {
      setLanguage( detectedLang );
    }
  }, [ language, setLanguage ] );

  const acceptCookies = () => {
    saveCookieDecision( 'accepted' );
    setDecision( 'accepted' );
  };

  const declineCookies = () => {
    saveCookieDecision( 'declined' );
    setDecision( 'declined' );
  };

  useEffect( () => {
    if ( decision !== null ) { return; }

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    cookieBannerRef.current
      ?.querySelector<HTMLElement>( 'button:not([disabled]), a[href]' )
      ?.focus();

    return () => previousFocus?.focus();
  }, [ decision ] );

  useEffect( () => {
    if ( decision !== null ) { return; }

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
      const first = focusable.at( 0 );
      const last = focusable.at( -1 );
      if ( !first || !last ) { return; }
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
  }, [ decision ] );

  return {
    cookieConsented: decision !== null,
    cookieDeclined: decision === 'declined',
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
  const reduceMotion = useReducedMotion();
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
      initial={ reduceMotion ? false : { opacity: 0, y: 8 } }
      animate={ { opacity: 1, y: 0 } }
      transition={ sectionRiseTransition }
      className="wasel-home-section"
      style={ {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 16,
        background: C.cyanDim,
        border: `1px solid ${ 'var(--border)' }`,
      } }
    >
      <div
        style={ {
          width: 36,
          height: 36,
          borderRadius: 10,
          background: C.brandBlue,
          color: 'var(--foreground)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: TYPE.weight.black,
          fontSize: TYPE.size.sm,
        } }
      >
        { roleLetter }
      </div>
      <div style={ { flex: 1 } }>
        <div style={ { fontWeight: TYPE.weight.black, fontSize: TYPE.size.base, color: 'var(--foreground)' } }>
          { t( roleTitleKey ) }
        </div>
        <div style={ { fontSize: TYPE.size.xs, color: 'var(--muted-foreground)', marginTop: 2 } }>
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
        color: 'var(--primary)',
        dim: C.cyanDim,
        border: 'var(--border)',
        path: '/find-ride',
      },
      {
        icon: Car,
        kicker: t( 'homeSections.offerRideKicker' ),
        title: t( 'homeSections.offerRideTitle' ),
        desc: t( 'homeSections.offerRideDesc' ),
        outcome: t( 'homeSections.offerRideOutcome' ),
        color: 'var(--primary)',
        dim: C.cyanDim,
        border: 'var(--border)',
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
        color: 'var(--primary)',
        dim: C.cyanDim,
        border: 'var(--border)',
        path: '/schedule',
      },
    ];

    const [ first, second, third, fourth, fifth ] = base;
    if ( !first || !second || !third || !fourth || !fifth ) { return base; }
    if ( role === 'driver' || role === 'both' ) {
      return [ second, first, third, fourth, fifth ];
    }
    if ( role === 'admin' ) {
      return [ first, third, second, fourth, fifth ];
    }
    return base;
  }, [ role, t ] );
}

function useCorridorCards ( ar: boolean, svc: CurrencyService, t: ( key: string ) => string ) {
  const [ liveCorridors, setLiveCorridors ] = useState<LiveCorridor[]>( [] );
  const [ corridorsLoading, setCorridorsLoading ] = useState( Boolean( API_URL ) );

  useEffect( () => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCorridors () {
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
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [] );

  const cards = useMemo<CorridorCard[]>( () => {
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
          priceLabel: svc.formatFromJOD( item.priceJod ),
          statLabel: `${ occupancy }% ${ ar ? 'محجوز' : 'booked' }`,
          insight: index === 0
            ? ( ar ? 'أفضل توازن بين العرض والطلب اليوم' : 'Best balance of supply and demand today' )
            : ( ar ? 'حركة واضحة على هذا المسار الآن' : 'Visible live movement on this corridor' ),
          featured: index === 0,
          path: `/find-ride?from=${ encodeURIComponent( from ) }&to=${ encodeURIComponent( to ) }&search=1`,
          accent: 'var(--primary)',
        };
      } );
    }

    // Fallback is the static popular-routes list. Per-device growth events are
    // not shown here: they are the visitor's own activity, not platform-wide
    // "active now" counts.
    return POPULAR_ROUTES.slice( 0, 3 ).map( ( route, index ) => ( {
      key: `${ route.from }-${ route.to }`,
      title: ar ? `${ route.fromAr } ← ${ route.toAr }` : `${ route.from } → ${ route.to }`,
      detail: `${ route.dist } ${ ar ? 'كم' : 'km' } - ${ svc.formatFromJOD( route.priceJod ) }`,
      meta: t( 'homeSections.popularCorridor' ),
      priceLabel: svc.formatFromJOD( route.priceJod ),
      statLabel: `${ route.dist } ${ ar ? 'كم' : 'km' }`,
      insight: index === 0 ? t( 'homeSections.balancedPick' ) : t( 'homeSections.readyForComparison' ),
      featured: index === 0,
      path: `/find-ride?from=${ encodeURIComponent( route.from ) }&to=${ encodeURIComponent( route.to ) }`,
      accent: route.color,
    } ) );
  }, [ ar, svc, t, liveCorridors, corridorsLoading ] );

  return { cards, isLive: !corridorsLoading && liveCorridors.length > 0 };
}

function useHeroTickerItems ( corridorCards: CorridorCard[] ): HeroTickerItem[] {
  return useMemo<HeroTickerItem[]>(
    () =>
      corridorCards
        .filter( card => card.priceLabel )
        .map( card => ( {
          key: card.key,
          route: card.title,
          price: card.priceLabel ?? '',
          stat: card.statLabel ?? card.meta,
        } ) ),
    [ corridorCards ],
  );
}

type HomePageAudienceSectionsProps = {
  placement: 'before-actions' | 'after-actions' | 'closing';
  user: ReturnType<typeof useAuth>['user'];
  role: NonNullable<ReturnType<typeof useAuth>['waselUser']>['role'] | undefined;
  waselUser: ReturnType<typeof useAuth>['waselUser'];
  languageIsArabic: boolean;
  liveStats: ReturnType<typeof useLiveUserStats>['stats'];
  loading: boolean;
  formatCurrency: (amount: number) => string;
  trustScore: number | null;
  t: ReturnType<typeof useLanguage>['t'];
  onNavigate: (path: string, source?: string) => void;
};

function HomePageAudienceSections ( props: HomePageAudienceSectionsProps ) {
  const {
    placement,
    user,
    role,
    waselUser,
    languageIsArabic,
    liveStats,
    loading,
    formatCurrency,
    trustScore,
    t,
    onNavigate,
  } = props;

  if ( placement === 'before-actions' ) {
    return <>
      { !user && <ProofSection ar={ languageIsArabic } onNavigate={ onNavigate } /> }
      { user && <ActiveTripsBanner onNavigate={ onNavigate } /> }
      { user && role && <RoleBanner role={ role } t={ t } /> }
    </>;
  }
  if ( placement === 'after-actions' ) {
    return !user ? <OnboardingDemoSection ar={ languageIsArabic } onNavigate={ onNavigate } /> : null;
  }
  return <>
    { !user && <FinalCtaBanner ar={ languageIsArabic } onNavigate={ onNavigate } /> }
    { user && (
      <SignedInUtilitySection
        ar={ languageIsArabic }
        loading={ loading }
        walletBalance={ formatCurrency( liveStats?.walletBalance ?? 0 ) }
        trustScore={ trustScore }
        user={ waselUser ? {
          emailVerified: waselUser.emailVerified,
          phoneVerified: waselUser.phoneVerified,
          verified: waselUser.verified,
          trips: waselUser.trips,
          rating: waselUser.rating,
        } : undefined }
      />
    ) }
  </>;
}

export function HomePage () {
  const { language, dir, setLanguage, t } = useLanguage();
  const { user, waselUser } = useAuth();
  const navigate = useIframeSafeNavigate();
  const { stats: liveStats, loading } = useLiveUserStats();

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();
  const firstName = user?.user_metadata?.name?.split( ' ' )[ 0 ] || user?.email?.split( '@' )[ 0 ] || '';
  const role = waselUser?.role;
  const corridorBetaPlan = useMemo( () => buildCorridorBetaPlan(), [] );
  const trustScore = waselUser?.trustScore ?? null;
  // One-way only: `parseFindRideParams` (src/pages/waselCorePageHelpers.ts) reads
  // only from/to/date/search, so a `?mode=round` link produced an identical
  // one-way search. The round-trip control was removed rather than left doing
  // nothing.
  const primaryTripPath = '/find-ride';

  const { cookieConsented, cookieDeclined, cookieBannerRef, acceptCookies, declineCookies } =
    useCookieConsent( language, setLanguage );

  const { cards: corridorCards, isLive: corridorsLive } = useCorridorCards( ar, svc, t );
  const quickActions = useHomeQuickActions( role, t );
  // The ticker is labelled "live", so it only renders from the real snapshot,
  // never from the static popular-routes fallback.
  const heroTickerItems = useHeroTickerItems( corridorsLive ? corridorCards : [] );

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
      signedIn: Boolean( user?.id ),
    } );
    navigate( path );
  };

  const audienceSectionProps = {
    user,
    role,
    waselUser,
    languageIsArabic: ar,
    liveStats,
    loading,
    formatCurrency: ( amount: number ) => svc.formatFromJOD( amount ),
    trustScore,
    t,
    onNavigate: handleNavigate,
  };

  return (
    <WaselErrorBoundary>
      <div className="wasel-home-shell" dir={ dir } style={ { color: 'var(--foreground)', fontFamily: F } }>
        <HomePageStyles />
        <StructuredData ar={ ar } />
        <SkipToContent targetId="main-content" />

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

        <main id="main-content" tabIndex={ -1 } className="wasel-home-container relative z-10">
          <HomeHeroSection
            ar={ ar }
            user={ user }
            firstName={ firstName }
            onNavigate={ handleNavigate }
            primaryTripPath={ primaryTripPath }
            tickerItems={ heroTickerItems }
          />

          <CoverageSection ar={ ar } onNavigate={ handleNavigate } />

          <HomePageAudienceSections { ...audienceSectionProps } placement="before-actions" />

          <QuickActionsSection quickActions={ quickActions } onNavigate={ handleNavigate } />

          <HomePageAudienceSections { ...audienceSectionProps } placement="after-actions" />

          <CorridorBetaFocusSection ar={ ar } plan={ corridorBetaPlan } onNavigate={ handleNavigate } />

          <CorridorsSection corridorCards={ corridorCards } onNavigate={ handleNavigate } />

          <Suspense fallback={ null }>
            <CorridorGlobeSection ar={ ar } />
          </Suspense>

          <TrustPagesSection ar={ ar } onNavigate={ handleNavigate } />

          <HomePageAudienceSections { ...audienceSectionProps } placement="closing" />

          <LandingSections ar={ ar } onNavigate={ handleNavigate } />

          <LandingLegalFooter ar={ ar } onNavigate={ handleNavigate } />

          { /* Accent policy (BRAND_GUIDELINES.md): cyan = primary actions, orange =
               parcels, green = bus/success. Quick actions follow it.

               Removed from the signed-out page:
               - TestimonialsSection: the quotes are hardcoded, not sourced from real
                 riders. Put it back once they are real, attributable testimonials.
               - SignedOutCtaSection: a second closing CTA that repeated
                 FinalCtaBanner directly above it.

               HowItWorksSection / StatsStrip were removed earlier for restating
               OnboardingDemoSection / ProofSection. FinalCtaBanner's second button
               is "Register", so it stays scoped to !user. */ }
        </main>
      </div>
    </WaselErrorBoundary>
  );
}

export default HomePage;
