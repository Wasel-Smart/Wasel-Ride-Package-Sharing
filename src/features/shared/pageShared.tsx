/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { PAGE_DS } from '../../styles/wasel-page-theme';
import {
  JORDAN_LOCATION_OPTIONS,
  resolveJordanLocationCoord,
} from '../../utils/jordanLocations';
import { buildAuthPagePath, buildAuthReturnTo } from '../../utils/authFlow';

export const DS = PAGE_DS;

export const r = (px = 12) => `${px}px`;

export const pill = (color: string) => ({
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 4,
  padding: '4px 11px',
  borderRadius: '999px',
  background: `${color}16`,
  border: `1px solid ${color}30`,
  fontSize: '0.68rem',
  fontWeight: 800,
  color,
});

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

function authPanelStyle() {
  return {
    width: '100%',
    maxWidth: 460,
    padding: '32px 28px',
    borderRadius: r(28),
    background: DS.card,
    border: `1px solid ${DS.border}`,
    boxShadow: 'var(--wasel-service-head-shadow)',
    textAlign: 'center' as const,
    color: DS.text,
  };
}

export function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useLocalAuth();
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '24px 16px',
        }}
      >
        <div style={authPanelStyle()}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <WaselLogo size={38} theme="light" variant="full" showWordmark={false} />
          </div>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: r(18),
              margin: '0 auto 18px',
              background: 'rgba(15,115,255,0.12)',
              border: '1px solid rgba(15,115,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DS.cyan,
              fontSize: '1.1rem',
              fontWeight: 900,
            }}
          >
            W
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 8 }}>Checking access</div>
          <div style={{ color: DS.sub, fontSize: '0.86rem', lineHeight: 1.7 }}>
            Loading your Wasel account and restoring the service flow.
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '24px 16px',
        }}
      >
        <div role="status" aria-live="polite" style={authPanelStyle()}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <WaselLogo size={38} theme="light" variant="full" showWordmark={false} />
          </div>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: r(18),
              margin: '0 auto 16px',
              background: 'rgba(15,115,255,0.12)',
              border: '1px solid rgba(15,115,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DS.cyan,
            }}
          >
            <Shield size={24} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 8 }}>Sign in required</div>
          <div style={{ color: DS.sub, fontSize: '0.86rem', lineHeight: 1.7, marginBottom: 20 }}>
            Sign in to continue into the Wasel service network.
          </div>
          <button
            type="button"
            onClick={() =>
              nav(
                buildAuthPagePath(
                  'signin',
                  buildAuthReturnTo(location.pathname, location.search, location.hash),
                ),
              )
            }
            style={{
              minHeight: 46,
              padding: '0 24px',
              borderRadius: r(14),
              border: 'none',
              background: DS.gradC,
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: DS.F,
              fontSize: '0.88rem',
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

export function PageShell({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'transparent',
        fontFamily: DS.F,
        direction: ar ? 'rtl' : 'ltr',
      }}
    >
      <style>{`
        :root { color-scheme: light; }
        .w-focus:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(15,115,255,0.22); }
        @media (max-width: 899px) {
          .sp-inner { padding: 18px 14px 36px !important; }
          .sp-2col,
          .sp-3col,
          .sp-search-grid,
          .sp-summary-grid,
          .sp-bus-card-grid,
          .pkg-send-form-grid,
          .pkg-send-steps-grid,
          .sp-clarity-grid { grid-template-columns: 1fr !important; }
          .sp-4col { grid-template-columns: 1fr 1fr !important; }
          .sp-head { padding: 20px 18px !important; border-radius: 22px !important; }
          .sp-head-inner,
          .sp-results-header,
          .sp-modal-price,
          .sp-modal-route { flex-direction: column !important; align-items: flex-start !important; }
          .sp-sort-bar { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 6px !important; scrollbar-width: none !important; }
          .sp-sort-bar::-webkit-scrollbar { display: none; }
          .sp-sort-btn { flex-shrink: 0 !important; white-space: nowrap !important; }
          .sp-side-column { position: static !important; }
        }
        @media (max-width: 640px) {
          .sp-4col { grid-template-columns: 1fr !important; }
          .sp-head-btn { width: 100% !important; display: flex !important; justify-content: center !important; }
          .sp-frame { padding: 18px !important; border-radius: 24px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div
        className="sp-inner"
        style={{
          position: 'relative',
          maxWidth: 1180,
          margin: '0 auto',
          padding: '24px 16px 48px',
        }}
      >
        <div
          className="sp-frame"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: r(32),
            background: DS.bg,
            border: `1px solid ${DS.border}`,
            boxShadow: 'var(--wasel-service-head-shadow)',
            padding: 24,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: [
                'radial-gradient(circle at 14% 14%, rgba(15,115,255,0.16), transparent 24%)',
                'radial-gradient(circle at 84% 18%, rgba(25,231,187,0.14), transparent 20%)',
                'radial-gradient(circle at 72% 88%, rgba(157,232,255,0.12), transparent 18%)',
              ].join(','),
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              pointerEvents: 'none',
              backgroundImage:
                'linear-gradient(rgba(157,232,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(157,232,255,0.22) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(circle at center, black 0%, black 48%, transparent 90%)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div
      className="sp-head"
      style={{
        background: DS.sectionHeadBg,
        borderRadius: r(28),
        padding: '24px 26px',
        marginBottom: 22,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${color}28`,
        boxShadow: 'var(--wasel-shadow-lg)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 54% 100% at 8% 50%, ${color}12, transparent 64%)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          pointerEvents: 'none',
          background: `linear-gradient(90deg, transparent, ${color}46, transparent)`,
        }}
      />

      <div
        className="sp-head-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: r(18),
              background: `${color}16`,
              border: `1px solid ${color}2e`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              flexShrink: 0,
              boxShadow: `0 18px 34px ${color}18`,
            }}
          >
            {emoji}
          </div>
          <div>
            <h1
              style={{
                fontSize: 'clamp(1.35rem, 2.4vw, 1.72rem)',
                fontWeight: 900,
                color: DS.text,
                margin: 0,
                letterSpacing: '-0.04em',
              }}
            >
              {ar && titleAr ? titleAr : title}
            </h1>
            {sub ? (
              <div
                style={{
                  marginTop: 6,
                  color: DS.sub,
                  fontSize: '0.88rem',
                  lineHeight: 1.65,
                  maxWidth: 680,
                }}
              >
                {sub}
              </div>
            ) : null}
          </div>
        </div>

        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="sp-head-btn"
            style={{
              minHeight: 46,
              padding: '0 22px',
              borderRadius: r(999),
              border: 'none',
              background: DS.gradC,
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: 'var(--wasel-shadow-teal)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

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
    <div
      style={{
        display: 'grid',
        gap: 10,
        background: `linear-gradient(135deg, ${tone}12, rgba(255,255,255,0.035))`,
        border: `1px solid ${tone}2e`,
        borderRadius: r(20),
        padding: '16px 18px',
        marginBottom: 18,
        boxShadow: '0 18px 40px rgba(7,25,49,0.14)',
      }}
    >
      <div style={{ color: tone, fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Service brief
      </div>
      <div style={{ color: DS.text, fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em' }}>
        {title}
      </div>
      <div style={{ color: DS.sub, fontSize: '0.85rem', lineHeight: 1.68, maxWidth: 820 }}>
        {detail}
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
        background: `linear-gradient(180deg, ${tone}10, rgba(255,255,255,0.028))`,
        border: `1px solid ${tone}28`,
        borderRadius: r(22),
        padding: '18px 18px 16px',
        boxShadow: '0 18px 36px rgba(7,25,49,0.14)',
      }}
    >
      <div>
        <div
          style={{
            color: tone,
            fontSize: '0.7rem',
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Next step
        </div>
        <div style={{ color: DS.text, fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ color: DS.sub, fontSize: '0.84rem', lineHeight: 1.66, maxWidth: 760 }}>
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
              background: 'var(--wasel-service-card-3)',
              border: `1px solid ${tone}20`,
              borderRadius: r(16),
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                color: tone,
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {item.label}
            </div>
            <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.55 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SharedPrimitives = {
  ClarityBand,
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  SectionHead,
  midpoint,
  pill,
  r,
  resolveCityCoord,
};
