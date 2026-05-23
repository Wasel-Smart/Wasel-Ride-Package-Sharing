/**
 * Shared primitives for all Wasel service pages.
 *
 * Extracted from the monolithic WaselServicePage.tsx so that
 * FindRidePage, OfferRidePage, BusPage, and PackagesPage can each
 * live in their own file without duplicating DS bindings, city
 * data, storage helpers, or the Protected / PageShell wrappers.
 */
import type { ReactNode } from 'react';
import { ProtectedPagePreview } from '../../components/system/ProtectedPagePreview';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { PAGE_DS } from '../../styles/wasel-page-theme';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import {
  safeStorageGetItem,
  safeStorageSetItem,
} from '../../utils/browserStorage';

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
  Salt: { lat: 32.0392, lng: 35.7272 },
  'Wadi Rum': { lat: 29.5734, lng: 35.4196 },
  Ajloun: { lat: 32.3333, lng: 35.7528 },
  "Ma'in": { lat: 31.6796, lng: 35.6217 },
};

export const CITIES = [
  'Amman',
  'Aqaba',
  'Irbid',
  'Zarqa',
  'Dead Sea',
  'Karak',
  'Madaba',
  'Petra',
  'Jerash',
  'Mafraq',
  'Salt',
  'Wadi Rum',
  'Ajloun',
  "Ma'in",
];

export function resolveCityCoord(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city] ?? CITY_COORDS.Amman!;
}

export function midpoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { lat: number; lng: number } {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

// ── session cache helpers ────────────────────────────────────────────────────
export function readStoredStringList(key: string): string[] {
  try {
    const raw = safeStorageGetItem('sessionStorage', key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeStoredStringList(key: string, values: string[]) {
  safeStorageSetItem('sessionStorage', key, JSON.stringify(values));
}

export function readStoredObject<T>(key: string, fallback: T): T {
  try {
    const raw = safeStorageGetItem('sessionStorage', key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

// ── Auth guard ────────────────────────────────────────────────────────────────
export function Protected({ children }: { children: ReactNode }) {
  const { user } = useLocalAuth();

  if (!user) {
    return <ProtectedPagePreview />;
  }
  return <>{children}</>;
}

// ── Page shell (responsive layout wrapper) ────────────────────────────────────
export function PageShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at 12% 10%, rgba(0,200,232,0.12), transparent 24%), radial-gradient(circle at 88% 6%, rgba(240,168,48,0.10), transparent 22%), radial-gradient(circle at 80% 86%, rgba(0,200,117,0.08), transparent 24%), ${DS.bg}`,
        fontFamily: DS.F,
        direction: ar ? 'rtl' : 'ltr',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        .sp-inner {
          width: 100%;
          padding: clamp(16px, 4vw, 28px) clamp(14px, 4vw, 24px) clamp(84px, 10vw, 112px) !important;
        }
        .sp-brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: clamp(16px, 3vw, 22px);
        }
        .sp-brand-pill {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(88,221,255,0.08);
          border: 1px solid rgba(88,221,255,0.16);
          color: rgba(238,248,255,0.78);
          font-size: 0.72rem;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: 0.02em;
        }
        .sp-brand-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${DS.green};
          box-shadow: 0 0 12px ${DS.green};
          flex: 0 0 auto;
        }
        .sp-head,
        .sp-flow-card,
        .sp-panel,
        .sp-surface,
        .sp-2col > *,
        .sp-3col > *,
        .sp-4col > *,
        .sp-search-grid > *,
        .sp-bus-card-grid > *,
        .sp-corridor-snapshot > * {
          min-width: 0;
        }
        .sp-head {
          background:
            radial-gradient(circle at 10% 0%, rgba(88,221,255,0.14), transparent 38%),
            linear-gradient(145deg, rgba(16,37,58,0.96), rgba(7,19,31,0.98)) !important;
          box-shadow: 0 20px 54px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05) !important;
        }
        .sp-head h1 {
          font-size: clamp(1.35rem, 5vw, 1.9rem) !important;
          line-height: 1.12 !important;
          letter-spacing: 0 !important;
          text-wrap: balance;
        }
        .sp-head p {
          font-size: clamp(0.86rem, 2.2vw, 0.95rem) !important;
          line-height: 1.55 !important;
          color: rgba(196,220,238,0.72) !important;
        }
        .sp-head-btn,
        .sp-book-btn,
        .sp-primary-action {
          min-height: 48px !important;
          border-radius: 16px !important;
          color: #041018 !important;
          background: linear-gradient(135deg, #67E8FF 0%, #38BEFF 52%, #32D8A6 100%) !important;
          box-shadow: 0 12px 28px rgba(56,190,255,0.24) !important;
          font-weight: 900 !important;
        }
        .sp-tab-bar {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px !important;
        }
        .sp-sort-btn,
        .sp-secondary-action {
          min-height: 44px !important;
          border-radius: 14px !important;
        }
        .sp-flow-card,
        .sp-panel,
        .sp-metric-card,
        .sp-4col > div,
        .sp-3col > div,
        .sp-2col > div {
          border-radius: 22px !important;
          box-shadow: 0 12px 34px rgba(0,0,0,0.24) !important;
        }
        .sp-flow-card {
          padding: clamp(16px, 4vw, 22px) !important;
        }
        .sp-field,
        .sp-input,
        .sp-select,
        .sp-textarea {
          min-height: 48px !important;
          border-radius: 14px !important;
          background: rgba(255,255,255,0.045) !important;
          border: 1px solid rgba(141,184,218,0.16) !important;
          color: #EEF8FF !important;
        }
        .sp-field:focus,
        .sp-input:focus,
        .sp-select:focus,
        .sp-textarea:focus {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(88,221,255,0.22) !important;
          border-color: rgba(88,221,255,0.36) !important;
        }
        .sp-ride-card-body {
          padding: clamp(16px, 4vw, 24px) !important;
        }
        .sp-modal-route,
        .sp-modal-price,
        .sp-results-header {
          min-width: 0;
        }
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
          .sp-summary-grid { grid-template-columns:1fr !important; }
          .sp-bus-card-grid { grid-template-columns:1fr !important; }
          .sp-empty-actions { grid-template-columns:1fr !important; }
          .sp-side-column { position:static !important; }
          .sp-shell-grid { opacity: 0.12 !important; }
        }
        @media(max-width:480px){
          .sp-4col { grid-template-columns:1fr !important; }
          .sp-head-inner { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
          .sp-head-btn { width:100% !important; display:flex !important; justify-content:center !important; }
          .sp-inner { padding:12px !important; }
          .sp-corridor-snapshot { grid-template-columns:1fr !important; }
          .sp-brand-row { flex-direction:column !important; align-items:flex-start !important; }
          .sp-brand-pill { width:100%; justify-content:flex-start; }
          .sp-tab-bar { grid-template-columns:1fr !important; }
          .sp-head > div:last-child,
          .sp-head-inner > div:first-child {
            min-width:0 !important;
          }
          .sp-head-inner > div:first-child {
            align-items:flex-start !important;
          }
          .sp-head-inner > div:first-child > div:last-child {
            min-width:0 !important;
          }
          .sp-head-inner > div:first-child > div:first-child {
            width:50px !important;
            height:50px !important;
            border-radius:16px !important;
            font-size:1.45rem !important;
          }
          .sp-flow-card,
          .sp-panel,
          .sp-metric-card {
            border-radius:20px !important;
          }
          input,
          select,
          textarea,
          button {
            font-size:16px !important;
          }
          .sp-2col > div,
          .sp-3col > div,
          .sp-4col > div {
            border-radius:20px !important;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="sp-shell-grid"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
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
      <div
        className="sp-inner"
        style={{
          position: 'relative',
          maxWidth: 1120,
          margin: '0 auto',
          padding: '24px 16px 36px',
        }}
      >
        <div className="sp-brand-row">
          <WaselLogo size={34} theme="light" variant="full" />
          <div className="sp-brand-pill">
            <span className="sp-brand-dot" />
            {ar
              ? 'Wasel unified transport flow'
              : 'Wasel unified transport flow'}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHead({
  emoji,
  title,
  titleAr,
  sub,
  color = DS.cyan,
  action,
}: {
  emoji: string;
  title: string;
  titleAr?: string;
  sub?: string;
  color?: string;
  action?: { label: string; onClick: () => void };
}) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const displayTitle = ar && titleAr ? titleAr : title;

  return (
    <div
      className="sp-head"
      style={{
        background: `linear-gradient(135deg, rgba(11,29,69,0.96), rgba(13,31,56,0.94))`,
        borderRadius: r(22),
        padding: '26px 24px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${color}20`,
        boxShadow: '0 16px 44px rgba(0,0,0,0.42)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 55% 80% at 12% 50%,${color}14,transparent 64%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        className="sp-head-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: r(18),
              background: `${color}18`,
              border: `1.5px solid ${color}34`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.85rem',
              flexShrink: 0,
            }}
          >
            {emoji}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: '1.62rem',
                  fontWeight: 950,
                  color: '#fff',
                  margin: 0,
                  letterSpacing: '-0.03em',
                }}
              >
                {displayTitle}
              </h1>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {sub && (
                <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.78rem' }}>{sub}</span>
              )}
            </div>
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="sp-head-btn"
            style={{
              height: 44,
              padding: '0 22px',
              borderRadius: '99px',
              border: 'none',
              background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 52%, #18D7C8 100%)',
              color: '#041018',
              fontWeight: 900,
              fontSize: '0.875rem',
              boxShadow: `0 12px 28px ${DS.cyan}25`,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Core experience banner ────────────────────────────────────────────────────
export function CoreExperienceBanner({
  title,
  detail: _detail,
  tone = DS.cyan,
}: {
  title: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: `linear-gradient(135deg, ${tone}12, rgba(255,255,255,0.02))`,
        border: `1px solid ${tone}30`,
        borderRadius: r(16),
        padding: '12px 14px',
        marginBottom: 18,
        boxShadow: '0 14px 34px rgba(0,0,0,0.22)',
      }}
    >
      <span style={pill(tone)}>Info</span>
      <div
        style={{ color: '#fff', fontWeight: 800, fontSize: '0.92rem', letterSpacing: '-0.02em' }}
      >
        {title}
      </div>
    </div>
  );
}
