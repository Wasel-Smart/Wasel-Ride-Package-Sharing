/**
 * Accessible shell overlays: UserMenu (desktop) and MobileDrawer (phones).
 *
 * - Escape closes, focus is restored to the trigger, arrow keys move between items.
 * - MobileDrawer is a real modal dialog: focus trap, scroll lock, focus restore.
 * - Layering uses the shared Z scale (never hard-coded values).
 * - Logical CSS properties only, so Arabic (RTL) mirrors correctly.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Activity, Settings, ShieldCheck, Sparkles, UserCircle2, Wallet, X } from 'lucide-react';
import { WaselLogo } from '../../components/wasel-ui/WaselLogo';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { lockBodyScroll } from '../../utils/bodyScrollLock';
import {
  getVisibleNavItems,
  isVisibleNavGroup,
  PRODUCT_NAV_GROUPS,
} from '../waselRootConfig';
import { CurrencyService } from '../../utils/currency';
import { C, F, GRAD, R, Z } from '../../utils/wasel-ds';
import { CurrencySwitcher, LangToggle, OnlineToggle } from './controls';
import { Badge, SocialLinks, getDrawerSectionLabel } from './shared';

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function moveFocusInMenu(e: React.KeyboardEvent<HTMLElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {return;}
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  if (!items.length) {return;}
  e.preventDefault();
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next = index;
  if (e.key === 'ArrowDown') {next = (index + 1) % items.length;}
  if (e.key === 'ArrowUp') {next = (index - 1 + items.length) % items.length;}
  if (e.key === 'Home') {next = 0;}
  if (e.key === 'End') {next = items.length - 1;}
  items[next]?.focus();
}

export function UserMenu({
  user,
  onSignOut,
  ar,
}: {
  user: { name: string; email: string; trips: number; balance: number };
  onSignOut: () => void;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const nav = useIframeSafeNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {setOpen(false);}
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {return;}
      setOpen(current => {
        if (current) {triggerRef.current?.focus();}
        return false;
      });
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) {return;}
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const initials = user.name
    .split(' ')
    .map(w => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const firstName = user.name.split(' ')[0];
  const balanceDisplay = CurrencyService.getInstance().formatFromJOD(user.balance);
  const menuItems = [
    { label: ar ? 'النشاط' : 'Activity', icon: Activity, path: '/my-trips', color: C.cyan },
    { label: ar ? 'المحفظة' : 'Wallet', icon: Wallet, path: '/wallet', color: C.gold },
    { label: ar ? 'الثقة' : 'Trust', icon: ShieldCheck, path: '/trust', color: C.green },
    { label: ar ? 'الملف' : 'Profile', icon: UserCircle2, path: '/profile', color: C.cyan },
    { label: ar ? 'الإعدادات' : 'Settings', icon: Settings, path: '/settings', color: C.blue },
    { label: ar ? 'واصل بلس' : 'Wasel Plus', icon: Sparkles, path: '/plus', color: C.gold },
  ];

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 44,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    textAlign: 'start',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: var(--muted-foreground),
    fontFamily: F,
    cursor: 'pointer',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ar ? `حساب ${firstName}` : `${firstName} account menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBlock: 5,
          paddingInlineStart: 5,
          paddingInlineEnd: 12,
          borderRadius: 9999,
          background: open ? C.cyanDim : 'var(--card)',
          border: `1px solid ${open ? var(--border) : var(--border)}`,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: GRAD,
            boxShadow: '0 0 0 1.5px rgba(0,229,255,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: var(--background),
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: var(--foreground),
            fontFamily: F,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 88,
          }}
        >
          {firstName}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={ar ? 'قائمة الحساب' : 'Account menu'}
          onKeyDown={moveFocusInMenu}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 280,
            background: 'rgba(8,29,57,0.98)',
            border: `1px solid ${var(--border)}`,
            borderRadius: 16,
            boxShadow: '0 24px 64px rgba(4,10,18,0.6)',
            overflow: 'hidden',
            animation: 'fade-in 0.15s ease',
            zIndex: Z.overlay,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: 'linear-gradient(180deg, rgba(0,229,255,0.08), rgba(8,29,57,0.18))',
              borderBottom: `1px solid ${var(--border)}`,
            }}
          >
            <div style={{ fontWeight: 700, color: var(--foreground), fontSize: '0.9rem', fontFamily: F }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: var(--muted-foreground), fontFamily: F, marginTop: 1 }}>
              {user.email}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 12,
                background: var(--card),
                borderRadius: 10,
                overflow: 'hidden',
                border: `1px solid ${var(--border)}`,
              }}
            >
              <div style={{ flex: 1, padding: '8px 12px', borderInlineEnd: `1px solid ${var(--border)}` }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: var(--foreground), fontFamily: F }}>
                  {user.trips}
                </div>
                <div style={{ fontSize: '0.72rem', color: var(--muted-foreground), fontFamily: F }}>
                  {ar ? 'الرحلات' : 'Trips'}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: C.gold, fontFamily: F }}>
                  {balanceDisplay}
                </div>
                <div style={{ fontSize: '0.72rem', color: var(--muted-foreground), fontFamily: F }}>
                  {ar ? 'المحفظة' : 'Wallet'}
                </div>
              </div>
            </div>
          </div>
          {menuItems.map(item => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              onClick={() => {
                nav(item.path);
                setOpen(false);
              }}
              style={itemStyle}
            >
              <item.icon size={16} color={item.color} aria-hidden="true" />
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, background: var(--border), margin: '0 16px' }} />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onSignOut();
              setOpen(false);
            }}
            style={{ ...itemStyle, fontWeight: 600, color: var(--destructive) }}
          >
            <X size={16} aria-hidden="true" />
            {ar ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

export function MobileDrawer({
  open,
  onClose,
  onNavigate,
  user,
  onSignOut,
  ar,
  isDriver = false,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (p: string) => void;
  user: { name: string; email: string } | null;
  onSignOut: () => void;
  ar: boolean;
  isDriver?: boolean;
}) {
  const isAuthenticated = Boolean(user);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {return undefined;}
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const unlock = lockBodyScroll();
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('button')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) {return;}
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables.length) {return;}
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) {return null;}

  const go = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const accountLinks = [
    { label: ar ? 'المحفظة' : 'Wallet', path: '/wallet' },
    { label: ar ? 'الإشعارات' : 'Notifications', path: '/notifications' },
    { label: ar ? 'الثقة والتحقق' : 'Trust & verification', path: '/trust' },
    { label: ar ? 'واصل بلس' : 'Wasel Plus', path: '/plus' },
    { label: ar ? 'الإعدادات' : 'Settings', path: '/settings' },
  ];

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: var(--muted-foreground),
    letterSpacing: ar ? 0 : '0.1em',
    textTransform: ar ? 'none' : 'uppercase',
    marginBottom: 6,
    fontFamily: F,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 44,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'start',
  };

  return (
    <div
      role="presentation"
      onClick={() => onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.modal,
        background: 'rgba(4,10,18,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 0.18s ease',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ar ? 'القائمة' : 'Menu'}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          insetInlineEnd: 0,
          width: 'min(320px, 88vw)',
          height: '100dvh',
          background: var(--background),
          borderInlineStart: `1px solid ${var(--border)}`,
          boxShadow: '0 0 60px rgba(4,10,18,0.6)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
            borderBottom: `1px solid ${var(--border)}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <WaselLogo size={36} theme="light" variant="full" />
          <button
            type="button"
            onClick={() => onClose()}
            aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
            style={{
              background: var(--card),
              border: `1px solid ${var(--border)}`,
              borderRadius: R.md,
              width: 44,
              height: 44,
              cursor: 'pointer',
              color: var(--muted-foreground),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${var(--border)}`,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <LangToggle />
          {isAuthenticated && <CurrencySwitcher ar={ar} />}
          {isDriver && <OnlineToggle ar={ar} />}
        </div>

        {user && (
          <div
            style={{
              padding: '14px 20px',
              background: 'linear-gradient(180deg, rgba(0,229,255,0.08), rgba(8,29,57,0.18))',
              borderBottom: `1px solid ${var(--border)}`,
            }}
          >
            <div style={{ fontWeight: 700, color: var(--foreground), fontFamily: F, fontSize: '0.95rem' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: var(--muted-foreground), fontFamily: F }}>{user.email}</div>
          </div>
        )}

        <div style={{ flex: 1 }}>
          {user && (
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${var(--border)}` }}>
              <div style={sectionLabelStyle}>{ar ? 'حسابي' : 'Account'}</div>
              {accountLinks.map(link => (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => go(link.path)}
                  style={{
                    ...rowStyle,
                    fontSize: '0.92rem',
                    fontWeight: 500,
                    color: var(--muted-foreground),
                    fontFamily: F,
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}

          {PRODUCT_NAV_GROUPS.filter(group => isVisibleNavGroup(group, isAuthenticated)).map(group => (
            <div
              key={group.id}
              style={{ padding: '12px 20px', borderBottom: `1px solid ${var(--border)}` }}
            >
              <div style={sectionLabelStyle}>{getDrawerSectionLabel(group.id, ar)}</div>
              {'direct' in group && group.direct ? (
                <button type="button" onClick={() => go((group as { path: string }).path)} style={{ ...rowStyle, alignItems: 'flex-start' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 8,
                      borderRadius: '50%',
                      background: (group as { color?: string }).color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: var(--foreground), fontFamily: F }}>
                      {ar ? group.labelAr : group.label}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: var(--muted-foreground), fontFamily: F, lineHeight: 1.5 }}>
                      {ar ? (group as { descAr?: string }).descAr : (group as { desc?: string }).desc}
                    </span>
                  </span>
                  {(group as { badge?: string }).badge && (
                    <Badge
                      label={
                        ar && (group as { badge?: string }).badge === 'LIVE'
                          ? 'مباشر'
                          : (group as { badge?: string }).badge ?? ''
                      }
                    />
                  )}
                </button>
              ) : (
                getVisibleNavItems(group, isAuthenticated).map(item => (
                  <button key={item.label} type="button" onClick={() => go(item.path)} style={rowStyle}>
                    <span
                      aria-hidden="true"
                      style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: var(--muted-foreground), fontFamily: F }}>
                      {ar ? item.labelAr : item.label}
                    </span>
                    {item.badge && (
                      <Badge label={ar && item.badge === 'LIVE' ? 'مباشر' : item.badge} color={item.color} />
                    )}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', flexShrink: 0, borderTop: `1px solid ${var(--border)}` }}>
          <SocialLinks ar={ar} variant="drawer" />
          {user ? (
            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              style={{
                width: '100%',
                height: 46,
                borderRadius: R.md,
                background: var(--destructive),
                border: `1px solid ${C.error}55`,
                color: var(--destructive),
                fontWeight: 700,
                fontFamily: F,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              {ar ? 'تسجيل الخروج' : 'Sign out'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => go('/auth')}
                style={{
                  height: 46,
                  borderRadius: R.md,
                  background: 'transparent',
                  border: `1.5px solid ${var(--border)}`,
                  color: var(--foreground),
                  fontWeight: 600,
                  fontFamily: F,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {ar ? 'تسجيل الدخول' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => go('/app/auth?tab=register')}
                style={{
                  height: 46,
                  borderRadius: R.md,
                  background: GRAD,
                  border: 'none',
                  color: var(--background),
                  fontWeight: 700,
                  fontFamily: F,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {ar ? 'ابدأ مجانًا' : 'Get started free'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
