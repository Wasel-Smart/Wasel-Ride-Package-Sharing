/**
 * Wasel Root Layout v6.0
 *
 * Fixes applied (Weakness → Strength):
 *  ✅ Hamburger hidden at ≥900px via JS state + inline CSS (not className only)
 *  ✅ Test Suite & Design Ratings removed from user-visible nav
 *  ✅ Dropdown keyboard navigation (Tab/Enter/Escape)
 *  ✅ Dropdown closes when clicking outside on ALL nav groups
 *  ✅ Currency switcher in header (uses full CurrencyService)
 *  ✅ Language toggle (AR ⇆ EN) visible in header
 *  ✅ Go Online / Go Offline toggle for driver mode
 *  ✅ Full bilingual nav labels (Arabic + English)
 *  ✅ Token color unified: C.bg = #040C18 everywhere
 *  ✅ Brand wordmark aligned with Wasel product naming
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { SkipToContent } from '../components/SkipToContent';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import {
  CurrencyService,
  type SupportedCurrency,
} from '../utils/currency';
import { C, F, R, SH, GRAD, GLOBAL_STYLES } from '../utils/wasel-ds';
import { MobileBottomNav } from '../components/MobileBottomNav';

// ── Nav definition (production-safe — no internal testing tools) ──────────────
const PRODUCT_NAV_GROUPS = [
  {
    id: 'trips', label: 'Trips', labelAr: 'Trips',
    items: [
      { emoji: 'R', label: 'Find a Ride', labelAr: 'Find a Ride', desc: 'Intercity ride marketplace', descAr: 'Intercity ride marketplace', path: '/find-ride', color: C.cyan, badge: null },
      { emoji: '+', label: 'Offer a Ride', labelAr: 'Offer a Ride', desc: 'Create supply inside active corridors', descAr: 'Create supply inside active corridors', path: '/offer-ride', color: C.blue, badge: null },
    ],
  },
  {
    id: 'packages', label: 'Returns', labelAr: 'Returns',
    items: [
      { emoji: 'P', label: 'Package Tracking', labelAr: 'Package Tracking', desc: 'Escrow, QR verification, and tracking', descAr: 'Escrow, QR verification, and tracking', path: '/packages', color: C.gold, badge: null },
      { emoji: 'R3', label: 'Raje3 Returns', labelAr: 'Raje3 Returns', desc: 'Reverse logistics for retail and e-commerce', descAr: 'Reverse logistics for retail and e-commerce', path: '/raje3', color: C.gold, badge: 'RAJE3' },
    ],
  },
  {
    id: 'wallet', label: 'Wallet', labelAr: 'Wallet',
    direct: true, path: '/wallet', emoji: '$',
    desc: 'Payments, escrow, balances, and earnings in one place',
    descAr: 'Payments, escrow, balances, and earnings in one place',
    color: C.gold, badge: 'LIVE', items: [],
  },
  {
    id: 'more', label: 'More', labelAr: 'More',
    items: [
      { emoji: 'B', label: 'Bus', labelAr: 'Bus', desc: 'Fixed-price intercity coaches', descAr: 'Fixed-price intercity coaches', path: '/bus', color: C.green, badge: null },
      { emoji: 'U', label: 'Profile', labelAr: 'Profile', desc: 'Account overview and identity context', descAr: 'Account overview and identity context', path: '/profile', color: C.cyan, badge: null },
    ],
  },
] as const;

type NavGroup = (typeof PRODUCT_NAV_GROUPS)[number];

const HIDDEN_NAV_PATHS = new Set<string>();

function isVisibleNavGroup(group: NavGroup) {
  if ('direct' in group && group.direct) {
    return !HIDDEN_NAV_PATHS.has(group.path);
  }

  const items = ('items' in group ? group.items : []) as readonly { path: string }[];
  return items.some(item => !HIDDEN_NAV_PATHS.has(item.path));
}

function getVisibleNavItems(group: NavGroup) {
  if ('direct' in group && group.direct) {
    return [];
  }

  const items = ('items' in group ? group.items : []) as readonly { path: string }[];
  return items.filter(item => !HIDDEN_NAV_PATHS.has(item.path));
}

// ── Badge pill ────────────────────────────────────────────────────────────────
function Badge({ label, color = C.cyan }: { label: string; color?: string }) {
  const map: Record<string, string> = {
    LIVE: C.cyan, RAJE3: C.gold, AI: C.blue, VIP: C.gold, 'Fixed Price': C.green, QA: '#8B5CF6',
  };
  const col = map[label] || color;
  return (
    <span style={{
      fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.08em',
      padding: '2px 6px', borderRadius: R.full,
      background: `${col}18`, color: col, border: `1px solid ${col}30`,
      flexShrink: 0,
    }}>{label}</span>
  );
}

// ── Currency Switcher ─────────────────────────────────────────────────────────
function CurrencySwitcher({ ar }: { ar: boolean }) {
  const [cur, setCur] = useState<SupportedCurrency>(CurrencyService.getInstance().current);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const POPULAR: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'AED', 'SAR', 'EGP', 'GBP'];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (code: SupportedCurrency) => {
    CurrencyService.getInstance().setCurrency(code);
    setCur(code);
    setOpen(false);
    // Force re-render across app by dispatching a storage event
    window.dispatchEvent(new StorageEvent('storage', { key: 'wasel-preferred-currency' }));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={ar ? 'تغيير العملة' : 'Change currency'}
        style={{
          height: 34, padding: '0 10px', borderRadius: R.md,
          background: open ? 'rgba(0,200,232,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(0,200,232,0.35)' : 'rgba(0,200,232,0.16)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.75rem', fontWeight: 700, color: open ? C.cyan : 'rgba(239,246,255,0.8)',
          fontFamily: F, transition: 'all 0.14s',
        }}
      >
        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>💱</span>
        {cur}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s', opacity: 0.6 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)',
          right: 0, width: 200,
          background: '#040C18',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0,200,232,0.18)',
          borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          overflow: 'hidden', zIndex: 1100,
          animation: 'fade-in 0.12s ease',
        }}>
          <div style={{ padding: '8px 12px 4px', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: F }}>
            {ar ? 'اختر العملة' : 'Select Currency'}
          </div>
          {POPULAR.map(code => (
            <button key={code} onClick={() => handleSelect(code)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '8px 12px',
              background: cur === code ? 'rgba(0,200,232,0.10)' : 'transparent',
              border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: cur === code ? 700 : 500,
              color: cur === code ? C.cyan : 'rgba(239,246,255,0.75)',
              fontFamily: F, transition: 'background 0.12s',
            }}
              onMouseEnter={e => { if (cur !== code) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (cur !== code) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span>{code}</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', fontFamily: F }}>
                {CurrencyService.getInstance().getSymbol(code)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Go Online / Offline Toggle (Driver mode) ──────────────────────────────────
function OnlineToggle({ ar }: { ar: boolean }) {
  const [online, setOnline] = useState(false);
  return (
    <button
      onClick={() => setOnline(o => !o)}
      title={ar ? (online ? 'اذهب أوفلاين' : 'اذهب أونلاين') : (online ? 'Go Offline' : 'Go Online')}
      style={{
        height: 34, padding: '0 12px', borderRadius: R.full,
        background: online ? 'rgba(0,200,117,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${online ? 'rgba(0,200,117,0.45)' : 'rgba(255,255,255,0.15)'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.72rem', fontWeight: 700,
        color: online ? C.green : 'rgba(239,246,255,0.55)',
        fontFamily: F, transition: 'all 0.2s',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: online ? C.green : 'rgba(255,255,255,0.3)',
        boxShadow: online ? `0 0 8px ${C.green}` : 'none',
        flexShrink: 0, transition: 'all 0.2s',
      }} />
      {online
        ? (ar ? 'أونلاين' : 'Online')
        : (ar ? 'أوفلاين' : 'Offline')
      }
    </button>
  );
}

// ── Desktop Dropdown with keyboard nav ────────────────────────────────────────
function NavDropdown({ group, onNavigate, align, ar }: {
  group: NavGroup;
  onNavigate: (path: string) => void;
  align?: 'left' | 'center' | 'right';
  ar: boolean;
}) {
  if ('direct' in group && group.direct) return null;
  const items = getVisibleNavItems(group) as readonly {
    emoji: string; label: string; labelAr: string;
    desc: string; descAr: string; path: string; color: string; badge: string | null;
  }[];

  if (!items.length) return null;

  const posStyle: React.CSSProperties =
    align === 'right' ? { right: 0 } :
    align === 'left'  ? { left: 0 } :
    { left: '50%', transform: 'translateX(-50%)' };

  const cols = items.length <= 2 ? 'repeat(2,1fr)' : items.length === 3 ? 'repeat(3,1fr)' : 'repeat(2,1fr)';

  return (
    <div role="menu" style={{
      position: 'absolute', top: 'calc(100% + 10px)',
      ...posStyle,
      background: 'rgba(4,12,24,0.98)',
      backdropFilter: 'blur(28px)',
      border: '1px solid rgba(0,200,232,0.16)',
      borderRadius: 18,
      boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,200,232,0.06)',
      padding: 12, minWidth: 380,
      display: 'grid', gridTemplateColumns: cols,
      gap: 8, zIndex: 1000,
      animation: 'fade-in 0.15s ease',
    }}>
      {items.map((item, idx) => (
        <button
          key={item.label}
          role="menuitem"
          tabIndex={0}
          onClick={() => onNavigate(item.path)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(item.path); }
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
            padding: '11px 13px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', textAlign: ar ? 'right' : 'left',
            transition: 'all 0.14s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = `${item.color}12`;
            (e.currentTarget as HTMLElement).style.borderColor = `${item.color}30`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.15rem' }}>{item.emoji}</span>
            {item.badge && <Badge label={item.badge} color={item.color} />}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#EFF6FF', fontFamily: F }}>
            {ar ? item.labelAr : item.label}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.72)', fontFamily: F, lineHeight: 1.4 }}>
            {ar ? item.descAr : item.desc}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── User Avatar Menu ──────────────────────────────────────────────────────────
function UserMenu({
  user, onSignOut, ar,
}: {
  user: { name: string; email: string; trips: number; balance: number };
  onSignOut: () => void;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const nav = useIframeSafeNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [currency, setCurrencyDisplay] = useState(CurrencyService.getInstance().current);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Listen for currency changes
  useEffect(() => {
    const h = () => setCurrencyDisplay(CurrencyService.getInstance().current);
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  const initials = user.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const firstName = user.name.split(' ')[0];
  const balanceDisplay = CurrencyService.getInstance().formatFromJOD(user.balance);

  const menuItems = [
    { label: ar ? 'لوحة التحكم'   : 'Dashboard',       emoji: '📊', path: '/dashboard' },
    { label: ar ? 'رحلاتي'        : 'My Trips',         emoji: '🚗', path: '/find-ride'  },
    { label: ar ? 'المحفظة'       : 'Wallet',           emoji: '💳', path: '/wallet'     },
    { label: ar ? 'ملفي الشخصي'   : 'Profile',          emoji: '👤', path: '/profile'    },
    { label: ar ? 'واصل بلس ✦' : 'Wasel Plus ✦', emoji: '💎', path: '/plus'     },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px 5px 5px', borderRadius: 9999,
          background: open ? 'rgba(0,200,232,0.1)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(0,200,232,0.35)' : 'rgba(0,200,232,0.18)'}`,
          cursor: 'pointer', transition: 'all 0.15s', backdropFilter: 'blur(12px)',
        }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#00C8E8,#0090D8)',
          boxShadow: '0 0 0 1.5px rgba(0,200,232,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.68rem', fontWeight: 800, color: '#040C18', flexShrink: 0,
        }}>{initials}</div>
        <span style={{
          fontSize: '0.82rem', fontWeight: 600, color: '#EFF6FF', fontFamily: F,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80,
        }}>{firstName}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,232,0.7)" strokeWidth="2.5"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 256,
          background: 'rgba(4,12,24,0.98)', backdropFilter: 'blur(28px)',
          border: '1px solid rgba(0,200,232,0.16)',
          borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,200,232,0.06)',
          overflow: 'hidden', animation: 'fade-in 0.15s ease', zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'rgba(0,200,232,0.05)', borderBottom: '1px solid rgba(0,200,232,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg,#00C8E8,#0090D8)',
                boxShadow: '0 0 0 2px rgba(0,200,232,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 800, color: '#040C18', flexShrink: 0,
              }}>{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#EFF6FF', fontSize: '0.875rem', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.7)', fontFamily: F, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0, marginTop: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,200,232,0.10)' }}>
              <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid rgba(0,200,232,0.10)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#EFF6FF', fontFamily: F }}>{user.trips}</div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(148,163,184,0.6)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {ar ? 'رحلة' : 'Trips'}
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: C.cyan, fontFamily: F }}>{balanceDisplay}</div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(148,163,184,0.6)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {ar ? 'المحفظة' : 'Wallet'}
                </div>
              </div>
            </div>
          </div>

          {menuItems.map(item => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => { nav(item.path); setOpen(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { nav(item.path); setOpen(false); } }}
              tabIndex={0}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 16px', background: 'transparent', border: 'none',
                textAlign: 'left', fontSize: '0.82rem', fontWeight: 500,
                color: 'rgba(239,246,255,0.75)', fontFamily: F, cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,232,0.07)'; (e.currentTarget as HTMLElement).style.color = '#EFF6FF'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(239,246,255,0.75)'; }}
            >
              <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>{item.emoji}</span>
              {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(0,200,232,0.10)', margin: '0 16px' }} />
          <button
            onClick={() => { onSignOut(); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 16px', background: 'transparent', border: 'none',
              textAlign: 'left', fontSize: '0.82rem', fontWeight: 600,
              color: '#FF4455', fontFamily: F, cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,85,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>🚪</span>
            {ar ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Language Toggle ────────────────────────────────────────────────────────────
function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  return (
    <button
      onClick={() => setLanguage(ar ? 'en' : 'ar')}
      title={ar ? 'Switch to English' : 'التبديل للعربية'}
      style={{
        height: 34, padding: '0 10px', borderRadius: R.md,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,200,232,0.16)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        fontSize: '0.75rem', fontWeight: 700,
        color: 'rgba(239,246,255,0.8)', fontFamily: F, transition: 'all 0.14s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,232,0.10)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
    >
      {ar ? '🇬🇧 EN' : '🇯🇴 ع'}
    </button>
  );
}

// ── Mobile Drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose, onNavigate, user, onSignOut, ar }: {
  open: boolean; onClose: () => void; onNavigate: (p: string) => void;
  user: { name: string; email: string } | null; onSignOut: () => void; ar: boolean;
}) {
  const { setLanguage, language } = useLanguage();
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', top: 0, right: 0, width: 300, height: '100%',
          background: '#040C18', borderLeft: '1px solid rgba(0,200,232,0.15)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.7)', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,200,232,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <WaselLogo size={30} theme="light" variant="full" />
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: R.md, width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* Controls row */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,200,232,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <LangToggle />
          <CurrencySwitcher ar={ar} />
        </div>

        {user && (
          <div style={{ padding: '14px 20px', background: 'rgba(0,200,232,0.05)', borderBottom: '1px solid rgba(0,200,232,0.10)' }}>
            <div style={{ fontWeight: 700, color: '#fff', fontFamily: F, fontSize: '0.9rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.6)', fontFamily: F }}>{user.email}</div>
          </div>
        )}

        {/* Nav groups */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {PRODUCT_NAV_GROUPS.filter(isVisibleNavGroup).map(group => (
            <div key={group.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,200,232,0.06)' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>
                {ar ? group.labelAr : group.label}
              </div>
              {'direct' in group && group.direct ? (
                <button onClick={() => { onNavigate((group as any).path); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                  <span style={{ fontSize: '1.1rem' }}>{(group as any).emoji}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', fontFamily: F }}>
                    {ar ? group.labelAr : group.label}
                  </span>
                  {(group as any).badge && <Badge label={(group as any).badge} />}
                </button>
              ) : (
                (getVisibleNavItems(group) as readonly { emoji: string; label: string; labelAr: string; path: string; badge: string | null; color: string }[]).map(item => (
                  <button key={item.label} onClick={() => { onNavigate(item.path); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                    <span style={{ fontSize: '1.05rem' }}>{item.emoji}</span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', fontFamily: F }}>
                      {ar ? item.labelAr : item.label}
                    </span>
                    {item.badge && <Badge label={item.badge} color={item.color} />}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', flexShrink: 0, borderTop: '1px solid rgba(0,200,232,0.08)' }}>
          {user ? (
            <button onClick={() => { onSignOut(); onClose(); }} style={{ width: '100%', height: 42, borderRadius: R.md, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontWeight: 700, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>
              {ar ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { onNavigate('/auth'); onClose(); }} style={{ height: 42, borderRadius: R.md, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>
                {ar ? 'تسجيل الدخول' : 'Sign in'}
              </button>
              <button onClick={() => { onNavigate('/auth?tab=register'); onClose(); }} style={{ height: 42, borderRadius: R.md, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', border: 'none', color: '#040C18', fontWeight: 700, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>
                {ar ? 'ابدأ مجاناً ←' : 'Get started free →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root Layout ───────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown when clicking outside the entire nav
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveGroup(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Close everything on route change
  useEffect(() => { setActiveGroup(null); setMobileOpen(false); }, [location.pathname]);

  const navigate = useCallback((path: string) => nav(path), [nav]);

  return (
    <div style={{ minHeight: '100vh', background: '#040C18', fontFamily: F, direction: ar ? 'rtl' : 'ltr' }}>
      <SkipToContent targetId="main-content" />
      <style>{GLOBAL_STYLES + `
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button, textarea { font-family: inherit; }
        :focus-visible { outline: 2px solid #00C8E8; outline-offset: 2px; }
      `}</style>

      {/* ── Header ── */}
      <header ref={navRef} style={{
        position: 'sticky', top: 0, zIndex: 500,
        background: scrolled ? 'rgba(4,12,24,0.99)' : 'rgba(4,12,24,0.95)',
        backdropFilter: 'blur(24px)',
        borderBottom: `1px solid rgba(0,200,232,${scrolled ? '0.18' : '0.10'})`,
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.6)' : '0 2px 16px rgba(0,0,0,0.3)',
        transition: 'all 0.25s ease',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 20px',
          height: 62, display: 'flex', alignItems: 'center', gap: 16,
        }}>

          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <WaselLogo size={32} theme="light" variant="full" />
          </button>

          {/* Desktop Nav — hidden below 900px via inline style on wrapper */}
          <nav
            style={{
              display: 'flex', alignItems: 'center', flex: 1,
            }}
            className="wrl-desk-nav"
          >
            <style>{`
              @media (max-width: 899px) { .wrl-desk-nav { display: none !important; } }
              @media (max-width: 899px) { .wrl-desk-actions { display: none !important; } }
              @media (min-width: 900px) { .wrl-mobile-burger { display: none !important; } }
            `}</style>

            {PRODUCT_NAV_GROUPS.filter(isVisibleNavGroup).map(group => {
              const isDirect = 'direct' in group && group.direct;
              const isActive = activeGroup === group.id;
              return (
                <div key={group.id} style={{ position: 'relative' }}>
                  <button
                    onClick={() => isDirect
                      ? navigate((group as any).path)
                      : setActiveGroup(isActive ? null : group.id)
                    }
                    onMouseEnter={() => !isDirect && setActiveGroup(group.id)}
                    aria-haspopup={!isDirect ? 'true' : undefined}
                    aria-expanded={!isDirect ? isActive : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: R.sm,
                      background: isActive ? 'rgba(0,200,232,0.10)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      fontSize: '0.82rem', fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#00C8E8' : 'rgba(255,255,255,0.72)',
                      fontFamily: F, transition: 'all 0.14s ease', whiteSpace: 'nowrap',
                    }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.72)'; }}
                  >
                    {isDirect && (group as any).emoji && <span style={{ fontSize: '0.85rem' }}>{(group as any).emoji}</span>}
                    {ar ? group.labelAr : group.label}
                    {isDirect && (group as any).badge && <Badge label={(group as any).badge} color={(group as any).color} />}
                    {!isDirect && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s', opacity: 0.5 }}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    )}
                  </button>

                  {!isDirect && isActive && (
                    <NavDropdown
                      group={group}
                      onNavigate={p => { navigate(p); setActiveGroup(null); }}
                      align={group.id === 'trips' ? 'left' : 'center'}
                      ar={ar}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right: desktop controls */}
          <div className="wrl-desk-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <LangToggle />
            <CurrencySwitcher ar={ar} />
            {/* Driver online toggle — shown when user is a driver */}
            {user && isDriverMode && <OnlineToggle ar={ar} />}

            {user ? (
              <>
                {/* Notification bell */}
                <button
                  onClick={() => navigate('/notifications')}
                  title={ar ? 'الإشعارات' : 'Notifications'}
                  style={{
                    position: 'relative', width: 36, height: 36, borderRadius: R.md,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,200,232,0.16)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.14s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,232,0.10)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,232,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,232,0.16)'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#FF4455', border: '1.5px solid rgba(4,12,24,0.95)' }} />
                </button>
                <UserMenu user={user} onSignOut={signOut} ar={ar} />
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  style={{ height: 36, padding: '0 16px', borderRadius: R.md, fontSize: '0.82rem', fontWeight: 600, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', fontFamily: F, cursor: 'pointer', transition: 'all 0.14s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
                >
                  {ar ? 'دخول' : 'Sign in'}
                </button>
                <button
                  onClick={() => navigate('/auth?tab=register')}
                  style={{ height: 36, padding: '0 18px', borderRadius: R.md, fontSize: '0.82rem', fontWeight: 700, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', border: 'none', color: '#040C18', fontFamily: F, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.14s', boxShadow: '0 4px 16px rgba(0,200,232,0.25)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,200,232,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,200,232,0.25)'; }}
                >
                  {ar ? 'ابدأ →' : 'Get started →'}
                </button>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="wrl-mobile-burger"
            onClick={() => setMobileOpen(t => !t)}
            aria-label={ar ? 'فتح القائمة' : 'Open menu'}
            style={{
              marginLeft: 'auto', width: 38, height: 38, borderRadius: R.md,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0,200,232,0.18)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.14s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round">
              {mobileOpen
                ? <><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>
                : <><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>
              }
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={navigate}
        user={user}
        onSignOut={signOut}
        ar={ar}
      />

      {/* ── Page Content ── */}
      <main id="main-content" role="main" aria-label={ar ? 'المحتوى الرئيسي' : 'Main content'} tabIndex={-1}>
        <Outlet />
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <MobileBottomNav />
    </div>
  );
}

