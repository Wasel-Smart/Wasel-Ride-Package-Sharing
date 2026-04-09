/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
} from '../components/system/WaselPresence';
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
  background: `${color}15`,
  border: `1px solid ${color}30`,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: DS.bg, padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '28px 24px', borderRadius: r(24), background: `linear-gradient(180deg, ${DS.card} 0%, ${DS.bg} 100%)`, border: `1px solid ${DS.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <WaselLogo size={42} theme="light" variant="full" />
          </div>
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginBottom: 8 }}>Checking access</div>
          <div style={{ color: DS.sub, fontFamily: DS.F, fontSize: '0.85rem', lineHeight: 1.7 }}>
            Syncing your account.
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: DS.bg, padding: '24px 16px' }}>
        <div
          role="status"
          aria-live="polite"
          style={{ width: '100%', maxWidth: 480, padding: '28px 24px', borderRadius: r(24), background: `linear-gradient(180deg, ${DS.card} 0%, ${DS.bg} 100%)`, border: `1px solid ${DS.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <WaselLogo size={42} theme="light" variant="full" />
          </div>
          <div style={{ width: 58, height: 58, borderRadius: r(18), margin: '0 auto 14px', background: `${DS.cyan}12`, border: `1px solid ${DS.cyan}24`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.cyan }}>
            <Shield size={24} />
          </div>
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginBottom: 8 }}>Sign in required</div>
          <div style={{ color: DS.sub, fontFamily: DS.F, fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 16 }}>
            Sign in to continue.
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
            style={{ minHeight: 44, padding: '0 18px', borderRadius: r(14), border: 'none', background: DS.gradC, color: '#041018', fontWeight: 800, cursor: 'pointer', fontFamily: DS.F }}
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
    <div style={{ minHeight: '100vh', background: DS.bg, fontFamily: DS.F, direction: ar ? 'rtl' : 'ltr' }}>
      <style>{`
        :root { color-scheme: dark; }
        .w-focus:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(71,183,230,0.28); }
        .w-focus-gold:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(168,214,20,0.24); }
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
          .sp-modal-metrics { grid-template-columns:1fr !important; }
          .sp-modal-price { flex-direction:column !important; align-items:flex-start !important; }
          .sp-empty-actions { grid-template-columns:1fr !important; }
          .sp-side-column { position:static !important; }
          .pkg-send-form-grid { grid-template-columns:1fr !important; }
          .pkg-send-steps-grid { grid-template-columns:1fr !important; }
        }
        @media(max-width:480px){
          .sp-4col { grid-template-columns:1fr !important; }
          .sp-head-inner { flex-direction:column !important; gap:12px !important; align-items:flex-start !important; }
          .sp-head-btn { width:100% !important; display:flex !important; justify-content:center !important; }
          .sp-inner { padding:12px !important; }
          .sp-modal-route { flex-direction:column !important; align-items:flex-start !important; }
          .sp-modal-route > div { width:100%; text-align:left !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 14% 10%, rgba(71,183,230,0.16), transparent 24%), radial-gradient(circle at 85% 12%, rgba(168,214,20,0.08), transparent 20%), radial-gradient(circle at 78% 84%, rgba(107,181,21,0.08), transparent 24%)',
        }}
      />
      <div className="sp-inner" style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '24px 16px' }}>
        {children}
        <div style={{ marginTop: 18 }}>
          <WaselBusinessFooter ar={ar} />
        </div>
      </div>
    </div>
  );
}

export function SectionHead({ emoji, title, titleAr, sub, color = DS.cyan, action }: {
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
        background: 'linear-gradient(180deg, rgba(8,23,40,0.96), rgba(8,23,40,0.92))',
        borderRadius: r(22),
        padding: '22px 24px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${color}1f`,
        boxShadow: '0 18px 44px rgba(0,0,0,0.34)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 80% at 12% 50%,${color}10,transparent)`, pointerEvents: 'none' }} />
      <div className="sp-head-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: r(16), background: `${color}18`, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem', flexShrink: 0 }}>
            {emoji}
          </div>
          <div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: '#fff', margin: 0 }}>{heading}</h1>
            {sub ? (
              <div style={{ marginTop: 6, color: DS.sub, fontSize: '0.86rem', lineHeight: 1.6, maxWidth: 620 }}>
                {sub}
              </div>
            ) : null}
          </div>
        </div>
        {action && (
          <button onClick={action.onClick} className="sp-head-btn" style={{ height: 44, padding: '0 22px', borderRadius: '99px', border: 'none', background: DS.gradC, color: '#041018', fontWeight: 800, fontSize: '0.875rem', boxShadow: `0 10px 24px ${DS.cyan}26`, cursor: 'pointer', flexShrink: 0 }}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

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
        display: 'grid',
        gap: 10,
        background: `linear-gradient(135deg, ${tone}10, rgba(255,255,255,0.02))`,
        border: `1px solid ${tone}28`,
        borderRadius: r(18),
        padding: '16px 18px',
        marginBottom: 18,
      }}
    >
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.94rem' }}>{title}</div>
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
