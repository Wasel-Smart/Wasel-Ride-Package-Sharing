import React, { memo, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router';
import { CORE_NAV_ITEMS } from '../config/user-navigation';
import { SkipToContent } from '../components/SkipToContent';
import { WaselLogo } from '../components/wasel-ui/WaselLogo';
import { WaselButton } from '../components/wasel-ui/WaselButton';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { toAppHref, useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { handleSpaLinkClick } from '../utils/linkNavigation';
import { useRoutePrefetch } from '../hooks/useRoutePrefetch';
import { C, F, FA, GLOBAL_STYLES, R, Z } from '../utils/wasel-ds';
import { trackPageView } from '../platform/telemetry';
import { getRouteMeta } from '../router/routeMeta';
import { WaselRouteTransition } from '../components/wasel-ui/WaselRouteTransition';
import { resetBodyScrollLock } from '../utils/bodyScrollLock';
import { useSeo, OrganizationJsonLd, WebSiteJsonLd } from '../utils/seo';
import { CurrencySwitcher, LangToggle, OnlineToggle } from './waselRootParts';
import { MobileDrawer, UserMenu } from './root-parts/accessible-overlays';

const AvailabilityBanner = lazy( () => import( '../components/system/AvailabilityBanner' ) );
const MobileBottomNav = lazy( async () => {
  const module = await import( '../components/MobileBottomNav' );
  return { default: module.MobileBottomNav };
} );

const HEADER_STYLE: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: Z.sticky,
  transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
};

const HEADER_INNER_STYLE: React.CSSProperties = {
  maxWidth: 1320,
  margin: '0 auto',
  padding: '0 20px',
  minHeight: 72,
  display: 'flex',
  alignItems: 'center',
  gap: 18,
};

const MAIN_CONTENT_STYLE: React.CSSProperties = {
  position: 'relative',
  isolation: 'isolate',
};

const BACKGROUND_OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background:
    'radial-gradient(circle at top center, rgba(0,229,255,0.08), transparent 30%), radial-gradient(circle at 80% 20%, rgba(114,199,13,0.06), transparent 24%)',
  zIndex: -1,
};

const GLOBAL_HEADER_STYLES = `
  .wrl-header {
    background: linear-gradient(180deg, rgba(8,29,57,0.92), rgba(8,29,57,0.86));
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid ${ C.border };
    box-shadow: 0 6px 18px rgba(8,29,57,0.18);
  }
  .wrl-header.scrolled {
    background: linear-gradient(180deg, rgba(8,29,57,0.98), rgba(8,29,57,0.95));
    border-bottom: 1px solid ${ C.borderHov };
    box-shadow: 0 12px 34px rgba(8,29,57,0.34);
  }
  .wrl-header button:focus-visible,
  .wrl-header a:focus-visible {
    /* Solid cyan: the old 20%-alpha glow outline was far below 3:1 on the header. */
    outline: 2px solid ${ C.cyan };
    outline-offset: 2px;
  }
  .wrl-dropdown-item:hover {
    background: ${ C.cardSolid };
    transform: translateY(-1px);
  }
  .wrl-desk-nav {
    display: none;
    align-items: center;
    gap: 4px;
    margin-inline-start: 12px;
  }
  @media (min-width: 900px) {
    .wrl-desk-nav { display: flex; }
  }
  .wrl-desk-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    height: 40px;
    padding: 0 14px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: ${ C.textSub };
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: background 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1);
  }
  .wrl-desk-link:hover { background: ${ C.cyanDim }; color: ${ C.text }; }
  .wrl-desk-link[aria-current='page'] { color: ${ C.cyan }; background: ${ C.cyanDim }; }
  .wrl-desk-link:focus-visible { outline: 2px solid ${ C.cyan }; outline-offset: 2px; }
  .wrl-desk-link[data-accent='gold'][aria-current='page'] { color: ${ C.gold }; background: ${ C.goldDim }; }
  .wrl-desk-link[aria-current='page']::after {
    content: '';
    position: absolute;
    inset-inline: 14px;
    bottom: 3px;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
  }
  .wrl-mobile-actions {
    display: none;
    align-items: center;
    gap: 8px;
    margin-inline-start: auto;
  }
  @media (max-width: 639px) {
    .wrl-desk-actions { display: none !important; }
    .wrl-mobile-actions { display: flex; }
  }
  .wrl-main-content {
    flex: 1;
    min-height: 0;
  }
  @media (max-width: 899px) {
    .wrl-main-content {
      padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    }
  }
`;

const ShellCopy = {
  notifications: 'Notifications',
  signIn: 'Sign in',
  getStarted: 'Get started',
  mainContent: 'Main content',
  menu: 'Menu',
  home: 'Wasel home',
  mainNav: 'Main navigation',
} as const;

const ShellCopyAr = {
  notifications: 'الإشعارات',
  signIn: 'تسجيل الدخول',
  getStarted: 'ابدأ الآن',
  mainContent: 'المحتوى الرئيسي',
  menu: 'القائمة',
  home: 'واصل — الرئيسية',
  mainNav: 'التنقل الرئيسي',
} as const;

function isNavPathActive(path: string, pathname: string): boolean {
  const full = `/app${path}`;
  return pathname === full || pathname.startsWith(`${full}/`) || pathname === path;
}

const WaselRootInner = memo( () => {
  const { user, signOut } = useLocalAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const ar = language === 'ar';

  const navRef = useRef<HTMLElement>( null );
  const [ drawerOpen, setDrawerOpen ] = useState( false );
  const isDriverMode = user?.role === 'driver' || user?.role === 'both';

  const shellCopy = useMemo( () => ( ar ? ShellCopyAr : ShellCopy ), [ ar ] );

  const navigate = useCallback( ( path: string ) => nav( path ), [ nav ] );

  const meta = getRouteMeta( location.pathname );

  const seoMeta = useMemo(
    () =>
      meta
        ? {
          title: meta.title,
          titleAr: meta.titleAr,
          description: meta.description,
          descriptionAr: meta.descriptionAr,
          canonical: `https://wasel14.online${ meta.path }`,
        }
        : undefined,
    [ meta ],
  );

  useSeo( seoMeta );

  useEffect( () => {
    const isPwa =
      window.matchMedia( '(display-mode: standalone)' ).matches ||
      ( navigator as Navigator & { standalone?: boolean } ).standalone === true;
    const scrollEl = isPwa ? ( document.getElementById( 'root' ) ?? window ) : window;

    const onScroll = () => {
      if ( !navRef.current ) { return; }
      const scrollTop =
        scrollEl instanceof Window ? window.scrollY : ( scrollEl as HTMLElement ).scrollTop;
      navRef.current.classList.toggle( 'scrolled', scrollTop > 8 );
    };

    const onResize = () => onScroll();

    scrollEl.addEventListener( 'scroll', onScroll, { passive: true } );
    window.addEventListener( 'resize', onResize, { passive: true } );
    onScroll();

    return () => {
      scrollEl.removeEventListener( 'scroll', onScroll );
      window.removeEventListener( 'resize', onResize );
    };
  }, [] );

  useEffect( () => {
    resetBodyScrollLock();
    setDrawerOpen( false );

    const isPwa =
      window.matchMedia( '(display-mode: standalone)' ).matches ||
      ( navigator as Navigator & { standalone?: boolean } ).standalone === true;

    if ( isPwa ) {
      const root = document.getElementById( 'root' );
      if ( root ) { root.scrollTop = 0; }
    } else {
      window.scrollTo( { top: 0, left: 0, behavior: 'instant' } );
    }

    if ( meta?.analyticsKey ) {
      trackPageView( meta.analyticsKey );
    }
  }, [ location.pathname, meta ] );

  useRoutePrefetch();

  return (
    <>
      <style>{ GLOBAL_STYLES }</style>
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      <div
        style={ {
          minHeight: '100dvh',
          background: C.bg,
          fontFamily: ar ? FA : F,
          direction: ar ? 'rtl' : 'ltr',
        } }
      >
        <SkipToContent targetId="main-content" />
        <style>{ GLOBAL_HEADER_STYLES }</style>

        <header
          ref={ navRef }
          className="wrl-header"
          style={ HEADER_STYLE }
        >
          <div style={ HEADER_INNER_STYLE }>
            <a
              href="/app"
              aria-label={ shellCopy.home }
              onClick={ event => handleSpaLinkClick( event, () => { void navigate( '/app' ); } ) }
              style={ {
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              } }
            >
              <WaselLogo size={ 36 } theme="light" variant="full" />
            </a>

            <nav className="wrl-desk-nav" aria-label={ shellCopy.mainNav }>
              { CORE_NAV_ITEMS.map( item => {
                const active = isNavPathActive( item.path, location.pathname );
                const label = item.id === 'mobility-os'
                  ? ( ar ? item.labelAr : 'Network' )
                  : ( ar ? item.labelAr : item.label );
                return (
                  <a
                    key={ item.id }
                    href={ toAppHref( item.path ) }
                    className="wrl-desk-link"
                    data-accent={ item.accent }
                    aria-current={ active ? 'page' : undefined }
                    onClick={ event => handleSpaLinkClick( event, () => { void navigate( item.path ); } ) }
                  >
                    { label }
                  </a>
                );
              } ) }
            </nav>

            <div style={ { flex: 1 } } />

            <div className="wrl-mobile-actions">
              { user ? (
                <button
                  type="button"
                  onClick={ () => { void navigate( '/app/notifications' ); } }
                  aria-label={ shellCopy.notifications }
                  style={ {
                    width: 44,
                    height: 44,
                    borderRadius: R.md,
                    background: C.card,
                    border: `1px solid ${ C.border }`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  } }
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ C.textSub } strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
              ) : null }
              <button
                type="button"
                onClick={ () => setDrawerOpen( true ) }
                aria-label={ shellCopy.menu }
                aria-haspopup="dialog"
                aria-expanded={ drawerOpen }
                style={ {
                  width: 44,
                  height: 44,
                  borderRadius: R.md,
                  background: C.card,
                  border: `1px solid ${ C.border }`,
                  color: C.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                } }
              >
                <Menu size={ 20 } aria-hidden="true" />
              </button>
            </div>

            <div
              className="wrl-desk-actions"
              style={ {
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexShrink: 0,
                paddingInlineStart: 10,
                borderInlineStart: `1px solid ${ C.borderFaint }`,
              } }
            >
              <LangToggle />
              { user ? <CurrencySwitcher ar={ ar } /> : null }
              { user && isDriverMode ? <OnlineToggle ar={ ar } /> : null }

              { user ? (
                <>
                  <button
                    onClick={ () => { void navigate( '/app/notifications' ); } }
                    title={ shellCopy.notifications }
                    aria-label={ shellCopy.notifications }
                    style={ {
                      position: 'relative',
                      width: 40,
                      height: 40,
                      borderRadius: R.md,
                      background: C.card,
                      border: `1px solid ${ C.border }`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.14s',
                    } }
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={ C.textSub }
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </button>
                  <UserMenu user={ user } onSignOut={ signOut } ar={ ar } />
                </>
              ) : (
                <>
                  <WaselButton
                    variant="ghost"
                    size="sm"
                    onClick={ () => { void navigate( '/app/auth' ); } }
                    style={ { fontFamily: ar ? FA : F } }
                  >
                    { shellCopy.signIn }
                  </WaselButton>
                  <WaselButton
                    variant="primary"
                    size="sm"
                    onClick={ () => { void navigate( '/app/auth' ); } }
                    style={ { fontFamily: ar ? FA : F } }
                  >
                    { shellCopy.getStarted }
                  </WaselButton>
                </>
              ) }
            </div>
          </div>
        </header>

        <MobileDrawer
          open={ drawerOpen }
          onClose={ () => setDrawerOpen( false ) }
          onNavigate={ navigate }
          user={ user ? { name: user.name, email: user.email } : null }
          onSignOut={ signOut }
          ar={ ar }
          isDriver={ Boolean( user && isDriverMode ) }
        />

        <Suspense fallback={ null }>
          <AvailabilityBanner ar={ ar } />
        </Suspense>

        <div className="wrl-main-content">
          <main
            id="main-content"
            aria-label={ shellCopy.mainContent }
            tabIndex={ -1 }
            style={ MAIN_CONTENT_STYLE }
          >
            <div
              aria-hidden="true"
              style={ BACKGROUND_OVERLAY_STYLE }
            />
            <WaselRouteTransition>
              <Outlet />
            </WaselRouteTransition>
          </main>
        </div>

        <Suspense fallback={
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: `calc(56px + env(safe-area-inset-bottom, 0px))`,
              background: 'rgba(8,29,57,0.96)',
              borderTop: '1px solid rgba(0,229,255,0.16)',
              zIndex: 100,
            }}
          />
        }>
          <MobileBottomNav language={ language } />
        </Suspense>
      </div>
    </>
  );
} );

export default memo( () => <WaselRootInner /> );
