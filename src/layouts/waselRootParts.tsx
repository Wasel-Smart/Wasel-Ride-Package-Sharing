import React, { useEffect, useRef, useState } from 'react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { type SupportedCurrency, useCurrency, CurrencyService } from '../utils/currency';
import { buildAuthPagePath } from '../utils/authFlow';
import { C, F, R } from '../utils/wasel-ds';
import {
  getNavGroupPrimaryPath,
  getVisibleNavItems,
  isDirectNavGroup,
  isVisibleNavGroup,
  PRODUCT_NAV_GROUPS,
  type NavGroup,
} from './waselRootConfig';

const PANEL_BG = 'var(--wasel-service-card)';
const PANEL_BORDER = 'var(--wasel-service-border)';
const PANEL_MUTED = 'var(--wasel-app-muted)';
const PANEL_SOFT = 'var(--surface-muted)';
const PANEL_SHADOW = 'var(--wasel-shadow-lg)';

export function Badge({
  label,
  color = C.cyan,
}: {
  label: string;
  color?: string;
}) {
  const map: Record<string, string> = {
    LIVE: C.cyan,
    RAJE3: C.gold,
    AI: C.blue,
    VIP: C.gold,
    'Fixed Price': C.green,
    QA: C.blue,
    TRUST: C.green,
  };
  const col = map[label] || color;

  return (
    <span
      style={{
        fontSize: '0.52rem',
        fontWeight: 800,
        letterSpacing: '0.08em',
        padding: '2px 6px',
        borderRadius: R.full,
        background: `color-mix(in srgb, ${col} 12%, transparent)`,
        color: col,
        border: `1px solid color-mix(in srgb, ${col} 22%, transparent)`,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

export function AppPill({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 30,
        padding: '0 12px',
        borderRadius: R.full,
        background: 'var(--wasel-app-nav-surface)',
        border: '1px solid var(--wasel-app-border)',
        color: 'var(--wasel-app-muted)',
        fontSize: '0.72rem',
        fontWeight: 700,
        fontFamily: F,
        whiteSpace: 'nowrap',
        boxShadow: 'var(--wasel-shadow-sm)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: C.green,
          boxShadow: `0 0 10px ${C.green}`,
        }}
      />
      {ar ? 'منظومة تنقل مترابطة' : 'Linked mobility network'}
    </div>
  );
}

export function CurrencySwitcher({ ar }: { ar: boolean }) {
  const { current, setCurrency, getSymbol } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popular: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'SAR', 'EGP', 'GBP'];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (code: SupportedCurrency) => {
    setCurrency(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={ar ? 'تغيير العملة' : 'Change currency'}
        style={{
          height: 34,
          padding: '0 10px',
          borderRadius: R.md,
          background: open ? 'rgba(15,115,255,0.12)' : PANEL_SOFT,
          border: `1px solid ${open ? C.borderHov : C.border}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: open ? 'var(--wasel-app-blue)' : 'var(--wasel-app-ink)',
          fontFamily: F,
          transition: 'all 0.14s',
          boxShadow: open ? '0 12px 28px rgba(15,115,255,0.12)' : 'none',
        }}
      >
        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>$</span>
        {current}
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.14s',
            opacity: 0.6,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 200,
            background: PANEL_BG,
            backdropFilter: 'blur(24px)',
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 20,
            boxShadow: PANEL_SHADOW,
            overflow: 'hidden',
            zIndex: 1100,
            animation: 'fade-in 0.12s ease',
          }}
        >
          <div
            style={{
              padding: '8px 12px 4px',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: 'var(--wasel-app-soft)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: F,
            }}
          >
            {ar ? 'اختر العملة' : 'Select currency'}
          </div>
          {popular.map((code) => (
            <button
              type="button"
              key={code}
              onClick={() => handleSelect(code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                background:
                  current === code ? 'rgba(15,115,255,0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: current === code ? 700 : 500,
                color: current === code ? 'var(--wasel-app-blue)' : 'var(--wasel-app-ink)',
                fontFamily: F,
                transition: 'background 0.12s',
              }}
            >
              <span>{code}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--wasel-app-soft)',
                  fontFamily: F,
                }}
              >
                {getSymbol(code)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OnlineToggle({ ar }: { ar: boolean }) {
  const [online, setOnline] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOnline((o) => !o)}
      title={
        ar
          ? online
            ? 'انتقل إلى وضع عدم الاتصال'
            : 'انتقل إلى وضع الاتصال'
          : online
            ? 'Go offline'
            : 'Go online'
      }
      style={{
        height: 34,
        padding: '0 12px',
        borderRadius: R.full,
        background: online ? 'rgba(25,231,187,0.12)' : PANEL_SOFT,
        border: `1.5px solid ${
          online ? 'rgba(25,231,187,0.24)' : PANEL_BORDER
        }`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: online ? 'var(--wasel-app-teal)' : 'var(--wasel-app-soft)',
        fontFamily: F,
        transition: 'all 0.2s',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: online ? C.green : 'rgba(255,255,255,0.3)',
          boxShadow: online ? `0 0 8px ${C.green}` : 'none',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
      />
      {online ? (ar ? 'متصل' : 'Online') : ar ? 'غير متصل' : 'Offline'}
    </button>
  );
}

export function NavDropdown({
  group,
  onNavigate,
  align,
  ar,
  isAuthenticated,
}: {
  group: NavGroup;
  onNavigate: (path: string) => void;
  align?: 'left' | 'center' | 'right';
  ar: boolean;
  isAuthenticated: boolean;
}) {
  if ('direct' in group && group.direct) return null;
  const items = getVisibleNavItems(group, isAuthenticated);
  if (!items.length) return null;

  const posStyle: React.CSSProperties =
    align === 'right'
      ? { right: 0 }
      : align === 'left'
        ? { left: 0 }
        : { left: '50%', transform: 'translateX(-50%)' };
  const cols =
    items.length <= 2
      ? 'repeat(2,1fr)'
      : items.length === 3
        ? 'repeat(3,1fr)'
        : 'repeat(2,1fr)';

  return (
    <div
      role="menu"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        ...posStyle,
        background: PANEL_BG,
        backdropFilter: 'blur(28px)',
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 22,
        boxShadow: `${PANEL_SHADOW}, 0 0 0 1px rgba(216,251,255,0.04)`,
        padding: 12,
        minWidth: 380,
        display: 'grid',
        gridTemplateColumns: cols,
        gap: 8,
        zIndex: 1000,
        animation: 'fade-in 0.15s ease',
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          tabIndex={0}
          onClick={() => onNavigate(item.path)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate(item.path);
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            padding: '11px 13px',
            borderRadius: 14,
            background: 'rgba(15,115,255,0.04)',
            border: '1px solid rgba(16,43,73,0.08)',
            cursor: 'pointer',
            textAlign: ar ? 'right' : 'left',
            transition: 'all 0.14s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.15rem' }}>{item.emoji}</span>
            {item.badge && <Badge label={item.badge} color={item.color} />}
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: C.text,
              fontFamily: F,
            }}
          >
            {ar ? item.labelAr : item.label}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--wasel-app-soft)',
              fontFamily: F,
              lineHeight: 1.4,
            }}
          >
            {ar ? item.descAr : item.desc}
          </div>
        </button>
      ))}
    </div>
  );
}

export function DesktopOverflowMenu({
  groups,
  activeId,
  open,
  onOpenChange,
  onNavigate,
  ar,
  isAuthenticated,
}: {
  groups: readonly NavGroup[];
  activeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
  ar: boolean;
  isAuthenticated: boolean;
}) {
  if (!groups.length) return null;
  const moreLabel = ar ? 'المزيد' : 'More';
  const moreDestinationsLabel = ar ? 'وجهات إضافية' : 'More destinations';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={moreLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 40,
          padding: '0 14px',
          borderRadius: R.full,
          background: open ? PANEL_SOFT : 'transparent',
          border: `1px solid ${open ? PANEL_BORDER : 'transparent'}`,
          color: open ? 'var(--wasel-app-ink)' : 'var(--wasel-app-muted)',
          fontSize: '0.8rem',
          fontWeight: 600,
          fontFamily: F,
          cursor: 'pointer',
          transition: 'all 0.16s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{moreLabel}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
            height: 20,
            padding: '0 6px',
            borderRadius: R.full,
            background: 'rgba(15,115,255,0.06)',
            border: '1px solid rgba(16,43,73,0.08)',
            color: PANEL_MUTED,
            fontSize: '0.66rem',
            fontWeight: 700,
          }}
        >
          {groups.length}
        </span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.14s',
            opacity: 0.6,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          dir={ar ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: ar ? 'auto' : 0,
            left: ar ? 0 : 'auto',
            width: 320,
            background: PANEL_BG,
            backdropFilter: 'blur(28px)',
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 24,
            boxShadow: PANEL_SHADOW,
            padding: 10,
            display: 'grid',
            gap: 8,
            zIndex: 1000,
            animation: 'fade-in 0.15s ease',
          }}
        >
          <div
            style={{
              padding: '6px 8px 2px',
              fontSize: '0.62rem',
              fontWeight: 700,
              color: 'var(--wasel-app-soft)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: F,
            }}
          >
            {moreDestinationsLabel}
          </div>
          {groups.map((group) => {
            const path = getNavGroupPrimaryPath(group, isAuthenticated);
            if (!path) return null;
            const isCurrent = activeId === group.id;

            return (
              <button
                key={group.id}
                role="menuitem"
                onClick={() => {
                  onNavigate(path);
                  onOpenChange(false);
                }}
                aria-current={isCurrent ? 'page' : undefined}
                style={{
                  display: 'grid',
                  gap: 4,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: isCurrent ? 'rgba(15,115,255,0.08)' : PANEL_SOFT,
                  border: `1px solid ${
                    isCurrent ? PANEL_BORDER : 'rgba(16,43,73,0.08)'
                  }`,
                  cursor: 'pointer',
                  textAlign: ar ? 'right' : 'left',
                  transition: 'all 0.16s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--wasel-app-ink)',
                      fontFamily: F,
                    }}
                  >
                    {ar ? group.labelAr : group.label}
                  </span>
                  {'badge' in group && group.badge && (
                    <Badge label={group.badge} color={group.color} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    color: isCurrent ? 'var(--wasel-app-muted)' : 'var(--wasel-app-soft)',
                    fontFamily: F,
                  }}
                >
                  {ar ? group.descAr : group.desc}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UserMenu({
  user,
  onSignOut,
  ar,
}: {
  user: { name: string; email: string; trips: number; balance: number };
  onSignOut: () => void | Promise<void>;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const nav = useIframeSafeNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = user.name
    .split(' ')
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const firstName = user.name.split(' ')[0];
  const balanceDisplay = CurrencyService.getInstance().formatFromJOD(user.balance);
  const menuItems = [
    { label: ar ? 'رحلاتي' : 'My Trips', emoji: '🎫', path: '/my-trips' },
    { label: ar ? 'الطرود' : 'Packages', emoji: '📦', path: '/packages' },
    { label: ar ? 'ملفي الشخصي' : 'Profile', emoji: '👤', path: '/profile' },
    { label: ar ? 'واصل بلس' : 'Wasel Plus', emoji: '✨', path: '/plus' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ar ? 'فتح قائمة الحساب' : 'Open account menu'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px 5px 5px',
          borderRadius: 9999,
          background: open ? 'rgba(15,115,255,0.08)' : 'rgba(15,115,255,0.04)',
          border: `1px solid ${open ? C.borderHov : C.border}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, #0f73ff 0%, #19e7bb 100%)',
            boxShadow: '0 0 0 1.5px rgba(15,115,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: C.text,
            fontFamily: F,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 80,
          }}
        >
          {firstName}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          dir={ar ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: ar ? 'auto' : 0,
            left: ar ? 0 : 'auto',
            width: 256,
            background: PANEL_BG,
            backdropFilter: 'blur(28px)',
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 18,
            boxShadow: PANEL_SHADOW,
            overflow: 'hidden',
            animation: 'fade-in 0.15s ease',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background:
                'linear-gradient(180deg, rgba(15,115,255,0.08), rgba(25,231,187,0.04))',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: C.text,
                fontSize: '0.875rem',
                fontFamily: F,
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--wasel-app-muted)',
                fontFamily: F,
                marginTop: 1,
              }}
            >
              {user.email}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 0,
                marginTop: 12,
                background: 'rgba(15,115,255,0.04)',
                borderRadius: 12,
                overflow: 'hidden',
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRight: ar ? undefined : `1px solid ${C.border}`,
                  borderLeft: ar ? `1px solid ${C.border}` : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: C.text,
                    fontFamily: F,
                  }}
                >
                  {user.trips}
                </div>
                <div
                  style={{
                    fontSize: '0.58rem',
                    color: 'var(--wasel-app-soft)',
                    fontFamily: F,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {ar ? 'رحلات' : 'Trips'}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 12px' }}>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: C.gold,
                    fontFamily: F,
                  }}
                >
                  {balanceDisplay}
                </div>
                <div
                  style={{
                    fontSize: '0.58rem',
                    color: 'var(--wasel-app-soft)',
                    fontFamily: F,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {ar ? 'المحفظة' : 'Wallet'}
                </div>
              </div>
            </div>
          </div>
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.label}
              role="menuitem"
              onClick={() => {
                nav(item.path);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 16px',
                background: 'transparent',
                border: 'none',
                textAlign: ar ? 'right' : 'left',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: 'rgba(248,239,214,0.78)',
                fontFamily: F,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>
                {item.emoji}
              </span>
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, background: C.border, margin: '0 16px' }} />
          <button
            type="button"
            onClick={() => {
              void Promise.resolve(onSignOut()).finally(() => {
                setOpen(false);
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: ar ? 'right' : 'left',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: C.error,
              fontFamily: F,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>✕</span>
            {ar ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

export function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';

  return (
    <button
      type="button"
      onClick={() => setLanguage(ar ? 'en' : 'ar')}
      title={ar ? 'Switch to English' : 'التبديل إلى العربية'}
      style={{
        height: 34,
        padding: '0 10px',
        borderRadius: R.md,
        background: PANEL_SOFT,
        border: `1px solid ${C.border}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'rgba(248,239,214,0.8)',
        fontFamily: F,
        transition: 'all 0.14s',
      }}
    >
      {ar ? 'EN' : 'ع'}
    </button>
  );
}

export function MobileDrawer({
  open,
  onClose,
  onNavigate,
  user,
  onSignOut,
  ar,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (p: string) => void;
  user: { name: string; email: string } | null;
  onSignOut: () => void | Promise<void>;
  ar: boolean;
}) {
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(3,12,20,0.78)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ar ? 'قائمة واصل' : 'Wasel menu'}
        dir={ar ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          top: 0,
          right: ar ? 'auto' : 0,
          left: ar ? 0 : 'auto',
          width: 300,
          height: '100%',
          background:
            'linear-gradient(180deg, rgba(7,27,43,0.98), rgba(6,23,38,0.98))',
          borderLeft: ar ? undefined : `1px solid ${PANEL_BORDER}`,
          borderRight: ar ? `1px solid ${PANEL_BORDER}` : undefined,
          boxShadow: ar
            ? '20px 0 60px rgba(1,10,18,0.38)'
            : '-20px 0 60px rgba(1,10,18,0.38)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <WaselLogo
            size={36}
            theme="light"
            variant="compact"
            showWordmark
            subtitle=""
            framed={false}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}
            style={{
              background: 'rgba(255,247,229,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: R.md,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: '1.1rem',
              color: 'rgba(248,239,214,0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            &times;
          </button>
        </div>
        <div
          style={{
            padding: '10px 20px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <LangToggle />
          {isAuthenticated && <CurrencySwitcher ar={ar} />}
        </div>
        {user && (
          <div
            style={{
              padding: '14px 20px',
              background:
                'linear-gradient(180deg, rgba(244,198,81,0.08), rgba(255,247,229,0.02))',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: '#fff',
                fontFamily: F,
                fontSize: '0.9rem',
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: 'rgba(228,214,180,0.62)',
                fontFamily: F,
              }}
            >
              {user.email}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Badge label="TRUST" color={C.green} />
              <Badge label="LIVE" color={C.cyan} />
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {PRODUCT_NAV_GROUPS.filter((group) =>
            isVisibleNavGroup(group, isAuthenticated),
          ).map((group) => (
            <div
              key={group.id}
              style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: 'rgba(228,214,180,0.52)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontFamily: F,
                }}
              >
                {ar ? 'الخدمة' : 'Service'}
              </div>
              {isDirectNavGroup(group) ? (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(group.path);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: ar ? 'right' : 'left',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', marginTop: 2 }}>
                    {group.emoji}
                  </span>
                  <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: F,
                      }}
                    >
                      {ar ? group.labelAr : group.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'rgba(228,214,180,0.68)',
                        fontFamily: F,
                        lineHeight: 1.5,
                      }}
                    >
                      {ar ? group.descAr : group.desc}
                    </span>
                  </span>
                  {group.badge && <Badge label={group.badge} />}
                </button>
              ) : (
                getVisibleNavItems(group, isAuthenticated).map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => {
                      onNavigate(item.path);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: ar ? 'right' : 'left',
                    }}
                  >
                    <span style={{ fontSize: '1.05rem' }}>{item.emoji}</span>
                    <span
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 500,
                        color: 'rgba(248,239,214,0.78)',
                        fontFamily: F,
                      }}
                    >
                      {ar ? item.labelAr : item.label}
                    </span>
                    {item.badge && <Badge label={item.badge} color={item.color} />}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            padding: '16px 20px',
            flexShrink: 0,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {user ? (
            <button
              type="button"
              onClick={() => {
                void Promise.resolve(onSignOut()).finally(() => {
                  onClose();
                });
              }}
              style={{
                width: '100%',
                height: 42,
                borderRadius: R.md,
                background: 'rgba(255,100,106,0.08)',
                border: '1px solid rgba(255,100,106,0.28)',
                color: C.error,
                fontWeight: 700,
                fontFamily: F,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {ar ? 'تسجيل الخروج' : 'Sign out'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  onNavigate(buildAuthPagePath('signin'));
                  onClose();
                }}
                style={{
                  height: 42,
                  borderRadius: R.md,
                  background: 'transparent',
                  border: '1.5px solid rgba(255,255,255,0.14)',
                  color: 'rgba(248,239,214,0.84)',
                  fontWeight: 600,
                  fontFamily: F,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {ar ? 'تسجيل الدخول' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate(buildAuthPagePath('signup'));
                  onClose();
                }}
                style={{
                  height: 42,
                  borderRadius: R.md,
                  background:
                    'linear-gradient(135deg,#DCFFF8 0%, #19E7BB 44%, #48CFFF 100%)',
                  border: 'none',
                  color: '#041018',
                  fontWeight: 700,
                  fontFamily: F,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {ar ? 'ابدأ مجانا' : 'Get started free'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
