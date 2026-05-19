import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SkipToContent } from '../components/SkipToContent';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { C, F, FA, GLOBAL_STYLES, GRAD } from '../utils/wasel-ds';
import { isVisibleNavGroup, PRODUCT_NAV_GROUPS } from './waselRootConfig';
import {
  Badge,
  CurrencySwitcher,
  LangToggle,
  MobileDrawer,
  NavDropdown,
  OnlineToggle,
  UserMenu,
} from './waselRootParts';

const PRIMARY_HEADER_GROUP_IDS = new Set(['find', 'offer', 'packages', 'bus', 'mobility-os']);
const AvailabilityBanner = lazy(() => import('../components/system/AvailabilityBanner'));
const MobileBottomNav = lazy(async () => {
  const module = await import('../components/MobileBottomNav');
  return { default: module.MobileBottomNav };
});

export default function WaselRoot() {
  const { user, signOut } = useLocalAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const ar = language === 'ar';

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const isDriverMode = user?.role === 'driver' || user?.role === 'both';
  const isAuthenticated = Boolean(user);

  const shellCopy = {
    notifications: ar ? 'الإشعارات' : 'Notifications',
    signIn: ar ? 'تسجيل الدخول' : 'Sign in',
    getStarted: ar ? 'ابدأ الآن' : 'Get started',
    openMenu: ar ? 'افتح القائمة' : 'Open menu',
    mainContent: ar ? 'المحتوى الرئيسي' : 'Main content',
  };

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setActiveGroup(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 8);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setActiveGroup(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const navigate = useCallback((path: string) => nav(path), [nav]);

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
        <style>{`
          @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          * { box-sizing: border-box; }
          input, select, button, textarea { font-family: inherit; }
          :focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
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
        `}</style>

        <header
          ref={navRef}
          className="wrl-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 500,
            transition: 'all 0.25s ease',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          <div
            style={{
              maxWidth: 1320,
              margin: '0 auto',
              padding: '0 20px',
              minHeight: 72,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
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
              <WaselLogo size={34} theme="light" variant="full" />
            </button>

            <nav
              style={{ display: 'flex', alignItems: 'center', flex: 1 }}
              className="wrl-desk-nav"
            >
              <style>{`
                @media (max-width: 899px) { .wrl-desk-nav { display: none !important; } }
                @media (max-width: 899px) { .wrl-desk-actions { display: none !important; } }
                @media (min-width: 900px) { .wrl-mobile-burger { display: none !important; } }
              `}</style>

              {PRODUCT_NAV_GROUPS.filter(
                group =>
                  isVisibleNavGroup(group, isAuthenticated) &&
                  PRIMARY_HEADER_GROUP_IDS.has(group.id),
              ).map((group, index) => {
                const isDirect = 'direct' in group && group.direct;
                const isActive = activeGroup === group.id;

                return (
                  <div key={group.id} style={{ position: 'relative' }}>
                    <button
                      onClick={() =>
                        isDirect
                          ? navigate((group as { path: string }).path)
                          : setActiveGroup(isActive ? null : group.id)
                      }
                      onMouseEnter={() => !isDirect && setActiveGroup(group.id)}
                      aria-haspopup={!isDirect ? 'true' : undefined}
                      aria-expanded={!isDirect ? isActive : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 40,
                        padding: '0 13px',
                        borderRadius: 999,
                        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? C.text : C.textSub,
                        fontFamily: ar ? FA : F,
                        transition: 'all 0.14s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: (group as { color?: string }).color,
                          boxShadow: `0 0 10px ${(group as { color?: string }).color ?? C.gold}55`,
                          flexShrink: 0,
                        }}
                      />
                      {ar ? group.labelAr : group.label}
                      {isDirect && (group as { badge?: string; color?: string }).badge ? (
                        <Badge
                          label={(group as { badge?: string }).badge ?? ''}
                          color={(group as { color?: string }).color}
                        />
                      ) : null}
                      {!isDirect ? (
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{
                            transform: isActive ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.14s',
                            opacity: 0.5,
                          }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      ) : null}
                    </button>

                    {!isDirect && isActive ? (
                      <NavDropdown
                        group={group}
                        onNavigate={path => {
                          navigate(path);
                          setActiveGroup(null);
                        }}
                        align={index === 0 ? 'left' : 'center'}
                        ar={ar}
                        isAuthenticated={isAuthenticated}
                      />
                    ) : null}
                  </div>
                );
              })}
            </nav>

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
                      borderRadius: 12,
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
                      borderRadius: 12,
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
                      borderRadius: 12,
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

            <button
              className="wrl-mobile-burger"
              onClick={() => setMobileOpen(value => !value)}
              aria-label={shellCopy.openMenu}
              style={{
                marginInlineStart: 'auto',
                width: 40,
                height: 40,
                borderRadius: 12,
                background: C.card,
                border: `1px solid ${C.border}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.14s',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.text}
                strokeWidth="2"
                strokeLinecap="round"
              >
                {mobileOpen ? (
                  <>
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </>
                ) : (
                  <>
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </header>

        <Suspense fallback={null}>
          <AvailabilityBanner ar={ar} />
        </Suspense>
        <MobileDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onNavigate={navigate}
          user={user}
          onSignOut={signOut}
          ar={ar}
        />

        <div className="wrl-main-content">
          <main
            id="main-content"
            role="main"
            aria-label={shellCopy.mainContent}
            tabIndex={-1}
            style={{ position: 'relative', isolation: 'isolate' }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at top center, rgba(88,221,255,0.07), transparent 30%), radial-gradient(circle at 80% 20%, rgba(71,214,158,0.06), transparent 24%)',
                zIndex: -1,
              }}
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
}
