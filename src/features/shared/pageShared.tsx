 
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { Button } from '../../components/ui/button';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANDING_RESPONSIVE_STYLES } from '../home/landingConstants';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { PAGE_DS } from '../../styles/wasel-page-theme';
import {
  JORDAN_LOCATION_OPTIONS,
  resolveJordanLocationCoord,
} from '../../utils/jordanLocations';
import { buildAuthPagePath, buildAuthReturnTo } from '../../utils/authFlow';
import { getConfig } from '../../utils/env';

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

export function Protected({ children }: { children: ReactNode }) {
  const { user: localUser, loading: localLoading } = useLocalAuth();
  const {
    user: authUser,
    session,
    loading: authLoading,
    isBackendConnected,
  } = useAuth();
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);
  const { allowLocalPersistenceFallback, enableDemoAccount, enablePersistedTestAuth } = getConfig();
  const allowLocalFallback =
    !isBackendConnected ||
    allowLocalPersistenceFallback ||
    enableDemoAccount ||
    enablePersistedTestAuth;
  const user = allowLocalFallback ? localUser : (session?.user ?? authUser);
  const loading = isBackendConnected && !allowLocalFallback ? authLoading : localLoading;

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
      <div className="wasel-auth-guard">
        <div className="wasel-auth-guard__panel">
          <div className="wasel-auth-guard__logo">
            <WaselLogo size={38} variant="full" showWordmark={false} />
          </div>
          <div className="wasel-auth-guard__icon">
            W
          </div>
          <div className="wasel-auth-guard__title">Checking access</div>
          <div className="wasel-auth-guard__body">
            Loading your Wasel account and restoring your session.
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wasel-auth-guard">
        <div role="status" aria-live="polite" className="wasel-auth-guard__panel">
          <div className="wasel-auth-guard__logo">
            <WaselLogo size={38} variant="full" showWordmark={false} />
          </div>
          <div className="wasel-auth-guard__icon wasel-auth-guard__icon--shield">
            <Shield size={24} />
          </div>
          <div className="wasel-auth-guard__title">Sign in required</div>
          <div className="wasel-auth-guard__body wasel-auth-guard__body--spaced">
            Sign in to continue into the Wasel service network.
          </div>
          <Button
            type="button"
            onClick={() =>
              nav(
                buildAuthPagePath(
                  'signin',
                  buildAuthReturnTo(location.pathname, location.search, location.hash),
                ),
              )
            }
          >
            Sign in
          </Button>
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
    <div className="wasel-page-shell-root" dir={ar ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: 'var(--wasel-shell-background)',
      color: 'var(--wasel-copy-primary)',
      fontFamily: DS.F,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`${LANDING_RESPONSIVE_STYLES}
        :root { color-scheme: inherit; }
        .w-focus:focus-visible { outline: none; box-shadow: var(--wasel-focus-ring); }
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
            border-bottom: 1px solid rgba(var(--wasel-border-rgb), 0.16) !important;
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

      {/* Aurora gradient layers matching landing */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--ds-accent-strong) 18%, transparent), transparent 24%), radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--ds-warning) 12%, transparent), transparent 18%), radial-gradient(circle at 52% 92%, color-mix(in srgb, var(--ds-success) 10%, transparent), transparent 22%)',
          pointerEvents: 'none',
          opacity: 0.96,
        }}
      />

      <div className="sp-inner wasel-page-shell" style={{
        position: 'relative',
        maxWidth: 1380,
        margin: '0 auto',
        padding: '28px 20px 84px',
      }}>
        <div className="wasel-page-shell__glow" aria-hidden="true" />
        <div className="sp-frame wasel-page-frame">
          <div className="wasel-page-frame__top-line" aria-hidden="true" />
          <div className="wasel-page-frame__top-wash" aria-hidden="true" />
          <div className="wasel-page-stack">{children}</div>
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
  const toneStyle = { '--wasel-section-tone': color } as CSSProperties;

  return (
    <div className="sp-head wasel-section-head" style={toneStyle}>
      <div className="sp-head-inner wasel-section-head__inner">
        <div className="wasel-section-head__intro">
          <div className="wasel-section-head__icon">
            {emoji}
          </div>
          <div>
            <div className="wasel-section-head__eyebrow">
              {ar ? 'صفحة واصل' : 'Wasel page'}
            </div>
            <h1 className="wasel-section-head__title">
              {ar && titleAr ? titleAr : title}
            </h1>
            {sub ? (
              <div className="wasel-section-head__sub">{sub}</div>
            ) : null}
          </div>
        </div>

        {action ? (
          <Button type="button" onClick={action.onClick} className="sp-head-btn">
            {action.label}
          </Button>
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
  const toneStyle = { '--wasel-section-tone': tone } as CSSProperties;

  return (
    <div className="sp-brief wasel-page-brief" style={toneStyle}>
      <div className="sp-brief-label wasel-page-brief__label">
        <div className="wasel-micro-label">
          {ar ? 'ملخص الصفحة' : 'Page brief'}
        </div>
        <div className="wasel-copy-subtle">
          {ar ? 'اجعل الخطوة التالية واضحة.' : 'Keep the next action obvious.'}
        </div>
      </div>
      <div className="wasel-page-brief__copy">
        <div className="wasel-heading-sm">{title}</div>
        <div className="wasel-copy-body" style={{ maxWidth: 820 }}>
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
  const toneStyle = { '--wasel-section-tone': tone } as CSSProperties;

  return (
    <div className="wasel-clarity-band" style={toneStyle}>
      <div>
        <div className="wasel-micro-label" style={{ marginBottom: 6 }}>
          {ar ? 'مسار واضح' : 'Clear path'}
        </div>
        <div className="wasel-heading-sm" style={{ marginBottom: 4 }}>
          {title}
        </div>
        <div className="wasel-copy-subtle" style={{ maxWidth: 760 }}>
          {detail}
        </div>
      </div>

      <div className="sp-clarity-grid wasel-clarity-grid">
        {items.map((item, index) => (
          <div key={item.label} className="wasel-clarity-item">
            <div className="wasel-clarity-item__index">
              {index + 1}
            </div>
            <div>
              <div className="wasel-clarity-item__label">
                {item.label}
              </div>
              <div className="wasel-clarity-item__value">
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
