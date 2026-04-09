/**
 * PrivacyConsentBanner
 *
 * Lightweight, GDPR + Jordan Personal Data Protection Law (2023)-aware
 * consent banner. Gates Sentry error tracking and Vercel Analytics
 * on the user's explicit choice.
 *
 * Architecture:
 *  - First visit → banner appears at bottom
 *  - Accept / Decline → stores in localStorage, banner dismissed forever
 *  - Window event "wasel:consent-granted" is emitted on accept so
 *    App.tsx / monitoring.ts can initialise analytics without a page reload
 *  - Respects prefers-reduced-motion
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const CONSENT_KEY = 'wasel_analytics_consent_v1';
type ConsentValue = 'accepted' | 'declined' | null;

function readConsent(): ConsentValue {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw === 'accepted' || raw === 'declined') return raw;
    return null;
  } catch {
    return null;
  }
}

function writeConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Silently swallow storage errors (private mode, full storage)
  }
}

function emitConsentEvent(accepted: boolean) {
  try {
    window.dispatchEvent(
      new CustomEvent('wasel:consent-decision', { detail: { accepted } }),
    );
  } catch {
    // Not critical — monitoring init will fall back to no-analytics mode
  }
}

// Called from App/monitoring bootstrap to read stored consent without importing the component
export function isAnalyticsConsented(): boolean {
  return readConsent() === 'accepted';
}

const SHELL_FONT =
  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

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
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer slightly so the banner doesn't compete with the initial render
    const t = window.setTimeout(() => {
      if (readConsent() === null) setVisible(true);
    }, 1_200);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    writeConsent('accepted');
    emitConsentEvent(true);
    setVisible(false);
  };

  const handleDecline = () => {
    writeConsent('declined');
    emitConsentEvent(false);
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
        style={{
          position: 'fixed',
          bottom: 'max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))',
          left: 0,
          right: 0,
          zIndex: 900,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 12px',
          fontFamily: SHELL_FONT,
          // Slide-up entrance (respects prefers-reduced-motion via CSS)
          animation: 'wasel-consent-slide-in 0.32s cubic-bezier(0.4,0,0.2,1) both',
        }}
      >
        <style>{`
          @keyframes wasel-consent-slide-in {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes wasel-consent-slide-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          }
        `}</style>

        <div
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'var(--card, rgba(11,33,53,0.97))',
            border: '1px solid var(--border, rgba(93,150,210,0.18))',
            borderRadius: 20,
            boxShadow:
              'var(--wasel-shadow-lg, 0 24px 64px rgba(1,10,18,0.38))',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            padding: '18px 20px 16px',
          }}
        >
          {/* Heading row */}
          <p
            style={{
              fontWeight: 800,
              fontSize: '0.9rem',
              color: 'var(--foreground, #EDF7FF)',
              margin: '0 0 6px',
              lineHeight: 1.4,
            }}
          >
            {copy.heading}
          </p>

          {/* Body copy */}
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--muted-foreground, rgba(153,184,210,0.82))',
              margin: '0 0 14px',
              lineHeight: 1.65,
            }}
          >
            {copy.body}{' '}
            <a
              href="/app/privacy"
              style={{
                color: 'var(--primary, #47B7E6)',
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
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: ar ? 'flex-end' : 'flex-start',
            }}
          >
            <button
              type="button"
              onClick={handleAccept}
              style={{
                minHeight: 40,
                padding: '0 22px',
                borderRadius: 12,
                border: 'none',
                background:
                  'linear-gradient(135deg, var(--primary, #47B7E6) 0%, #1E5FAE 100%)',
                color: 'var(--primary-foreground, #041521)',
                fontWeight: 800,
                fontSize: '0.84rem',
                fontFamily: SHELL_FONT,
                cursor: 'pointer',
                transition: 'opacity 0.14s ease',
              }}
              onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = '0.88')}
              onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = '1')}
            >
              {copy.accept}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              style={{
                minHeight: 40,
                padding: '0 22px',
                borderRadius: 12,
                border: '1px solid var(--border, rgba(93,150,210,0.18))',
                background: 'transparent',
                color: 'var(--foreground, #EDF7FF)',
                fontWeight: 700,
                fontSize: '0.84rem',
                fontFamily: SHELL_FONT,
                cursor: 'pointer',
                transition: 'background 0.14s ease',
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.05)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.background = 'transparent')
              }
            >
              {copy.decline}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
