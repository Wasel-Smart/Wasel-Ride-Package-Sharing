import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { SkipToContent } from '../components/SkipToContent';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { C, F, R, GLOBAL_STYLES } from '../utils/wasel-ds';
import { buildAuthPagePath } from '../utils/authFlow';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { AvailabilityBanner } from '../components/system/AvailabilityBanner';
import { WaselBusinessFooter } from '../components/system/WaselPresence';
import {
  DESKTOP_PRIMARY_NAV_IDS,
  isDirectNavGroup,
  isNavGroupActive,
  isVisibleNavGroup,
  PRODUCT_NAV_GROUPS,
} from './waselRootConfig';
import {
  AppPill,
  Badge,
  CurrencySwitcher,
  DesktopOverflowMenu,
  LangToggle,
  MobileDrawer,
  NavDropdown,
  OnlineToggle,
  UserMenu,
} from './waselRootParts';

export default function WaselRoot() {
  const { user, signOut } = useLocalAuth();
  const { language } = useLanguage();
  const { unreadCount } = useNotifications();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const ar = language === 'ar';

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isDriverMode = user?.role === 'driver' || user?.role === 'both';
  const isAuthenticated = Boolean(user);
  const preferredPrimaryIds = new Set<string>(DESKTOP_PRIMARY_NAV_IDS);
  const visibleNavGroups = PRODUCT_NAV_GROUPS.filter((group) =>
    isVisibleNavGroup(group, isAuthenticated),
  );
  const activeNavGroup =
    visibleNavGroups.find((group) =>
      isNavGroupActive(group, location.pathname, isAuthenticated),
    ) ?? null;

  const maxPrimaryGroups = 5;
  const primaryGroups = visibleNavGroups
    .filter((group) => preferredPrimaryIds.has(group.id))
    .slice(0, maxPrimaryGroups);

  for (const group of visibleNavGroups) {
    if (primaryGroups.length >= maxPrimaryGroups) break;
    if (!primaryGroups.some((item) => item.id === group.id)) {
      primaryGroups.push(group);
    }
  }

  if (
    activeNavGroup &&
    !primaryGroups.some((group) => group.id === activeNavGroup.id)
  ) {
    if (primaryGroups.length >= maxPrimaryGroups) primaryGroups.pop();
    primaryGroups.push(activeNavGroup);
  }

  const primaryGroupIds = new Set(primaryGroups.map((group) => group.id));
  const secondaryGroups = visibleNavGroups.filter(
    (group) => !primaryGroupIds.has(group.id),
  );

  const notificationsLabel = ar ? 'الإشعارات' : 'Notifications';
  const unreadNotificationsLabel =
    unreadCount > 0
      ? ar
        ? `${unreadCount} إشعارات غير مقروءة`
        : `${unreadCount} unread notifications`
      : notificationsLabel;

  /* ── Scroll detection ──────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Close nav dropdown on outside click ───────────────────────────── */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveGroup(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /* ── Close everything on route change ──────────────────────────────── */
  useEffect(() => {
    setActiveGroup(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const navigate = useCallback((path: string) => nav(path), [nav]);
  const handleSignOut = useCallback(async () => {
    await signOut();
    window.location.replace('/');
  }, [signOut]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--wasel-shell-background, radial-gradient(circle at 16% 14%, rgba(101,225,255,0.12), transparent 24%), radial-gradient(circle at 82% 10%, rgba(25,231,187,0.08), transparent 20%), linear-gradient(180deg, #09131f 0%, #050c15 100%))',
        fontFamily: F,
        direction: ar ? 'rtl' : 'ltr',
      }}
    >
      <SkipToContent targetId="main-content" />

      {/* Scoped keyframes — not polluting the global stylesheet */}
      <style>{GLOBAL_STYLES + `
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button, textarea { font-family: inherit; }
        :focus-visible { outline: 2px solid var(--primary, #19E7BB); outline-offset: 2px; }
      `}</style>

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <header
        ref={navRef}
        data-wasel-nav
        className="wasel-sticky-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 500,
          background: scrolled
            ? 'var(--wasel-header-bg-scrolled, rgba(6,23,38,0.95))'
            : 'var(--wasel-header-bg, rgba(7,24,39,0.84))',
          backdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${scrolled ? 'var(--wasel-header-border-scrolled, rgba(25,231,187,0.20))' : 'var(--wasel-header-border, rgba(25,231,187,0.12))'}`,
          boxShadow: scrolled
            ? 'var(--wasel-shadow-md, 0 18px 44px rgba(1,10,18,0.28))'
            : 'var(--wasel-shadow-sm, 0 8px 24px rgba(1,10,18,0.18))',
          transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: '0 auto',
            padding: '12px 20px',
            minHeight: 76,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={ar ? 'العودة إلى واصل' : 'Go to Wasel home'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              transition: 'opacity 0.15s',
              minHeight: 52,
              minWidth: 52,
            }}
          >
            <WaselLogo
              size={36}
              theme="light"
              variant="full"
              showWordmark
              subtitle=""
              framed={false}
            />
          </button>

          {/* Brand pill — hidden below 1340px */}
          <div className="wrl-brand-pill" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <style>{`@media (max-width: 1340px) { .wrl-brand-pill { display: none !important; } }`}</style>
            <AppPill ar={ar} />
          </div>

          {/* Desktop nav */}
          <nav
            aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'}
            style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
            className="wrl-desk-nav"
          >
            <style>{`
              @media (max-width: 899px) { .wrl-desk-nav { display: none !important; } }
              @media (max-width: 899px) { .wrl-desk-actions { display: none !important; } }
              @media (min-width: 900px) { .wrl-mobile-burger { display: none !important; } }
            `}</style>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                width: '100%',
                minWidth: 0,
                padding: 5,
                borderRadius: R.full,
                background:
                  'linear-gradient(180deg, rgba(220,255,248,0.05), rgba(220,255,248,0.015)), rgba(11,19,29,0.74)',
                border: '1px solid rgba(25,231,187,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(220,255,248,0.04)',
              }}
            >
              {primaryGroups.map((group, index) => {
                const isDirect = isDirectNavGroup(group);
                const isOpen = activeGroup === group.id;
                const isCurrent = isNavGroupActive(group, location.pathname, isAuthenticated);
                const isEmphasized = isOpen || isCurrent;
                const directPath = isDirect ? group.path : null;
                const directBadge = isDirect ? group.badge : null;
                const directColor = isDirect ? group.color : undefined;

                return (
                  <div key={group.id} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() =>
                        isDirect && directPath
                          ? navigate(directPath)
                          : setActiveGroup(isOpen ? null : group.id)
                      }
                      onMouseEnter={() => !isDirect && setActiveGroup(group.id)}
                      aria-current={isCurrent ? 'page' : undefined}
                      aria-haspopup={!isDirect ? 'true' : undefined}
                      aria-expanded={!isDirect ? isOpen : undefined}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        height: 42,
                        padding: '0 14px',
                        borderRadius: R.full,
                        background: isEmphasized
                          ? 'linear-gradient(135deg, rgba(220,255,248,0.14), rgba(25,231,187,0.16) 58%, rgba(72,207,255,0.14))'
                          : 'transparent',
                        border: `1px solid ${isEmphasized ? 'rgba(25,231,187,0.24)' : 'transparent'}`,
                        boxShadow: isEmphasized ? '0 12px 28px rgba(25,231,187,0.12)' : 'none',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: isEmphasized ? 700 : 600,
                        color: isEmphasized ? C.text : 'rgba(233,245,247,0.68)',
                        fontFamily: F,
                        letterSpacing: '-0.01em',
                        transition: 'all 0.16s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{ar ? group.labelAr : group.label}</span>
                      {isDirect && directBadge && (
                        <Badge label={directBadge} color={directColor} />
                      )}
                      {!isDirect && (
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.14s',
                            opacity: 0.5,
                          }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      )}
                    </button>

                    {!isDirect && isOpen && (
                      <NavDropdown
                        group={group}
                        onNavigate={(p) => { navigate(p); setActiveGroup(null); }}
                        align={index === 0 ? 'left' : 'center'}
                        ar={ar}
                        isAuthenticated={isAuthenticated}
                      />
                    )}
                  </div>
                );
              })}

              {secondaryGroups.length > 0 && (
                <DesktopOverflowMenu
                  groups={secondaryGroups}
                  activeId={activeNavGroup?.id ?? null}
                  open={activeGroup === 'more'}
                  onOpenChange={(open) => setActiveGroup(open ? 'more' : null)}
                  onNavigate={(path) => { navigate(path); setActiveGroup(null); }}
                  ar={ar}
                  isAuthenticated={isAuthenticated}
                />
              )}
            </div>
          </nav>

          {/* Desktop action bar */}
          <div
            className="wrl-desk-actions"
            style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}
          >
            <LangToggle />
            {user && <CurrencySwitcher ar={ar} />}
            {user && isDriverMode && <OnlineToggle ar={ar} />}

            {user ? (
              <>
                {/* Notifications button */}
                <button
                  type="button"
                  onClick={() => navigate('/notifications')}
                  title={notificationsLabel}
                  aria-label={unreadNotificationsLabel}
                  style={{
                    position: 'relative',
                    width: 38,
                    height: 38,
                    borderRadius: R.md,
                    background: unreadCount > 0
                      ? 'var(--wasel-header-icon-hover, rgba(25,231,187,0.12))'
                      : 'var(--wasel-header-icon-bg, rgba(220,255,248,0.05))',
                    border: `1px solid ${unreadCount > 0 ? 'rgba(25,231,187,0.28)' : 'var(--border, rgba(25,231,187,0.16))'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.14s',
                    minHeight: 38,
                    minWidth: 38,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(233,245,247,0.74)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        minWidth: unreadCount > 9 ? 16 : 12,
                        height: unreadCount > 9 ? 16 : 12,
                        padding: unreadCount > 9 ? '0 4px' : 0,
                        borderRadius: R.full,
                        background:
                          unreadCount > 9
                            ? 'linear-gradient(135deg, #FF7A84, #FF646A)'
                            : '#FF646A',
                        border: '1.5px solid rgba(8,15,24,0.95)',
                        color: '#fff',
                        fontSize: unreadCount > 9 ? '0.56rem' : 0,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      {unreadCount > 9 ? '9+' : null}
                    </div>
                  )}
                </button>

                <UserMenu user={user} onSignOut={handleSignOut} ar={ar} />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate(buildAuthPagePath('signin'))}
                  style={{
                    height: 42,
                    padding: '0 18px',
                    borderRadius: R.lg,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    background:
                      'linear-gradient(180deg, rgba(220,255,248,0.06), rgba(220,255,248,0.02)), rgba(10,18,28,0.9)',
                    border: '1px solid rgba(25,231,187,0.22)',
                    color: '#E9F5F7',
                    fontFamily: F,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 12px 28px rgba(2,6,12,0.28), inset 0 1px 0 rgba(220,255,248,0.05)',
                    minHeight: 42,
                  }}
                >
                  {ar ? 'دخول' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(buildAuthPagePath('signup'))}
                  style={{
                    height: 42,
                    padding: '0 20px',
                    borderRadius: R.lg,
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    background: 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 44%, #48CFFF 100%)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#041019',
                    fontFamily: F,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.18s ease',
                    boxShadow: '0 18px 40px rgba(25,231,187,0.22), inset 0 1px 0 rgba(220,255,248,0.3)',
                    minHeight: 42,
                  }}
                >
                  {ar ? 'ابدأ الآن' : 'Create account'}
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="wrl-mobile-burger"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={ar ? 'فتح القائمة' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
            style={{
              marginLeft: 'auto',
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              borderRadius: R.md,
              background: 'rgba(220,255,248,0.05)',
              border: '1px solid rgba(25,231,187,0.18)',
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
              stroke="rgba(233,245,247,0.82)"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
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

      <AvailabilityBanner ar={ar} />

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={navigate}
        user={user}
        onSignOut={handleSignOut}
        ar={ar}
      />

      {/* ── Main content ──────────────────────────────────────────────── */}
      {/*
        className="wasel-app-main" is required for the scoped mobile
        padding-bottom rule in globals.css (padding-bottom: 80px for
        the bottom nav, applied only inside the app shell).
      */}
      <main
        id="main-content"
        className="wasel-app-main"
        role="main"
        aria-label={ar ? 'المحتوى الرئيسي' : 'Main content'}
        tabIndex={-1}
        style={{ position: 'relative', isolation: 'isolate' }}
      >
        {/* Subtle ambient glow — non-interactive */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at top center, rgba(101,225,255,0.08), transparent 30%), radial-gradient(circle at 80% 20%, rgba(25,231,187,0.08), transparent 24%)',
            zIndex: -1,
          }}
        />
        <Outlet />
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 16px 112px' }}>
        <WaselBusinessFooter ar={ar} />
      </div>

      <MobileBottomNav language={language} />
    </div>
  );
}
