/**
 * PrivacyConsentBanner
 *
 * Lightweight, GDPR + Jordan Personal Data Protection Law (2023)-aware
 * consent banner. Gates Sentry error tracking and Vercel Analytics
 * on the user's explicit choice.
 *
 * Architecture:
 *  - First visit -> banner appears at bottom
 *  - Accept / Decline -> stores in localStorage, banner dismissed forever
 *  - Window event "wasel:consent-decision" is emitted on accept so
 *    App.tsx / monitoring.ts can initialise analytics without a page reload
 *  - Respects prefers-reduced-motion
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getConsentDecision, recordConsentDecision } from '../utils/consent';

const SHELL_FONT = "var(--wasel-font-sans, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";

// Visually hidden utility (accessible, not display:none)
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

export function PrivacyConsentBanner() {
  const isTestEnv = import.meta.env.MODE === 'test';
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [visible, setVisible] = useState(false);
  const isLandingRoute = typeof window !== 'undefined' && window.location.pathname === '/';

  useEffect(() => {
    if (isTestEnv || isLandingRoute) {
      return undefined;
    }

    // Defer slightly so the banner doesn't compete with the initial render
    const t = window.setTimeout(() => {
      if (getConsentDecision() === null) {
        setVisible(true);
      }
    }, 2_200);
    return () => window.clearTimeout(t);
  }, [isLandingRoute, isTestEnv]);

  if (isTestEnv || isLandingRoute || !visible) return null;

  const handleAccept = () => {
    recordConsentDecision('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    recordConsentDecision('declined');
    setVisible(false);
  };

  const copy = {
    heading: ar ? 'نحن نحترم خصوصيتك' : 'We respect your privacy',
    body: ar
      ? 'واصل يستخدم أدوات تحليلية لتحسين تجربتك وتشخيص الأعطال. يمكنك القبول أو الرفض دون أن يتأثر وصولك لأي خدمة.'
      : 'Wasel uses analytics tools to improve your experience and diagnose issues. You can accept or decline without affecting access to any service.',
    accept: ar ? 'قبول' : 'Accept',
    decline: ar ? 'رفض' : 'Decline',
    policy: ar ? 'سياسة الخصوصية' : 'Privacy policy',
  };

  return (
    <>
      {/* Visually-hidden heading for screen readers */}
      <h2 style={srOnly} id="consent-banner-heading">
        {copy.heading}
      </h2>

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-banner-heading"
        dir={ar ? 'rtl' : 'ltr'}
        className="wasel-consent-root"
        style={{
          position: 'fixed',
          bottom: 'max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))',
          left: 0,
          right: 0,
          zIndex: 900,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 12px',
          fontFamily: SHELL_FONT,
          pointerEvents: 'none',
          // Slide-up entrance (respects prefers-reduced-motion via CSS)
          animation: 'wasel-consent-slide-in 0.32s cubic-bezier(0.4,0,0.2,1) both',
        }}
      >
        <style>{`
          @keyframes wasel-consent-slide-in {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 767px) {
            .wasel-consent-root {
              bottom: max(14px, calc(14px + env(safe-area-inset-bottom, 0px))) !important;
              padding-inline: 14px !important;
            }
            .wasel-consent-card {
              max-width: 100% !important;
            }
          }
          @media (min-width: 768px) {
            .wasel-consent-root {
              justify-content: flex-end !important;
              padding-inline: 18px !important;
            }
            .wasel-consent-card {
              max-width: 304px !important;
            }
          }
          @media (max-width: 639px) {
            .wasel-consent-card {
              border-radius: 18px !important;
              padding: 14px !important;
            }
            .wasel-consent-actions {
              gap: 8px !important;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes wasel-consent-slide-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          }
        `}</style>

        <div
          className="wasel-consent-card"
          style={{
            width: '100%',
            maxWidth: 320,
            background: 'var(--card, rgba(15,26,38,0.97))',
            border: '1px solid var(--border, rgba(244,198,81,0.18))',
            borderRadius: 20,
            boxShadow: 'var(--wasel-shadow-lg, 0 24px 64px rgba(1,10,18,0.38))',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            padding: '14px 15px 13px',
            pointerEvents: 'auto',
          }}
        >
          {/* Heading row */}
          <p
            style={{
              fontWeight: 800,
              fontSize: '0.8rem',
              color: 'var(--foreground, #F8EFD6)',
              margin: '0 0 4px',
              lineHeight: 1.4,
            }}
          >
            {copy.heading}
          </p>

          {/* Body copy */}
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--muted-foreground, rgba(228,214,180,0.82))',
              margin: '0 0 10px',
              lineHeight: 1.48,
            }}
          >
            {copy.body}{' '}
            <a
              href="/app/privacy"
              style={{
                color: 'var(--primary, #F5B041)',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                fontWeight: 600,
              }}
            >
              {copy.policy}
            </a>
          </p>

          {/* Action row */}
          <div
            className="wasel-consent-actions"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: ar ? 'flex-end' : 'flex-start',
            }}
          >
            <button
              type="button"
              onClick={handleAccept}
              style={{
                minHeight: 40,
                padding: '0 14px',
                borderRadius: 12,
                border: 'none',
                background:
                  'linear-gradient(135deg, var(--wasel-brand-gradient-start, #F5B041) 0%, var(--primary, #F5B041) 44%, var(--wasel-brand-gradient-end, #E67E22) 100%)',
                color: '#FFFDF9',
                fontWeight: 800,
                fontSize: '0.75rem',
                fontFamily: SHELL_FONT,
                cursor: 'pointer',
                transition: 'opacity 0.14s ease',
              }}
              onMouseEnter={e => ((e.target as HTMLButtonElement).style.opacity = '0.88')}
              onMouseLeave={e => ((e.target as HTMLButtonElement).style.opacity = '1')}
            >
              {copy.accept}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              style={{
                minHeight: 40,
                padding: '0 14px',
                borderRadius: 12,
                border: '1px solid var(--border, rgba(244,198,81,0.18))',
                background: 'transparent',
                color: 'var(--foreground, #F8FAFC)',
                fontWeight: 700,
                fontSize: '0.75rem',
                fontFamily: SHELL_FONT,
                cursor: 'pointer',
                transition: 'background 0.14s ease',
              }}
              onMouseEnter={e =>
                ((e.target as HTMLButtonElement).style.background = 'rgba(255,247,229,0.05)')
              }
              onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = 'transparent')}
            >
              {copy.decline}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
