/**
 * Shared primitives for all Wasel service pages.
 *
 * Extracted from the monolithic WaselServicePage.tsx so that
 * FindRidePage, OfferRidePage, BusPage, and PackagesPage can each
 * live in their own file without duplicating DS bindings, city
 * data, storage helpers, or the Protected / PageShell wrappers.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { PAGE_DS } from '../../styles/wasel-page-theme';

// ── Design-system shorthand ───────────────────────────────────────────────────
export const DS = PAGE_DS;

export const r = (px = 12) => `${px}px`;

export const pill = (color: string) => ({
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 4,
  padding: '4px 11px',
  borderRadius: '99px',
  background: `${color}15`,
  border: `1px solid ${color}30`,
  fontSize: '0.68rem',
  fontWeight: 800,
  color,
});

// ── Jordan city coordinates ───────────────────────────────────────────────────
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Amman:      { lat: 31.9539, lng: 35.9106 },
  Aqaba:      { lat: 29.5321, lng: 35.0060 },
  Irbid:      { lat: 32.5568, lng: 35.8479 },
  Zarqa:      { lat: 32.0728, lng: 36.0880 },
  'Dead Sea': { lat: 31.5590, lng: 35.4732 },
  Karak:      { lat: 31.1854, lng: 35.7048 },
  Madaba:     { lat: 31.7196, lng: 35.7939 },
  Petra:      { lat: 30.3285, lng: 35.4444 },
  Jerash:     { lat: 32.2744, lng: 35.8961 },
  Mafraq:     { lat: 32.3429, lng: 36.2080 },
  Salt:       { lat: 32.0392, lng: 35.7272 },
  'Wadi Rum': { lat: 29.5734, lng: 35.4196 },
  Ajloun:     { lat: 32.3333, lng: 35.7528 },
  "Ma'in":    { lat: 31.6796, lng: 35.6217 },
};

export const CITIES = [
  'Amman','Aqaba','Irbid','Zarqa','Dead Sea',
  'Karak','Madaba','Petra','Jerash','Mafraq','Salt','Wadi Rum','Ajloun',"Ma'in",
];

export function resolveCityCoord(city: string) {
  return CITY_COORDS[city] ?? CITY_COORDS.Amman;
}

export function midpoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

// ── localStorage helpers ──────────────────────────────────────────────────────
export function readStoredStringList(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeStoredStringList(key: string, values: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

export function readStoredObject<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

// ── Auth guard ────────────────────────────────────────────────────────────────
export function Protected({ children }: { children: ReactNode }) {
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user && mountedRef.current) {
      nav(`/app/auth?returnTo=${encodeURIComponent(location.pathname)}`);
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16, background: DS.bg,
      }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <div style={{ color: DS.sub, fontFamily: DS.F }}>Redirecting to sign in…</div>
      </div>
    );
  }
  return <>{children}</>;
}

// ── Page shell (responsive layout wrapper) ────────────────────────────────────
export function PageShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(circle at 12% 10%, rgba(0,200,232,0.12), transparent 24%), radial-gradient(circle at 88% 6%, rgba(240,168,48,0.10), transparent 22%), radial-gradient(circle at 80% 86%, rgba(0,200,117,0.08), transparent 24%), ${DS.bg}`,
      fontFamily: DS.F, direction: ar ? 'rtl' : 'ltr',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        .w-focus:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,200,232,0.28); }
        .w-focus-gold:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(240,168,48,0.28); }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        @media(max-width:899px){
          .sp-inner{ padding:16px !important; }
          .sp-2col { grid-template-columns:1fr !important; }
          .sp-3col { grid-template-columns:1fr !important; }
          .sp-4col { grid-template-columns:1fr 1fr !important; }
          .sp-head  { padding:20px 16px !important; border-radius:16px !important; }
          .sp-search-grid { grid-template-columns:1fr !important; gap:10px !important; }
          .sp-sort-bar { overflow-x:auto !important; -webkit-overflow-scrolling:touch !important; padding-bottom:6px !important; flex-wrap:nowrap !important; scrollbar-width:none !important; }
          .sp-sort-bar::-webkit-scrollbar { display:none; }
          .sp-sort-btn { flex-shrink:0 !important; white-space:nowrap !important; }
          .sp-results-header { flex-direction:column !important; align-items:flex-start !important; gap:12px !important; }
          .sp-book-btn { min-height:44px !important; }
          .sp-ride-card-body { padding:16px !important; }
          .sp-shell-grid { opacity: 0.12 !important; }
        }
        @media(max-width:480px){
          .sp-4col { grid-template-columns:1fr !important; }
          .sp-head-inner { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
          .sp-head-btn { width:100% !important; display:flex !important; justify-content:center !important; }
          .sp-inner { padding:12px !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="sp-shell-grid"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(circle at center, black 0%, black 44%, transparent 82%)',
          pointerEvents: 'none',
          opacity: 0.22,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(0,200,232,0.06), transparent 38%)',
          pointerEvents: 'none',
        }}
      />
      <div className="sp-inner" style={{ position:'relative', maxWidth: 1120, margin: '0 auto', padding: '24px 16px 36px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHead({
  emoji, title, titleAr, sub, color = DS.cyan, action,
}: {
  emoji: string; title: string; titleAr?: string; sub?: string; color?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="sp-head" style={{
      background: `linear-gradient(135deg, rgba(11,29,69,0.96), rgba(13,31,56,0.94))`,
      borderRadius: r(22), padding: '26px 24px',
      marginBottom: 20, position: 'relative', overflow: 'hidden',
      border: `1px solid ${color}20`, boxShadow: '0 16px 44px rgba(0,0,0,0.42)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 55% 80% at 12% 50%,${color}14,transparent 64%)`,
        pointerEvents: 'none',
      }} />
      <div className="sp-head-inner" style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'relative',
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
            width: 58, height: 58, borderRadius: r(18),
            background: `${color}18`, border: `1.5px solid ${color}34`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.85rem', flexShrink: 0,
          }}>
            {emoji}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: '1.62rem', fontWeight: 950, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>{title}</h1>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {titleAr && (
                <p dir="rtl" style={{
                  fontSize: '0.9rem', fontWeight: 800, color, margin: 0,
                  fontFamily: "'Cairo',sans-serif",
                }}>{titleAr}</p>
              )}
              {sub && <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.82rem' }}>{sub}</span>}
            </div>
          </div>
        </div>
        {action && (
          <button onClick={action.onClick} className="sp-head-btn" style={{
            height: 44, padding: '0 22px', borderRadius: '99px', border: 'none',
            background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 52%, #18D7C8 100%)',
            color: '#041018', fontWeight: 900, fontSize: '0.875rem',
            boxShadow: `0 12px 28px ${DS.cyan}25`, cursor: 'pointer', flexShrink: 0,
          }}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Core experience banner ────────────────────────────────────────────────────
export function CoreExperienceBanner({
  title, detail, tone = DS.cyan,
}: {
  title: string; detail: string; tone?: string;
}) {
  return (
    <div style={{
      display: 'grid', gap: 14,
      gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.8fr)',
      background: `linear-gradient(135deg, ${tone}12, rgba(255,255,255,0.02))`,
      border: `1px solid ${tone}30`, borderRadius: r(20),
      padding: '20px 20px', marginBottom: 18,
      boxShadow: '0 14px 34px rgba(0,0,0,0.22)',
    }}>
      <div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:8, padding:'4px 10px', borderRadius:'999px', background:`${tone}14`, border:`1px solid ${tone}24`, color:tone, fontSize:'0.68rem', fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Core flow
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', marginBottom: 6, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ color: DS.sub, fontSize: '0.86rem', lineHeight: 1.65 }}>{detail}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, alignContent:'start' }}>
        {[
          { label: 'Verified identity', color: DS.green },
          { label: 'Shared rides', color: DS.cyan },
          { label: 'Bus corridors', color: DS.green },
          { label: 'Rider parcel handoff', color: DS.gold },
        ].map((item) => (
          <span key={item.label} style={pill(item.color)}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
