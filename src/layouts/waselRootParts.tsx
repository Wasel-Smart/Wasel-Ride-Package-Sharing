import React, { useEffect, useRef, useState } from 'react';
import { Activity, Settings, ShieldCheck, Sparkles, UserCircle2, Wallet, X } from 'lucide-react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { getVisibleNavItems, isVisibleNavGroup, PRODUCT_NAV_GROUPS, type NavGroup } from './waselRootConfig';
import { CurrencyService, type SupportedCurrency } from '../utils/currency';
import { C, F, GRAD, R } from '../utils/wasel-ds';

function getDrawerSectionLabel(groupId: string, ar: boolean) {
  if (groupId === 'profile' || groupId === 'my-trips') {
    return ar ? 'الحساب' : 'Account';
  }

  if (groupId === 'mobility-os') {
    return ar ? 'العمليات' : 'Operations';
  }

  return ar ? 'الخدمات الأساسية' : 'Core services';
}

export function Badge({ label, color = C.cyan }: { label: string; color?: string }) {
  const map: Record<string, string> = {
    LIVE: C.cyan,
    RAJE3: C.gold,
    AI: C.blue,
    VIP: C.gold,
    'Fixed Price': C.green,
    QA: C.purple,
    TRUST: C.green,
  };
  const col = map[label] || color;

  return (
    <span style={{ fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: R.full, background: `${col}18`, color: col, border: `1px solid ${col}30`, flexShrink: 0 }}>
      {label}
    </span>
  );
}

export function AppPill({ ar }: { ar: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', borderRadius: R.full, background: C.cyanDim, border: `1px solid ${C.border}`, color: C.textSub, fontSize: '0.72rem', fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />
      {ar ? 'واصل لتنقل أبسط' : 'Wasel for simpler movement'}
    </div>
  );
}

export function CurrencySwitcher({ ar }: { ar: boolean }) {
  const [cur, setCur] = useState<SupportedCurrency>(CurrencyService.getInstance().current);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popular: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'SAR', 'EGP', 'GBP'];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (code: SupportedCurrency) => {
    CurrencyService.getInstance().setCurrency(code);
    setCur(code);
    setOpen(false);
    window.dispatchEvent(new StorageEvent('storage', { key: 'wasel-preferred-currency' }));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} title={ar ? 'غيّر العملة' : 'Change currency'} style={{ height: 34, padding: '0 10px', borderRadius: R.md, background: open ? C.cyanDim : C.card, border: `1px solid ${open ? C.borderHov : C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: open ? C.text : C.textSub, fontFamily: F, transition: 'all 0.14s' }}>
        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>$</span>{cur}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s', opacity: 0.6 }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0, width: 200, background: C.bg, backdropFilter: 'blur(24px)', border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 1100, animation: 'fade-in 0.12s ease' }}>
          <div style={{ padding: '8px 12px 4px', fontSize: '0.6rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: F }}>
            {ar ? 'اختر العملة' : 'Select currency'}
          </div>
          {popular.map((code) => (
            <button key={code} onClick={() => handleSelect(code)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', background: cur === code ? C.cyanDim : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: cur === code ? 700 : 500, color: cur === code ? C.text : C.textSub, fontFamily: F, transition: 'background 0.12s' }}>
              <span>{code}</span>
              <span style={{ fontSize: '0.7rem', color: C.textMuted, fontFamily: F }}>{CurrencyService.getInstance().getSymbol(code)}</span>
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
    <button onClick={() => setOnline((o) => !o)} title={online ? (ar ? 'تحويل إلى غير متصل' : 'Go offline') : (ar ? 'تحويل إلى متصل' : 'Go online')} style={{ height: 34, padding: '0 12px', borderRadius: R.full, background: online ? C.greenDim : C.card, border: `1.5px solid ${online ? `${C.green}66` : C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: online ? C.green : C.textMuted, fontFamily: F, transition: 'all 0.2s' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? C.green : C.textMuted, boxShadow: online ? `0 0 8px ${C.green}` : 'none', flexShrink: 0, transition: 'all 0.2s' }} />
      {online ? (ar ? 'متصل' : 'Online') : (ar ? 'غير متصل' : 'Offline')}
    </button>
  );
}

export function NavDropdown({ group, onNavigate, align, ar, isAuthenticated }: { group: NavGroup; onNavigate: (path: string) => void; align?: 'left' | 'center' | 'right'; ar: boolean; isAuthenticated: boolean; }) {
  if ('direct' in group && group.direct) return null;
  const items = getVisibleNavItems(group, isAuthenticated);
  if (!items.length) return null;
  const posStyle: React.CSSProperties = align === 'right' ? { right: 0 } : align === 'left' ? { left: 0 } : { left: '50%', transform: 'translateX(-50%)' };
  const cols = items.length <= 2 ? 'repeat(2,1fr)' : items.length === 3 ? 'repeat(3,1fr)' : 'repeat(2,1fr)';

  return (
    <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 10px)', ...posStyle, background: 'rgba(8,22,35,0.98)', backdropFilter: 'blur(28px)', border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.65)', padding: 12, minWidth: 380, display: 'grid', gridTemplateColumns: cols, gap: 8, zIndex: 1000, animation: 'fade-in 0.15s ease' }}>
      {items.map((item) => (
        <button key={item.label} role="menuitem" tabIndex={0} onClick={() => onNavigate(item.path)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(item.path); } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '11px 13px', borderRadius: 12, background: C.card, border: `1px solid ${C.borderFaint}`, cursor: 'pointer', textAlign: ar ? 'right' : 'left', transition: 'all 0.14s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}55`, flexShrink: 0 }} />
            {item.badge && <Badge label={item.badge} color={item.color} />}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text, fontFamily: F }}>{ar ? item.labelAr : item.label}</div>
          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontFamily: F, lineHeight: 1.4 }}>{ar ? item.descAr : item.desc}</div>
        </button>
      ))}
    </div>
  );
}

export function UserMenu({ user, onSignOut, ar }: { user: { name: string; email: string; trips: number; balance: number }; onSignOut: () => void; ar: boolean; }) {
  const [open, setOpen] = useState(false);
  const nav = useIframeSafeNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = user.name.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px', borderRadius: 9999, background: open ? C.cyanDim : C.card, border: `1px solid ${open ? C.borderHov : C.border}`, cursor: 'pointer', transition: 'all 0.15s', backdropFilter: 'blur(12px)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, boxShadow: '0 0 0 1.5px rgba(88,221,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: C.bg, flexShrink: 0 }}>{initials}</div>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: C.text, fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{firstName}</span>
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0, width: 272, background: 'rgba(8,22,35,0.98)', backdropFilter: 'blur(28px)', border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.75)', overflow: 'hidden', animation: 'fade-in 0.15s ease', zIndex: 1000 }}>
          <div style={{ padding: '14px 16px', background: 'linear-gradient(180deg, rgba(88,221,255,0.08), rgba(11,29,45,0.18))', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.875rem', fontFamily: F }}>{user.name}</div>
            <div style={{ fontSize: '0.68rem', color: C.textMuted, fontFamily: F, marginTop: 1 }}>{user.email}</div>
            <div style={{ display: 'flex', gap: 0, marginTop: 12, background: C.card, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.borderFaint}` }}>
              <div style={{ flex: 1, padding: '8px 12px', borderInlineEnd: `1px solid ${C.borderFaint}` }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: C.text, fontFamily: F }}>{user.trips}</div>
                <div style={{ fontSize: '0.58rem', color: C.textMuted, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ar ? 'الرحلات' : 'Trips'}</div>
              </div>
              <div style={{ flex: 1, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 900, color: C.gold, fontFamily: F }}>{balanceDisplay}</div>
                <div style={{ fontSize: '0.58rem', color: C.textMuted, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ar ? 'المحفظة' : 'Wallet'}</div>
              </div>
            </div>
          </div>
          {menuItems.map((item) => (
            <button key={item.label} role="menuitem" onClick={() => { nav(item.path); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', textAlign: ar ? 'right' : 'left', fontSize: '0.82rem', fontWeight: 500, color: C.textSub, fontFamily: F, cursor: 'pointer' }}>
              <item.icon size={15} color={item.color} />
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, background: C.borderFaint, margin: '0 16px' }} />
          <button onClick={() => { onSignOut(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', textAlign: ar ? 'right' : 'left', fontSize: '0.82rem', fontWeight: 600, color: C.error, fontFamily: F, cursor: 'pointer' }}>
            <X size={16} />
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
    <button onClick={() => setLanguage(ar ? 'en' : 'ar')} title={ar ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'} style={{ height: 34, padding: '0 10px', borderRadius: R.md, background: C.card, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: C.textSub, fontFamily: F, transition: 'all 0.14s' }}>
      {ar ? 'EN' : 'AR'}
    </button>
  );
}

export function MobileDrawer({ open, onClose, onNavigate, user, onSignOut, ar }: { open: boolean; onClose: () => void; onNavigate: (p: string) => void; user: { name: string; email: string } | null; onSignOut: () => void; ar: boolean; }) {
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'; else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, insetInlineEnd: 0, width: 300, height: '100%', background: C.bg, borderInlineStart: `1px solid ${C.border}`, boxShadow: ar ? '20px 0 60px rgba(0,0,0,0.7)' : '-20px 0 60px rgba(0,0,0,0.7)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderFaint}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <WaselLogo size={30} theme="light" variant="full" />
          <button onClick={onClose} aria-label={ar ? 'إغلاق القائمة' : 'Close menu'} style={{ background: C.card, border: `1px solid ${C.borderFaint}`, borderRadius: R.md, width: 32, height: 32, cursor: 'pointer', color: C.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.borderFaint}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <LangToggle />
          {isAuthenticated && <CurrencySwitcher ar={ar} />}
        </div>
        {user && (
          <div style={{ padding: '14px 20px', background: 'linear-gradient(180deg, rgba(88,221,255,0.08), rgba(11,29,45,0.18))', borderBottom: `1px solid ${C.borderFaint}` }}>
            <div style={{ fontWeight: 700, color: C.text, fontFamily: F, fontSize: '0.9rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.72rem', color: C.textMuted, fontFamily: F }}>{user.email}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Badge label="TRUST" color={C.green} />
              <Badge label="LIVE" color={C.gold} />
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {PRODUCT_NAV_GROUPS.filter((group) => isVisibleNavGroup(group, isAuthenticated)).map((group) => (
            <div key={group.id} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.borderFaint}` }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>
                {getDrawerSectionLabel(group.id, ar)}
              </div>
              {'direct' in group && group.direct ? (
                <button onClick={() => { onNavigate((group as { path: string }).path); onClose(); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: ar ? 'right' : 'left' }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 8, borderRadius: '50%', background: (group as { color?: string }).color, boxShadow: `0 0 12px ${((group as { color?: string }).color ?? C.gold)}55`, flexShrink: 0 }} />
                  <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: C.text, fontFamily: F }}>{ar ? group.labelAr : group.label}</span>
                    <span style={{ fontSize: '0.72rem', color: C.textMuted, fontFamily: F, lineHeight: 1.5 }}>{ar ? (group as { descAr?: string }).descAr : (group as { desc?: string }).desc}</span>
                  </span>
                  {(group as { badge?: string }).badge && <Badge label={(group as { badge?: string }).badge ?? ''} />}
                </button>
              ) : (
                getVisibleNavItems(group, isAuthenticated).map((item) => (
                  <button key={item.label} onClick={() => { onNavigate(item.path); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: ar ? 'right' : 'left' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}55`, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: C.textSub, fontFamily: F }}>{ar ? item.labelAr : item.label}</span>
                    {item.badge && <Badge label={item.badge} color={item.color} />}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', flexShrink: 0, borderTop: `1px solid ${C.borderFaint}` }}>
          {user ? (
            <button onClick={() => { onSignOut(); onClose(); }} style={{ width: '100%', height: 42, borderRadius: R.md, background: C.errorDim, border: `1px solid ${C.error}55`, color: C.error, fontWeight: 700, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>
              {ar ? 'تسجيل الخروج' : 'Sign out'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { onNavigate('/auth'); onClose(); }} style={{ height: 42, borderRadius: R.md, background: 'transparent', border: `1.5px solid ${C.border}`, color: C.text, fontWeight: 600, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>
                {ar ? 'تسجيل الدخول' : 'Sign in'}
              </button>
              <button onClick={() => { onNavigate('/auth?tab=register'); onClose(); }} style={{ height: 42, borderRadius: R.md, background: GRAD, border: 'none', color: C.bg, fontWeight: 700, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>
                {ar ? 'ابدأ مجانًا' : 'Get started free'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
