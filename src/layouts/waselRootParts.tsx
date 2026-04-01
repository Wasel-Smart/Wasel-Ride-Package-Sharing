import React, { useEffect, useRef, useState } from 'react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { CurrencyService, type SupportedCurrency } from '../utils/currency';
import { C, F, R } from '../utils/wasel-ds';
import { getVisibleNavItems, isVisibleNavGroup, PRODUCT_NAV_GROUPS, type NavGroup } from './waselRootConfig';

export function Badge({ label, color = C.cyan }: { label: string; color?: string }) {
  const map: Record<string, string> = { LIVE: C.cyan, RAJE3: C.gold, AI: C.blue, VIP: C.gold, 'Fixed Price': C.green, QA: '#8B5CF6', TRUST: C.green };
  const col = map[label] || color;
  return <span style={{ fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: R.full, background: `${col}18`, color: col, border: `1px solid ${col}30`, flexShrink: 0 }}>{label}</span>;
}

export function AppPill({ ar }: { ar: boolean }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', borderRadius: R.full, background: 'rgba(0,200,232,0.08)', border: '1px solid rgba(0,200,232,0.18)', color: 'rgba(239,246,255,0.82)', fontSize: '0.72rem', fontWeight: 700, fontFamily: F, whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 10px ${C.green}` }} />{ar ? 'شبكة الرحلات والطرود' : 'Jordan Mobility Network'}</div>;
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
      <button onClick={() => setOpen((o) => !o)} title={ar ? 'تغيير العملة' : 'Change currency'} style={{ height: 34, padding: '0 10px', borderRadius: R.md, background: open ? 'rgba(0,200,232,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? 'rgba(0,200,232,0.35)' : 'rgba(0,200,232,0.16)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: open ? C.cyan : 'rgba(239,246,255,0.8)', fontFamily: F, transition: 'all 0.14s' }}>
        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>$</span>{cur}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s', opacity: 0.6 }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 200, background: '#040C18', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,200,232,0.18)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 1100, animation: 'fade-in 0.12s ease' }}>
        <div style={{ padding: '8px 12px 4px', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: F }}>{ar ? 'اختر العملة' : 'Select Currency'}</div>
        {popular.map((code) => <button key={code} onClick={() => handleSelect(code)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', background: cur === code ? 'rgba(0,200,232,0.10)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: cur === code ? 700 : 500, color: cur === code ? C.cyan : 'rgba(239,246,255,0.75)', fontFamily: F, transition: 'background 0.12s' }}>
          <span>{code}</span><span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', fontFamily: F }}>{CurrencyService.getInstance().getSymbol(code)}</span>
        </button>)}
      </div>}
    </div>
  );
}

export function OnlineToggle({ ar }: { ar: boolean }) {
  const [online, setOnline] = useState(false);
  return <button onClick={() => setOnline((o) => !o)} title={ar ? (online ? 'انتقل إلى وضع عدم الاتصال' : 'انتقل إلى وضع الاتصال') : online ? 'Go Offline' : 'Go Online'} style={{ height: 34, padding: '0 12px', borderRadius: R.full, background: online ? 'rgba(0,200,117,0.15)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${online ? 'rgba(0,200,117,0.45)' : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: online ? C.green : 'rgba(239,246,255,0.55)', fontFamily: F, transition: 'all 0.2s' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? C.green : 'rgba(255,255,255,0.3)', boxShadow: online ? `0 0 8px ${C.green}` : 'none', flexShrink: 0, transition: 'all 0.2s' }} />{online ? (ar ? 'متصل' : 'Online') : (ar ? 'غير متصل' : 'Offline')}</button>;
}

export function NavDropdown({ group, onNavigate, align, ar, isAuthenticated }: { group: NavGroup; onNavigate: (path: string) => void; align?: 'left' | 'center' | 'right'; ar: boolean; isAuthenticated: boolean; }) {
  if ('direct' in group && group.direct) return null;
  const items = getVisibleNavItems(group, isAuthenticated);
  if (!items.length) return null;
  const posStyle: React.CSSProperties = align === 'right' ? { right: 0 } : align === 'left' ? { left: 0 } : { left: '50%', transform: 'translateX(-50%)' };
  const cols = items.length <= 2 ? 'repeat(2,1fr)' : items.length === 3 ? 'repeat(3,1fr)' : 'repeat(2,1fr)';
  return <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 10px)', ...posStyle, background: 'rgba(4,12,24,0.98)', backdropFilter: 'blur(28px)', border: '1px solid rgba(0,200,232,0.16)', borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,200,232,0.06)', padding: 12, minWidth: 380, display: 'grid', gridTemplateColumns: cols, gap: 8, zIndex: 1000, animation: 'fade-in 0.15s ease' }}>
    {items.map((item) => <button key={item.label} role="menuitem" tabIndex={0} onClick={() => onNavigate(item.path)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(item.path); } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', textAlign: ar ? 'right' : 'left', transition: 'all 0.14s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: '1.15rem' }}>{item.emoji}</span>{item.badge && <Badge label={item.badge} color={item.color} />}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#EFF6FF', fontFamily: F }}>{ar ? item.labelAr : item.label}</div>
      <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.72)', fontFamily: F, lineHeight: 1.4 }}>{ar ? item.descAr : item.desc}</div>
    </button>)}
  </div>;
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
    { label: ar ? 'رحلاتي' : 'My Trips', emoji: 'T', path: '/my-trips' },
    { label: ar ? 'الطرود' : 'Packages', emoji: 'P', path: '/packages' },
    { label: ar ? 'ملفي الشخصي' : 'Profile', emoji: 'U', path: '/profile' },
    { label: ar ? 'واصل بلس' : 'Wasel Plus', emoji: '+', path: '/plus' },
  ];
  return <div ref={ref} style={{ position: 'relative' }}>
    <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px', borderRadius: 9999, background: open ? 'rgba(0,200,232,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${open ? 'rgba(0,200,232,0.35)' : 'rgba(0,200,232,0.18)'}`, cursor: 'pointer', transition: 'all 0.15s', backdropFilter: 'blur(12px)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#00C8E8,#0090D8)', boxShadow: '0 0 0 1.5px rgba(0,200,232,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#040C18', flexShrink: 0 }}>{initials}</div>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EFF6FF', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{firstName}</span>
    </button>
    {open && <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 256, background: 'rgba(4,12,24,0.98)', backdropFilter: 'blur(28px)', border: '1px solid rgba(0,200,232,0.16)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.75)', overflow: 'hidden', animation: 'fade-in 0.15s ease', zIndex: 1000 }}>
      <div style={{ padding: '14px 16px', background: 'rgba(0,200,232,0.05)', borderBottom: '1px solid rgba(0,200,232,0.12)' }}>
        <div style={{ fontWeight: 700, color: '#EFF6FF', fontSize: '0.875rem', fontFamily: F }}>{user.name}</div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.7)', fontFamily: F, marginTop: 1 }}>{user.email}</div>
        <div style={{ display: 'flex', gap: 0, marginTop: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,200,232,0.10)' }}>
          <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid rgba(0,200,232,0.10)' }}><div style={{ fontSize: '1rem', fontWeight: 900, color: '#EFF6FF', fontFamily: F }}>{user.trips}</div><div style={{ fontSize: '0.58rem', color: 'rgba(148,163,184,0.6)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ar ? 'رحلات' : 'Trips'}</div></div>
          <div style={{ flex: 1, padding: '8px 12px' }}><div style={{ fontSize: '0.88rem', fontWeight: 900, color: C.cyan, fontFamily: F }}>{balanceDisplay}</div><div style={{ fontSize: '0.58rem', color: 'rgba(148,163,184,0.6)', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ar ? 'المحفظة' : 'Wallet'}</div></div>
        </div>
      </div>
      {menuItems.map((item) => <button key={item.label} role="menuitem" onClick={() => { nav(item.path); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', background: 'transparent', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 500, color: 'rgba(239,246,255,0.75)', fontFamily: F, cursor: 'pointer' }}><span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>{item.emoji}</span>{item.label}</button>)}
      <div style={{ height: 1, background: 'rgba(0,200,232,0.10)', margin: '0 16px' }} />
      <button onClick={() => { onSignOut(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#FF4455', fontFamily: F, cursor: 'pointer' }}><span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>X</span>{ar ? 'تسجيل الخروج' : 'Sign out'}</button>
    </div>}
  </div>;
}

export function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  return <button onClick={() => setLanguage(ar ? 'en' : 'ar')} title={ar ? 'Switch to English' : 'التبديل إلى العربية'} style={{ height: 34, padding: '0 10px', borderRadius: R.md, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,200,232,0.16)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: 'rgba(239,246,255,0.8)', fontFamily: F, transition: 'all 0.14s' }}>{ar ? 'EN' : 'ع'}</button>;
}

export function MobileDrawer({ open, onClose, onNavigate, user, onSignOut, ar }: { open: boolean; onClose: () => void; onNavigate: (p: string) => void; user: { name: string; email: string } | null; onSignOut: () => void; ar: boolean; }) {
  const isAuthenticated = Boolean(user);
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'; else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 300, height: '100%', background: '#040C18', borderLeft: '1px solid rgba(0,200,232,0.15)', boxShadow: '-20px 0 60px rgba(0,0,0,0.7)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,200,232,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <WaselLogo size={30} theme="light" variant="full" />
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: R.md, width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,200,232,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}><LangToggle />{isAuthenticated && <CurrencySwitcher ar={ar} />}</div>
      {user && <div style={{ padding: '14px 20px', background: 'rgba(0,200,232,0.05)', borderBottom: '1px solid rgba(0,200,232,0.10)' }}><div style={{ fontWeight: 700, color: '#fff', fontFamily: F, fontSize: '0.9rem' }}>{user.name}</div><div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.6)', fontFamily: F }}>{user.email}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}><Badge label="TRUST" color={C.green} /><Badge label="LIVE" color={C.cyan} /></div></div>}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {PRODUCT_NAV_GROUPS.filter((group) => isVisibleNavGroup(group, isAuthenticated)).map((group) => (
          <div key={group.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,200,232,0.06)' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>{ar ? 'الخدمة' : 'Service'}</div>
            {'direct' in group && group.direct ? <button onClick={() => { onNavigate((group as any).path); onClose(); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}><span style={{ fontSize: '1.1rem', marginTop: 2 }}>{(group as any).emoji}</span><span style={{ display: 'grid', gap: 4, flex: 1 }}><span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', fontFamily: F }}>{ar ? group.labelAr : group.label}</span><span style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.65)', fontFamily: F, lineHeight: 1.5 }}>{ar ? (group as any).descAr : (group as any).desc}</span></span>{(group as any).badge && <Badge label={(group as any).badge} />}</button> : getVisibleNavItems(group, isAuthenticated).map((item) => <button key={item.label} onClick={() => { onNavigate(item.path); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}><span style={{ fontSize: '1.05rem' }}>{item.emoji}</span><span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', fontFamily: F }}>{ar ? item.labelAr : item.label}</span>{item.badge && <Badge label={item.badge} color={item.color} />}</button>)}
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 20px', flexShrink: 0, borderTop: '1px solid rgba(0,200,232,0.08)' }}>
        {user ? <button onClick={() => { onSignOut(); onClose(); }} style={{ width: '100%', height: 42, borderRadius: R.md, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontWeight: 700, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>{ar ? 'تسجيل الخروج' : 'Sign Out'}</button> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><button onClick={() => { onNavigate('/auth'); onClose(); }} style={{ height: 42, borderRadius: R.md, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>{ar ? 'تسجيل الدخول' : 'Sign in'}</button><button onClick={() => { onNavigate('/auth?tab=register'); onClose(); }} style={{ height: 42, borderRadius: R.md, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', border: 'none', color: '#040C18', fontWeight: 700, fontFamily: F, fontSize: '0.875rem', cursor: 'pointer' }}>{ar ? 'ابدأ مجاناً' : 'Get started free'}</button></div>}
      </div>
    </div>
  </div>;
}
