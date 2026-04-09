/* eslint-disable react-refresh/only-export-components */
/**
 * Shared page utilities extracted from WaselServicePage.tsx
 *
 * Provides the design system constants, layout shells, and helper
 * components that every service page depends on. Import from here
 * instead of duplicating them across page files.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { PAGE_DS } from '../../styles/wasel-page-theme';
import { buildAuthPagePath, buildAuthReturnTo } from '../../utils/authFlow';

// ── Re-export the design-system singleton so pages don't import PAGE_DS directly
export const DS = PAGE_DS;

// ── Tiny style helpers ───────────────────────────────────────────────────────
export const r = (px = 12) => `${px}px`;

export const pill = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 10px',
  borderRadius: '99px',
  background: `${color}15`,
  border: `1px solid ${color}30`,
  fontSize: '0.66rem',
  fontWeight: 700,
  color,
});

// ── Jordanian city coordinates ───────────────────────────────────────────────
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Amman: { lat: 31.9539, lng: 35.9106 },
  Aqaba: { lat: 29.5321, lng: 35.006 },
  Irbid: { lat: 32.5568, lng: 35.8479 },
  Zarqa: { lat: 32.0728, lng: 36.088 },
  'Dead Sea': { lat: 31.559, lng: 35.4732 },
  Karak: { lat: 31.1854, lng: 35.7048 },
  Madaba: { lat: 31.7196, lng: 35.7939 },
  Petra: { lat: 30.3285, lng: 35.4444 },
  Jerash: { lat: 32.2744, lng: 35.8961 },
  Mafraq: { lat: 32.3429, lng: 36.208 },
};

export function resolveCityCoord(city: string) {
  return CITY_COORDS[city] ?? CITY_COORDS.Amman;
}

export function midpoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

// ── Auth guard — redirects unauthenticated users to /auth ────────────────────
export function Protected({ children }: { children: ReactNode }) {
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user && mountedRef.current) {
      nav(
        buildAuthPagePath(
          'signin',
          buildAuthReturnTo(location.pathname, location.search, location.hash),
        ),
      );
    }
  }, [location.hash, location.pathname, location.search, nav, user]);

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          background: DS.bg,
        }}
      >
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <div style={{ color: DS.sub, fontFamily: DS.F }}>Redirecting to sign in…</div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Responsive page wrapper ──────────────────────────────────────────────────
export function PageShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at 12% 10%, rgba(22,199,242,0.16), transparent 24%), radial-gradient(circle at 88% 6%, rgba(199,255,26,0.1), transparent 22%), radial-gradient(circle at 80% 86%, rgba(96,197,54,0.1), transparent 24%), ${DS.bg}`,
        fontFamily: DS.F,
        direction: ar ? 'rtl' : 'ltr',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.032) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(circle at center, black 0%, black 44%, transparent 82%)',
          pointerEvents: 'none',
          opacity: 0.2,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(22,199,242,0.08), transparent 38%), radial-gradient(circle at 82% 76%, rgba(199,255,26,0.05), transparent 24%)',
          pointerEvents: 'none',
        }}
      />
      <style>{`
        :root { color-scheme: dark; }
        .w-focus:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(22,199,242,0.28); }
        .w-focus-gold:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(199,255,26,0.24); }
        @media(max-width:899px){
          .sp-inner { padding: 16px !important; }
          .sp-2col { grid-template-columns: 1fr !important; }
          .sp-3col { grid-template-columns: 1fr !important; }
          .sp-4col { grid-template-columns: 1fr 1fr !important; }
          .sp-head { padding: 20px 16px !important; border-radius: 16px !important; }
          .sp-search-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .sp-sort-bar { overflow-x: auto !important; flex-wrap: nowrap !important; }
          .sp-sort-bar::-webkit-scrollbar { display: none; }
          .sp-sort-btn { flex-shrink: 0 !important; white-space: nowrap !important; }
          .sp-results-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .sp-book-btn { min-height: 44px !important; }
          .sp-ride-card-body { padding: 16px !important; }
        }
        @media(max-width:480px){
          .sp-4col { grid-template-columns: 1fr !important; }
          .sp-head-inner { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
          .sp-head-btn { width: 100% !important; display: flex !important; justify-content: center !important; }
          .sp-inner { padding: 12px !important; }
        }
      `}</style>
      <div className="sp-inner" style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Section page header ──────────────────────────────────────────────────────
interface SectionHeadProps {
  emoji: string;
  title: string;
  titleAr?: string;
  sub?: string;
  color?: string;
  action?: { label: string; onClick: () => void };
}

export function SectionHead({
  emoji,
  title,
  titleAr,
  sub,
  color = DS.cyan,
  action,
}: SectionHeadProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const displayTitle = ar && titleAr ? titleAr : title;

  return (
    <div
      className="sp-head"
      style={{
        background: DS.gradNav,
        borderRadius: r(20),
        padding: '24px 24px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${DS.border}`,
      }}
    >
      <div
        className="sp-head-inner"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: r(14),
              background: `${color}18`,
              border: `1px solid ${color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              flexShrink: 0,
            }}
          >
            {emoji}
          </div>
          <div>
            <h1
              style={{
                color: DS.text,
                fontWeight: 900,
                fontSize: '1.35rem',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {displayTitle}
            </h1>
            {sub && (
              <p style={{ color: DS.sub, margin: '4px 0 0', fontSize: '0.8rem' }}>{sub}</p>
            )}
          </div>
        </div>
        {action && (
          <button
            className="sp-head-btn w-focus"
            onClick={action.onClick}
            style={{
              padding: '10px 20px',
              borderRadius: r(10),
              background: DS.gradC,
              border: 'none',
              color: '#040C18',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontFamily: DS.F,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            {action.label}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Core experience banner (contextual info card) ────────────────────────────
interface CoreBannerProps {
  title: string;
  detail: string;
  tone?: string;
}

export function CoreExperienceBanner({ title, detail, tone = DS.cyan }: CoreBannerProps) {
  return (
    <div
      style={{
        background: `${tone}08`,
        border: `1px solid ${tone}20`,
        borderRadius: r(14),
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <CheckCircle2 size={16} color={tone} style={{ marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ color: tone, fontWeight: 700, fontSize: '0.82rem', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55 }}>{detail}</div>
      </div>
    </div>
  );
}

// ── Legacy compat exports (so existing imports don't break) ──────────────────
export { CheckCircle2 };
export const PageHeader = SectionHead;
export const Pill = ({ label, color }: { label: string; color: string }) => (
  <span style={pill(color)}>{label}</span>
);
