/* eslint-disable react-refresh/only-export-components */
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
import {
  WaselBusinessFooter,
} from '../../components/system/WaselPresence';
import { PAGE_DS } from '../../styles/wasel-page-theme';
import {
  JORDAN_LOCATION_OPTIONS,
  resolveJordanLocationCoord,
} from '../../utils/jordanLocations';
import { buildAuthPagePath, buildAuthReturnTo } from '../../utils/authFlow';

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
export const CITIES = JORDAN_LOCATION_OPTIONS;

export function resolveCityCoord(city: string) {
  return resolveJordanLocationCoord(city);
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
  const { user, loading } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!loading && !user && mountedRef.current) {
      nav(
        buildAuthPagePath(
          'signin',
          buildAuthReturnTo(location.pathname, location.search, location.hash),
        ),
      );
    }
  }, [loading, location.hash, location.pathname, location.search, nav, user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16, background: DS.bg,
      }}>
        <div style={{ color: '#fff', fontWeight: 800, fontFamily: DS.F }}>Checking access...</div>
        <div style={{ color: DS.sub, fontFamily: DS.F }}>Please wait.</div>
      </div>
    );
  }

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
      background: `radial-gradient(circle at 12% 10%, rgba(71,183,230,0.16), transparent 24%), radial-gradient(circle at 88% 6%, rgba(168,214,20,0.1), transparent 22%), radial-gradient(circle at 80% 86%, rgba(107,181,21,0.1), transparent 24%), ${DS.bg}`,
      fontFamily: DS.F, direction: ar ? 'rtl' : 'ltr',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        .w-focus:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(71,183,230,0.28); }
        .w-focus-gold:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(168,214,20,0.24); }
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
          .sp-summary-grid { grid-template-columns:1fr !important; }
          .sp-bus-card-grid { grid-template-columns:1fr !important; }
          .sp-empty-actions { grid-template-columns:1fr !important; }
          .sp-side-column { position:static !important; }
          .pkg-send-form-grid { grid-template-columns:1fr !important; }
          .pkg-send-steps-grid { grid-template-columns:1fr !important; }
          .sp-shell-grid { opacity: 0.12 !important; }
          .sp-clarity-grid { grid-template-columns:1fr !important; }
        }
        @media(max-width:480px){
          .sp-4col { grid-template-columns:1fr !important; }
          .sp-head-inner { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
          .sp-head-btn { width:100% !important; display:flex !important; justify-content:center !important; }
          .sp-inner { padding:12px !important; }
          .sp-corridor-snapshot { grid-template-columns:1fr !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="sp-shell-grid"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.032) 1px, transparent 1px)',
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
          background: 'radial-gradient(circle at 50% 0%, rgba(71,183,230,0.08), transparent 38%), radial-gradient(circle at 82% 76%, rgba(168,214,20,0.05), transparent 24%)',
          pointerEvents: 'none',
        }}
      />
      <div className="sp-inner" style={{ position:'relative', maxWidth: 1180, margin: '0 auto', padding: '24px 16px 40px' }}>
        {children}
        <div style={{ marginTop: 18 }}>
          <WaselBusinessFooter ar={ar} />
        </div>
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
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div className="sp-head" style={{
      background: 'linear-gradient(180deg, rgba(8,23,40,0.96), rgba(8,23,40,0.92))',
      borderRadius: r(22), padding: '22px 24px',
      marginBottom: 20, position: 'relative', overflow: 'hidden',
      border: `1px solid ${color}1f`, boxShadow: '0 18px 44px rgba(0,0,0,0.34)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 55% 80% at 12% 50%,${color}10,transparent 64%)`,
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
            <h1 style={{ fontSize: '1.62rem', fontWeight: 950, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
              {ar && titleAr ? titleAr : title}
            </h1>
            {sub ? (
              <div style={{ marginTop: 6, color: 'rgba(239,246,255,0.72)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 620 }}>
                {sub}
              </div>
            ) : null}
          </div>
        </div>
        {action && (
          <button onClick={action.onClick} className="sp-head-btn" style={{
            height: 44, padding: '0 22px', borderRadius: '99px', border: 'none',
            background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 52%, #18D7C8 100%)',
            color: '#041018', fontWeight: 900, fontSize: '0.875rem',
            boxShadow: `0 10px 24px ${DS.cyan}26`, cursor: 'pointer', flexShrink: 0,
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
      display: 'grid', gap: 10,
      background: `linear-gradient(135deg, ${tone}12, rgba(255,255,255,0.02))`,
      border: `1px solid ${tone}30`, borderRadius: r(20),
      padding: '16px 18px', marginBottom: 18,
      boxShadow: '0 14px 34px rgba(0,0,0,0.22)',
    }}>
      <div>
        <div style={{ color: tone, fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Brief
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', marginBottom: 4, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ color: DS.sub, fontSize: '0.86rem', lineHeight: 1.65, maxWidth: 760 }}>{detail}</div>
      </div>
    </div>
  );
}

export function ClarityBand({
  title,
  detail,
  items,
  tone = DS.cyan,
}: {
  title: string;
  detail: string;
  items: Array<{ label: string; value: string }>;
  tone?: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        marginBottom: 18,
        background: `linear-gradient(180deg, ${tone}0f, rgba(255,255,255,0.025))`,
        border: `1px solid ${tone}26`,
        borderRadius: r(20),
        padding: '18px 18px 16px',
        boxShadow: '0 14px 32px rgba(0,0,0,0.2)',
      }}
    >
      <div>
        <div style={{ color: tone, fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Next step
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ color: DS.sub, fontSize: '0.84rem', lineHeight: 1.65, maxWidth: 760 }}>
          {detail}
        </div>
      </div>
      <div className="sp-clarity-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {items.map((item) => (
          <div key={item.label} style={{ background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(14), padding: '12px 14px' }}>
            <div style={{ color: tone, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              {item.label}
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.5 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
