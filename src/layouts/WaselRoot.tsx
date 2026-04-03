import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { SkipToContent } from '../components/SkipToContent';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { C, F, R, GLOBAL_STYLES } from '../utils/wasel-ds';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { AvailabilityBanner } from '../components/system/AvailabilityBanner';
import { WaselBusinessFooter, WaselPresenceStrip } from '../components/system/WaselPresence';
import { DESKTOP_PRIMARY_NAV_IDS, isNavGroupActive, isVisibleNavGroup, PRODUCT_NAV_GROUPS } from './waselRootConfig';
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
  const visibleNavGroups = PRODUCT_NAV_GROUPS.filter((group) => isVisibleNavGroup(group, isAuthenticated));
  const activeNavGroup = visibleNavGroups.find((group) => isNavGroupActive(group, location.pathname, isAuthenticated)) ?? null;
  const primaryGroups = visibleNavGroups.filter((group) => preferredPrimaryIds.has(group.id)).slice(0, 4);

  for (const group of visibleNavGroups) {
    if (primaryGroups.length >= 4) break;
    if (!primaryGroups.some((item) => item.id === group.id)) {
      primaryGroups.push(group);
    }
  }

  if (activeNavGroup && !primaryGroups.some((group) => group.id === activeNavGroup.id)) {
    if (primaryGroups.length >= 4) primaryGroups.pop();
    primaryGroups.push(activeNavGroup);
  }

  const primaryGroupIds = new Set(primaryGroups.map((group) => group.id));
  const secondaryGroups = visibleNavGroups.filter((group) => !primaryGroupIds.has(group.id));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveGroup(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setActiveGroup(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const navigate = useCallback((path: string) => nav(path), [nav]);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(0,200,232,0.08), transparent 30%), #040C18', fontFamily: F, direction: ar ? 'rtl' : 'ltr' }}>
      <SkipToContent targetId="main-content" />
      <style>{GLOBAL_STYLES + `
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button, textarea { font-family: inherit; }
        :focus-visible { outline: 2px solid #00C8E8; outline-offset: 2px; }
      `}</style>

      <header ref={navRef} style={{ position: 'sticky', top: 0, zIndex: 500, background: scrolled ? 'rgba(4,12,24,0.99)' : 'rgba(4,12,24,0.95)', backdropFilter: 'blur(24px)', borderBottom: `1px solid rgba(0,200,232,${scrolled ? '0.18' : '0.10'})`, boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.6)' : '0 2px 16px rgba(0,0,0,0.3)', transition: 'all 0.25s ease' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 20px', minHeight: 72, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'opacity 0.15s' }}>
            <WaselLogo size={32} theme="light" variant="full" />
          </button>

          <div className="wrl-brand-pill" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <style>{`@media (max-width: 1260px) { .wrl-brand-pill { display: none !important; } }`}</style>
            <AppPill ar={ar} />
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }} className="wrl-desk-nav">
            <style>{`
              @media (max-width: 899px) { .wrl-desk-nav { display: none !important; } }
              @media (max-width: 899px) { .wrl-desk-actions { display: none !important; } }
              @media (min-width: 900px) { .wrl-mobile-burger { display: none !important; } }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, padding: 4, borderRadius: R.full, background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
              {primaryGroups.map((group, index) => {
                const isDirect = 'direct' in group && group.direct;
                const isOpen = activeGroup === group.id;
                const isCurrent = isNavGroupActive(group, location.pathname, isAuthenticated);
                const isEmphasized = isOpen || isCurrent;

                return (
                  <div key={group.id} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => isDirect ? navigate((group as any).path) : setActiveGroup(isOpen ? null : group.id)}
                      onMouseEnter={() => !isDirect && setActiveGroup(group.id)}
                      aria-current={isCurrent ? 'page' : undefined}
                      aria-haspopup={!isDirect ? 'true' : undefined}
                      aria-expanded={!isDirect ? isOpen : undefined}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: R.full, background: isEmphasized ? 'linear-gradient(135deg, rgba(0,200,232,0.16), rgba(32,96,232,0.10))' : 'transparent', border: `1px solid ${isEmphasized ? 'rgba(0,200,232,0.18)' : 'transparent'}`, boxShadow: isEmphasized ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: isEmphasized ? 700 : 600, color: isEmphasized ? C.text : 'rgba(239,246,255,0.74)', fontFamily: F, letterSpacing: '-0.01em', transition: 'all 0.16s ease', whiteSpace: 'nowrap' }}
                    >
                      <span>{ar ? group.labelAr : group.label}</span>
                      {isDirect && (group as any).badge && <Badge label={(group as any).badge} color={(group as any).color} />}
                      {!isDirect && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s', opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>}
                    </button>

                    {!isDirect && isOpen && (
                      <NavDropdown group={group} onNavigate={(p) => { navigate(p); setActiveGroup(null); }} align={index === 0 ? 'left' : 'center'} ar={ar} isAuthenticated={isAuthenticated} />
                    )}
                  </div>
                );
              })}

              {secondaryGroups.length > 0 && <DesktopOverflowMenu groups={secondaryGroups} activeId={activeNavGroup?.id ?? null} open={activeGroup === 'more'} onOpenChange={(open) => setActiveGroup(open ? 'more' : null)} onNavigate={(path) => { navigate(path); setActiveGroup(null); }} ar={ar} isAuthenticated={isAuthenticated} />}
            </div>
          </nav>

          <div className="wrl-desk-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <LangToggle />
            {user && <CurrencySwitcher ar={ar} />}
            {user && isDriverMode && <OnlineToggle ar={ar} />}

            {user ? (
              <>
                <button onClick={() => navigate('/notifications')} title={ar ? 'الإشعارات' : 'Notifications'} style={{ position: 'relative', width: 36, height: 36, borderRadius: R.md, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,200,232,0.16)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.14s' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#FF4455', border: '1.5px solid rgba(4,12,24,0.95)' }} />
                </button>
                <UserMenu user={user} onSignOut={signOut} ar={ar} />
              </>
            ) : (
              <>
                <button onClick={() => navigate('/auth')} style={{ height: 36, padding: '0 16px', borderRadius: R.md, fontSize: '0.82rem', fontWeight: 600, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', fontFamily: F, cursor: 'pointer', transition: 'all 0.14s', whiteSpace: 'nowrap' }}>{ar ? 'دخول' : 'Sign in'}</button>
                <button onClick={() => navigate('/auth?tab=register')} style={{ height: 36, padding: '0 18px', borderRadius: R.md, fontSize: '0.82rem', fontWeight: 700, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', border: 'none', color: '#040C18', fontFamily: F, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.14s', boxShadow: '0 4px 16px rgba(0,200,232,0.25)' }}>{ar ? 'ابدأ الآن' : 'Get started'}</button>
              </>
            )}
          </div>

          <button className="wrl-mobile-burger" onClick={() => setMobileOpen((t) => !t)} aria-label={ar ? 'فتح القائمة' : 'Open menu'} style={{ marginLeft: 'auto', width: 38, height: 38, borderRadius: R.md, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0,200,232,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.14s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <><path d="M18 6 6 18" /><path d="M6 6l12 12" /></> : <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>}
            </svg>
          </button>
        </div>
      </header>

      <AvailabilityBanner ar={ar} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '14px 16px 0' }}>
        <WaselPresenceStrip ar={ar} />
      </div>
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={navigate} user={user} onSignOut={signOut} ar={ar} />

      <main id="main-content" role="main" aria-label={ar ? 'المحتوى الرئيسي' : 'Main content'} tabIndex={-1} style={{ position: 'relative', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at top center, rgba(0,200,232,0.05), transparent 30%), radial-gradient(circle at 80% 20%, rgba(240,168,48,0.04), transparent 24%)', zIndex: -1 }} />
        <Outlet />
      </main>

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 16px 96px' }}>
        <WaselBusinessFooter ar={ar} />
      </div>

      <MobileBottomNav />
    </div>
  );
}
