/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  LANDING_DISPLAY,
  LANDING_FONT,
  LANDING_RESPONSIVE_STYLES,
} from '../home/landingConstants';
import { LANDING_COLORS, landingPanel } from '../home/landing/landingTypes';
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
    ...landingPanel(28),
    width: '100%',
    maxWidth: 460,
    padding: '32px 28px',
    textAlign: 'center' as const,
    color: LANDING_COLORS.text,
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
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
            <WaselLogo size={38} variant="full" showWordmark={false} />
          </div>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: r(18),
              margin: '0 auto 18px',
              background: DS.cyanG,
              border: `1px solid ${DS.cyan}33`,
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
          <div
            style={{
              fontFamily: LANDING_DISPLAY,
              fontSize: '1.05rem',
              fontWeight: 900,
              marginBottom: 8,
              letterSpacing: '-0.03em',
            }}
          >
            Checking access
          </div>
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
            <WaselLogo size={38} variant="full" showWordmark={false} />
          </div>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: r(18),
              margin: '0 auto 16px',
              background: DS.cyanG,
              border: `1px solid ${DS.cyan}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DS.cyan,
            }}
          >
            <Shield size={24} />
          </div>
          <div
            style={{
              fontFamily: LANDING_DISPLAY,
              fontSize: '1.05rem',
              fontWeight: 900,
              marginBottom: 8,
              letterSpacing: '-0.03em',
            }}
          >
            Sign in required
          </div>
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
              color: 'var(--primary-foreground)',
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
        fontFamily: LANDING_FONT,
        direction: ar ? 'rtl' : 'ltr',
      }}
      >
      <style>{`${LANDING_RESPONSIVE_STYLES}
        :root { color-scheme: inherit; }
        .w-focus:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(101,225,255,0.24); }
        @media (max-width: 1140px) {
          .sp-2col,
          .sp-profile-hero,
          .sp-profile-grid { grid-template-columns: 1fr !important; }
          .sp-3col { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .sp-4col { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .sp-head-inner { align-items: flex-start !important; }
        }
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
          .sp-brief,
          .sp-results-header,
          .sp-modal-price,
          .sp-modal-route { flex-direction: column !important; align-items: flex-start !important; }
          .sp-brief { display: grid !important; grid-template-columns: 1fr !important; }
          .sp-brief-label {
            border-right: none !important;
            border-left: none !important;
            border-bottom: 1px solid rgba(58,124,165,0.16) !important;
            padding-right: 0 !important;
            padding-left: 0 !important;
            padding-bottom: 10px !important;
          }
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
          maxWidth: 1380,
          margin: '0 auto',
          padding: '28px 20px 72px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '10px 8px auto',
            height: 200,
            pointerEvents: 'none',
            background: [
              `radial-gradient(circle at ${ar ? '92%' : '8%'} 18%, rgba(32,216,255,0.16), transparent 28%)`,
              'radial-gradient(circle at 78% 28%, rgba(183,255,43,0.10), transparent 24%)',
              'radial-gradient(circle at 26% 84%, rgba(19,136,217,0.10), transparent 24%)',
            ].join(','),
            filter: 'blur(10px)',
          }}
        />
        <div
          className="sp-frame"
          style={{
            ...landingPanel(34),
            position: 'relative',
            overflow: 'hidden',
            padding: 30,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: [
                'radial-gradient(circle at 14% 14%, rgba(32,216,255,0.16), transparent 24%)',
                'radial-gradient(circle at 84% 18%, rgba(25,231,187,0.12), transparent 20%)',
                'radial-gradient(circle at 72% 88%, rgba(183,255,43,0.10), transparent 18%)',
              ].join(','),
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              pointerEvents: 'none',
              backgroundImage:
                'linear-gradient(rgba(157,232,255,0.20) 1px, transparent 1px), linear-gradient(90deg, rgba(157,232,255,0.20) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(circle at center, black 0%, black 48%, transparent 90%)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '0 0 auto 0',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(216,251,255,0.5), transparent)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '0 auto auto 0',
              width: '100%',
              height: 140,
              pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.16), transparent)',
              opacity: 0.7,
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 18 }}>{children}</div>
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
  emoji: ReactNode;
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
        borderRadius: r(30),
        padding: '26px 28px',
        marginBottom: 6,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${color}28`,
        boxShadow: `0 24px 54px rgba(8,18,34,0.08), inset 0 1px 0 ${color}18`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: [
            `radial-gradient(ellipse 54% 100% at ${ar ? '92%' : '8%'} 50%, ${color}12, transparent 64%)`,
            `linear-gradient(135deg, ${color}08, transparent 46%)`,
          ].join(','),
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
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: 18,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: r(20),
              background: `linear-gradient(180deg, ${color}1d, rgba(255,255,255,0.28))`,
              border: `1px solid ${color}34`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.7rem',
              flexShrink: 0,
              boxShadow: `0 20px 34px ${color}18`,
            }}
          >
            {emoji}
          </div>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                padding: '6px 12px',
                borderRadius: r(999),
                background: `${color}12`,
                border: `1px solid ${color}26`,
                color,
                fontSize: '0.66rem',
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {ar ? 'صفحة واصل' : 'Wasel page'}
            </div>
            <h1
              style={{
                fontFamily: LANDING_DISPLAY,
                fontSize: 'clamp(1.35rem, 2.4vw, 1.72rem)',
                fontWeight: 900,
                color: LANDING_COLORS.text,
                margin: 0,
                letterSpacing: '-0.04em',
              }}
            >
              {ar && titleAr ? titleAr : title}
            </h1>
            {sub ? (
              <div
                style={{
                  marginTop: 8,
                  color: DS.sub,
                  fontSize: '0.9rem',
                  lineHeight: 1.72,
                  maxWidth: 720,
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
              minHeight: 48,
              padding: '0 24px',
              borderRadius: r(999),
              border: `1px solid ${color}24`,
              background: 'rgba(255,255,255,0.82)',
              color,
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: `0 12px 28px ${color}12`,
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
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div
      className="sp-brief"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 180px) minmax(0, 1fr)',
        gap: 18,
        background: `linear-gradient(135deg, ${tone}10, rgba(255,255,255,0.06))`,
        border: `1px solid ${tone}2e`,
        borderRadius: r(24),
        padding: '18px 20px',
        marginBottom: 4,
        boxShadow: '0 18px 40px rgba(7,25,49,0.1)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div
        className="sp-brief-label"
        style={{
          display: 'grid',
          alignContent: 'start',
          gap: 8,
          paddingRight: ar ? 0 : 10,
          paddingLeft: ar ? 10 : 0,
          borderRight: ar ? 'none' : `1px solid ${tone}20`,
          borderLeft: ar ? `1px solid ${tone}20` : 'none',
        }}
      >
        <div style={{ color: tone, fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {ar ? 'ملخص الصفحة' : 'Page brief'}
        </div>
        <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.6 }}>
          {ar ? 'اجعل الخطوة التالية واضحة.' : 'Keep the next action obvious.'}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            color: LANDING_COLORS.text,
            fontFamily: LANDING_DISPLAY,
            fontWeight: 900,
            fontSize: '1.02rem',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
        <div style={{ color: DS.sub, fontSize: '0.86rem', lineHeight: 1.72, maxWidth: 820 }}>
          {detail}
        </div>
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
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        marginBottom: 4,
        background: `linear-gradient(180deg, ${tone}12, rgba(255,255,255,0.04))`,
        border: `1px solid ${tone}28`,
        borderRadius: r(24),
        padding: '18px 20px 16px',
        boxShadow: '0 18px 36px rgba(7,25,49,0.1)',
        backdropFilter: 'blur(18px)',
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
          {ar ? 'مسار واضح' : 'Clear path'}
        </div>
        <div
          style={{
            color: LANDING_COLORS.text,
            fontFamily: LANDING_DISPLAY,
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
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
          gap: 12,
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.label}
            style={{
              background: 'var(--wasel-service-card-3)',
              border: `1px solid ${tone}20`,
              borderRadius: r(18),
              padding: '14px 15px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${tone}40`;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 14px ${tone}12`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${tone}20`;
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: `${tone}18`, border: `1px solid ${tone}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.62rem', fontWeight: 900, color: tone, marginTop: 1,
            }}>
              {index + 1}
            </div>
            <div>
              <div style={{
                color: tone,
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {item.label}
              </div>
              <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.55 }}>
                {item.value}
              </div>
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
