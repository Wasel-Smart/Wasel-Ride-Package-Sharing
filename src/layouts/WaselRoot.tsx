import React, { memo, Suspense, lazy, useCallback, useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SkipToContent } from '../components/SkipToContent';
import { WaselLogo } from '../components/wasel-ui/WaselLogo';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { useRoutePrefetch } from '../hooks/useRoutePrefetch';
import { C, F, FA, GLOBAL_STYLES, GRAD, R, Z } from '../utils/wasel-ds';
import { trackPageView } from '../platform/telemetry';
import { getRouteMeta } from '../router/routeMeta';
import { resetBodyScrollLock } from '../utils/bodyScrollLock';
import {
  CurrencySwitcher,
  LangToggle,
  OnlineToggle,
  UserMenu,
} from './waselRootParts';

const AvailabilityBanner = lazy(() => import('../components/system/AvailabilityBanner'));
const MobileBottomNav = lazy(async () => {
  const module = await import('../components/MobileBottomNav');
  return { default: module.MobileBottomNav };
});

const HEADER_STYLE: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: Z.sticky,
  transition: 'all 0.25s ease',
  willChange: 'transform',
  transform: 'translateZ(0)',
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
    'radial-gradient(circle at top center, rgba(88,221,255,0.07), transparent 30%), radial-gradient(circle at 80% 20%, rgba(71,214,158,0.06), transparent 24%)',
  zIndex: -1,
};

const GLOBAL_HEADER_STYLES = `
  .wrl-header {
    background: linear-gradient(180deg, rgba(7,21,33,0.9), rgba(7,21,33,0.84));
    border-bottom: 1px solid ${C.border};
    box-shadow: 0 6px 18px rgba(0,0,0,0.14);
  }
  .wrl-header.scrolled {
    background: linear-gradient(180deg, rgba(7,21,33,0.98), rgba(7,21,33,0.95));
    border-bottom: 1px solid ${C.borderHov};
    box-shadow: 0 12px 34px rgba(0,0,0,0.28);
  }
  .wrl-dropdown-item:hover {
    background: ${C.cardSolid};
    transform: translateY(-1px);
  }
  @media (max-width: 639px) {
    .wrl-desk-actions { display: none !important; }
  }
  .wrl-main-content {
    flex: 1;
    min-height: 0;
  }
  @media (max-width: 899px) {
    .wrl-main-content {
      padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom, 0px)));
    }
  }
`;

const ShellCopy = {
  notifications: 'Notifications',
  signIn: 'Sign in',
  getStarted: 'Get started',
  mainContent: 'Main content',
} as const;

const ShellCopyAr = {
  notifications: 'الإشعارات',
  signIn: 'تسجيل الدخول',
  getStarted: 'ابدأ الآن',
  mainContent: 'المحتوى الرئيسي',
} as const;

const WaselRootInner = memo(function WaselRootInner() {
  const { user, signOut } = useLocalAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const ar = language === 'ar';

  const navRef = useRef<HTMLElement>(null);
  const isDriverMode = user?.role === 'driver' || user?.role === 'both';

  const shellCopy = useMemo(() => (ar ? ShellCopyAr : ShellCopy), [ar]);

  const navigate = useCallback((path: string) => nav(path), [nav]);

  useEffect(() => {
    const isPwa =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const scrollEl = isPwa ? (document.getElementById('root') ?? window) : window;

    const onScroll = () => {
      if (!navRef.current) return;
      const scrollTop =
        scrollEl instanceof Window ? window.scrollY : (scrollEl as HTMLElement).scrollTop;
      navRef.current.classList.toggle('scrolled', scrollTop > 8);
    };

    const onResize = () => onScroll();

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    onScroll();

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    resetBodyScrollLock();

    const isPwa =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isPwa) {
      const root = document.getElementById('root');
      if (root) root.scrollTop = 0;
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    const meta = getRouteMeta(location.pathname);
    if (meta?.analyticsKey) {
      trackPageView(meta.analyticsKey);
    }
  }, [location.pathname]);

  useRoutePrefetch();

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          fontFamily: ar ? FA : F,
          direction: ar ? 'rtl' : 'ltr',
        }}
      >
        <SkipToContent targetId="main-content" />
        <style>{GLOBAL_HEADER_STYLES}</style>

        <header
          ref={navRef}
          className="wrl-header"
          style={HEADER_STYLE}
        >
          <div style={HEADER_INNER_STYLE}>
            <button
              onClick={() => navigate('/app')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <WaselLogo size={56} theme="light" variant="full" />
            </button>

            <div
              className="wrl-desk-actions"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexShrink: 0,
                paddingInlineStart: 10,
                borderInlineStart: `1px solid ${C.borderFaint}`,
              }}
            >
              <LangToggle />
              {user ? <CurrencySwitcher ar={ar} /> : null}
              {user && isDriverMode ? <OnlineToggle ar={ar} /> : null}

              {user ? (
                <>
                  <button
                    onClick={() => navigate('/notifications')}
                    title={shellCopy.notifications}
                    aria-label={shellCopy.notifications}
                    style={{
                      position: 'relative',
                      width: 38,
                      height: 38,
                      borderRadius: R.md,
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.14s',
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.textSub}
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        insetInlineEnd: 6,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: C.error,
                        border: `1.5px solid ${C.bg}`,
                      }}
                    />
                  </button>
                  <UserMenu user={user} onSignOut={signOut} ar={ar} />
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/auth')}
                    style={{
                      height: 38,
                      padding: '0 16px',
                      borderRadius: R.md,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: 'transparent',
                      border: `1.5px solid ${C.border}`,
                      color: C.text,
                      fontFamily: ar ? FA : F,
                      cursor: 'pointer',
                      transition: 'all 0.14s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shellCopy.signIn}
                  </button>
                  <button
                    onClick={() => navigate('/auth?tab=register')}
                    style={{
                      height: 40,
                      padding: '0 18px',
                      borderRadius: R.md,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: GRAD,
                      border: 'none',
                      color: C.bg,
                      fontFamily: ar ? FA : F,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.14s',
                      boxShadow: '0 10px 24px rgba(56,190,255,0.22)',
                    }}
                  >
                    {shellCopy.getStarted}
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <Suspense fallback={null}>
          <AvailabilityBanner ar={ar} />
        </Suspense>

        <div className="wrl-main-content content-visibility-auto">
          <main
            id="main-content"
            role="main"
            aria-label={shellCopy.mainContent}
            tabIndex={-1}
            style={MAIN_CONTENT_STYLE}
          >
            <div
              aria-hidden="true"
              style={BACKGROUND_OVERLAY_STYLE}
            />
            <Outlet />
          </main>

          <Suspense fallback={null}>
            <MobileBottomNav language={language} />
          </Suspense>
        </div>
      </div>
    </>
  );
});

export default memo(function WaselRoot() {
  return <WaselRootInner />;
});
