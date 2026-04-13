/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { WaselBusinessFooter } from '../components/system/WaselPresence';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import {
  CoreExperienceBanner as SharedCoreExperienceBanner,
  PageShell as SharedPageShell,
  Protected as SharedProtected,
  SectionHead as SharedSectionHead,
  midpoint as sharedMidpoint,
  resolveCityCoord as sharedResolveCityCoord,
} from '../features/shared/pageShared';
import { PAGE_DS } from '../styles/wasel-page-theme';
import { buildAuthPagePath, buildAuthReturnTo } from '../utils/authFlow';

export const DS = PAGE_DS;

export const r = (px = 12) => `${px}px`;

export const pill = (color: string) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 10px',
  borderRadius: '99px',
  background: `${color}12`,
  border: `1px solid ${color}28`,
  fontSize: '0.66rem',
  fontWeight: 700,
  color,
});

export function resolveCityCoord(city: string) {
  return sharedResolveCityCoord(city);
}

export function midpoint(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return sharedMidpoint(a, b);
}

/* ─── Protected ──────────────────────────────────────────────── */
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
      nav(buildAuthPagePath(
        'signin',
        buildAuthReturnTo(location.pathname, location.search, location.hash),
      ));
    }
  }, [loading, location.hash, location.pathname, location.search, nav, user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', background: DS.bg, padding: '24px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 440,
          padding: '32px 28px', borderRadius: r(24),
          background: 'linear-gradient(168deg, var(--wasel-surface-2) 0%, var(--wasel-surface-0) 100%)',
          border: `1px solid ${DS.border}`,
          boxShadow: 'var(--wasel-shadow-lg)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <WaselLogo size={38} theme="light" variant="full" showWordmark={false} />
          </div>
          <div style={{
            color: 'var(--wasel-copy-primary)', fontSize: '1rem',
            fontWeight: 800, marginBottom: 8,
          }}>
            Checking access
          </div>
          <div style={{
            color: DS.sub, fontFamily: DS.F, fontSize: '0.85rem', lineHeight: 1.7,
          }}>
            Loading your account…
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', background: DS.bg, padding: '24px 16px',
      }}>
        <div
          role="status"
          aria-live="polite"
          style={{
            width: '100%', maxWidth: 440,
            padding: '32px 28px', borderRadius: r(24),
            background: 'linear-gradient(168deg, var(--wasel-surface-2) 0%, var(--wasel-surface-0) 100%)',
            border: `1px solid ${DS.border}`,
            boxShadow: 'var(--wasel-shadow-lg)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <WaselLogo size={38} theme="light" variant="full" showWordmark={false} />
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: r(16),
            margin: '0 auto 16px',
            background: `${DS.cyan}10`,
            border: `1px solid ${DS.cyan}22`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: DS.cyan,
          }}>
            <Shield size={22} />
          </div>
          <div style={{
            color: 'var(--wasel-copy-primary)', fontSize: '1rem',
            fontWeight: 800, marginBottom: 8,
          }}>
            Sign in required
          </div>
          <div style={{
            color: DS.sub, fontFamily: DS.F, fontSize: '0.85rem',
            lineHeight: 1.7, marginBottom: 20,
          }}>
            Sign in to continue.
          </div>
          <button
            type="button"
            onClick={() =>
              nav(buildAuthPagePath(
                'signin',
                buildAuthReturnTo(location.pathname, location.search, location.hash),
              ))
            }
            style={{
              minHeight: 46, padding: '0 24px',
              borderRadius: r(14), border: 'none',
              background: DS.gradC,
              color: '#020c07', fontWeight: 900,
              cursor: 'pointer', fontFamily: DS.F,
              fontSize: '0.875rem',
              boxShadow: 'var(--wasel-shadow-teal)',
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/* ─── PageShell ──────────────────────────────────────────────── */
export function PageShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--wasel-shell-background)',
      fontFamily: DS.F,
      direction: ar ? 'rtl' : 'ltr',
    }}>
      <style>{`
        :root { color-scheme: dark; }
        .w-focus:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(25,231,187,0.28);
        }
        @media(max-width:899px){
          .sp-inner          { padding:16px !important; }
          .sp-2col           { grid-template-columns:1fr !important; }
          .sp-3col           { grid-template-columns:1fr !important; }
          .sp-4col           { grid-template-columns:1fr 1fr !important; }
          .sp-head           { padding:18px 16px !important; border-radius:16px !important; }
          .sp-search-grid    { grid-template-columns:1fr !important; gap:10px !important; }
          .sp-sort-bar       { overflow-x:auto !important; -webkit-overflow-scrolling:touch !important; padding-bottom:6px !important; flex-wrap:nowrap !important; scrollbar-width:none !important; }
          .sp-sort-bar::-webkit-scrollbar { display:none; }
          .sp-sort-btn       { flex-shrink:0 !important; white-space:nowrap !important; }
          .sp-results-header { flex-direction:column !important; align-items:flex-start !important; gap:12px !important; }
          .sp-book-btn       { min-height:44px !important; }
          .sp-ride-card-body { padding:16px !important; }
          .sp-summary-grid   { grid-template-columns:1fr !important; }
          .sp-bus-card-grid  { grid-template-columns:1fr !important; }
          .sp-modal-metrics  { grid-template-columns:1fr !important; }
          .sp-modal-price    { flex-direction:column !important; align-items:flex-start !important; }
          .sp-empty-actions  { grid-template-columns:1fr !important; }
          .sp-side-column    { position:static !important; }
          .pkg-send-form-grid { grid-template-columns:1fr !important; }
          .pkg-send-steps-grid { grid-template-columns:1fr !important; }
          .sp-clarity-grid   { grid-template-columns:1fr !important; }
        }
        @media(max-width:480px){
          .sp-4col     { grid-template-columns:1fr !important; }
          .sp-head-inner { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
          .sp-head-btn { width:100% !important; display:flex !important; justify-content:center !important; }
          .sp-inner    { padding:12px !important; }
          .sp-modal-route { flex-direction:column !important; align-items:flex-start !important; }
          .sp-modal-route > div { width:100%; text-align:left !important; }
        }
      `}</style>

      {/* Ambient page glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: [
            'radial-gradient(ellipse 60% 30% at 50% 0%,  rgba(25,231,187,0.11), transparent)',
            'radial-gradient(ellipse 40% 28% at 88% 82%, rgba(101,225,255,0.07), transparent)',
            'radial-gradient(ellipse 36% 24% at 12% 90%, rgba(25,231,187,0.05), transparent)',
          ].join(','),
        }}
      />

      <div
        className="sp-inner"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1120,
          margin: '0 auto',
          padding: '28px 18px',
        }}
      >
        {children}
        <div style={{ marginTop: 24 }}>
          <WaselBusinessFooter ar={ar} />
        </div>
      </div>
    </div>
  );
}

/* ─── SectionHead ────────────────────────────────────────────── */
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
  const heading = ar && titleAr ? titleAr : title;

  return (
    <div
      className="sp-head"
      style={{
        background: DS.sectionHeadBg,
        borderRadius: r(24),
        padding: '24px 26px',
        marginBottom: 22,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${color}18`,
        boxShadow: 'var(--wasel-shadow-md)',
      }}
    >
      {/* Colour bleed */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 50% 100% at 6% 50%, ${color}0d, transparent)`,
      }} />
      {/* Top specular line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 1, pointerEvents: 'none',
        background: `linear-gradient(90deg, transparent, ${color}28, transparent)`,
      }} />

      <div
        className="sp-head-inner"
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative', gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 54, height: 54, borderRadius: r(16),
            background: `${color}14`,
            border: `1.5px solid ${color}28`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.85rem',
            flexShrink: 0,
            boxShadow: `0 8px 22px ${color}18`,
          }}>
            {emoji}
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.3rem, 2.2vw, 1.6rem)',
              fontWeight: 900,
              color: 'var(--wasel-copy-primary)',
              margin: 0,
              letterSpacing: '-0.03em',
            }}>
              {heading}
            </h1>
            {sub && (
              <div style={{
                marginTop: 5,
                color: DS.sub,
                fontSize: '0.86rem',
                lineHeight: 1.62,
                maxWidth: 620,
              }}>
                {sub}
              </div>
            )}
          </div>
        </div>

        {action && (
          <button
            onClick={action.onClick}
            className="sp-head-btn"
            style={{
              height: 44, padding: '0 22px',
              borderRadius: r(999), border: 'none',
              background: DS.gradC,
              color: '#020c07', fontWeight: 900,
              fontSize: '0.875rem',
              boxShadow: `var(--wasel-shadow-teal)`,
              cursor: 'pointer', flexShrink: 0,
              transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── CoreExperienceBanner ───────────────────────────────────── */
export function CoreExperienceBanner({
  title,
  detail,
  tone = DS.cyan,
}: {
  title: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div style={{
      display: 'grid', gap: 10,
      background: `linear-gradient(135deg, ${tone}0d, rgba(255,255,255,0.018))`,
      border: `1px solid ${tone}24`,
      borderRadius: r(18),
      padding: '16px 20px',
      marginBottom: 18,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{
        color: 'var(--wasel-copy-primary)',
        fontWeight: 800, fontSize: '0.94rem',
      }}>
        {title}
      </div>
      <div style={{
        color: DS.sub, fontSize: '0.85rem',
        lineHeight: 1.66, maxWidth: 780,
      }}>
        {detail}
      </div>
    </div>
  );
}

/* ─── ClarityBand ────────────────────────────────────────────── */
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
    <div style={{
      display: 'grid', gap: 14, marginBottom: 20,
      background: `linear-gradient(180deg, ${tone}0e, rgba(255,255,255,0.022))`,
      border: `1px solid ${tone}24`,
      borderRadius: r(20),
      padding: '20px 20px 18px',
      boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 1, pointerEvents: 'none',
        background: `linear-gradient(90deg, transparent, ${tone}30, transparent)`,
      }} />

      <div>
        <div style={{
          color: tone, fontSize: '0.70rem', fontWeight: 900,
          letterSpacing: '0.13em', textTransform: 'uppercase', marginBottom: 7,
        }}>
          Clear next step
        </div>
        <div style={{
          color: 'var(--wasel-copy-primary)',
          fontWeight: 900, fontSize: '1rem',
          letterSpacing: '-0.025em', marginBottom: 5,
        }}>
          {title}
        </div>
        <div style={{
          color: DS.sub, fontSize: '0.84rem',
          lineHeight: 1.66, maxWidth: 780,
        }}>
          {detail}
        </div>
      </div>

      <div
        className="sp-clarity-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--wasel-surface-2)',
              border: `1px solid ${tone}1e`,
              borderRadius: r(14),
              padding: '12px 14px',
            }}
          >
            <div style={{
              color: tone, fontSize: '0.67rem', fontWeight: 800,
              letterSpacing: '0.09em', textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              {item.label}
            </div>
            <div style={{
              color: 'var(--wasel-copy-primary)',
              fontWeight: 700, fontSize: '0.82rem',
              lineHeight: 1.5,
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SharedPrimitives = {
  SharedCoreExperienceBanner,
  SharedPageShell,
  SharedProtected,
  SharedSectionHead,
  sharedMidpoint,
  sharedResolveCityCoord,
};
