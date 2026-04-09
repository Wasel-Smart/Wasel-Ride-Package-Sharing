/**
 * ConsentBanner
 *
 * Lightweight cookie/analytics consent banner.
 * Required by Jordan's Personal Data Protection Law (2023) and GDPR
 * for any analytics, error monitoring, or third-party tracking.
 *
 * Behaviour:
 * - Hidden if consent has already been recorded in localStorage.
 * - "Accept" → records consent + triggers deferred analytics init.
 * - "Decline" → records refusal, analytics/Sentry stay dormant.
 * - Banner disappears immediately on either action.
 *
 * The parent app (App.tsx / AppRuntimeCoordinator) should check
 * `getConsentDecision()` before initialising Sentry / Vercel Analytics.
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CONSENT_KEY = 'wasel:analytics-consent-v1';

type ConsentDecision = 'accepted' | 'declined' | null;

/** Read the stored consent decision (null = not yet decided). */
function getConsentDecision(): ConsentDecision {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'declined') return stored;
  } catch {
    /* localStorage blocked (private mode, iframe sandbox, etc.) */
  }
  return null;
}

/** Persist the user's decision and dispatch a DOM event so other modules react. */
function recordDecision(decision: 'accepted' | 'declined') {
  try {
    localStorage.setItem(CONSENT_KEY, decision);
  } catch {
    /* swallow */
  }
  window.dispatchEvent(
    new CustomEvent('wasel:consent', { detail: { decision } }),
  );
}

const F = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

export function ConsentBanner() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't decided yet
    if (getConsentDecision() === null) {
      // Small delay so it doesn't flash immediately on first paint
      const t = setTimeout(() => setVisible(true), 1_200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    recordDecision('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    recordDecision('declined');
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={ar ? 'إشعار ملفات تعريف الارتباط' : 'Cookie consent notice'}
      dir={ar ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        bottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px))',
        left: 16,
        right: 16,
        zIndex: 700,
        maxWidth: 520,
        marginInline: 'auto',
        borderRadius: 18,
        padding: '16px 20px',
        background: 'var(--card, #0b2135)',
        border: '1px solid var(--border, rgba(93,150,210,0.18))',
        boxShadow: 'var(--wasel-shadow-lg, 0 26px 72px rgba(1,10,18,0.36))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        fontFamily: F,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'consent-slide-up 0.3s cubic-bezier(0.4,0,0.2,1) both',
      }}
    >
      <style>{`
        @keyframes consent-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes consent-slide-up { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>

      <div>
        <p
          style={{
            margin: 0,
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--foreground, #edf7ff)',
            marginBottom: 4,
          }}
        >
          {ar ? 'واصل يستخدم ملفات تعريف الارتباط' : 'Wasel uses cookies'}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '0.78rem',
            color: 'var(--muted-foreground, rgba(153,184,210,0.82))',
            lineHeight: 1.6,
          }}
        >
          {ar
            ? 'نستخدم أدوات تحليل وتتبع الأخطاء لتحسين تجربتك. بياناتك تُعالج وفق قانون حماية البيانات الشخصية الأردني.'
            : 'We use analytics and error tracking to improve your experience. Your data is processed under Jordan\'s Personal Data Protection Law.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleAccept}
          style={{
            flex: 1,
            minHeight: 40,
            padding: '0 16px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary, #47b7e6), #1e5fae)',
            color: 'var(--primary-foreground, #041521)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontFamily: F,
            transition: 'opacity 0.15s',
          }}
        >
          {ar ? 'قبول' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={handleDecline}
          style={{
            flex: 1,
            minHeight: 40,
            padding: '0 16px',
            borderRadius: 10,
            border: '1px solid var(--border, rgba(93,150,210,0.18))',
            background: 'transparent',
            color: 'var(--muted-foreground, rgba(153,184,210,0.82))',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            fontFamily: F,
            transition: 'opacity 0.15s',
          }}
        >
          {ar ? 'رفض' : 'Decline'}
        </button>
        <a
          href="/app/privacy"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 40,
            padding: '0 12px',
            borderRadius: 10,
            border: '1px solid transparent',
            color: 'var(--primary, #47b7e6)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: F,
            flexShrink: 0,
          }}
        >
          {ar ? 'الخصوصية' : 'Privacy'}
        </a>
      </div>
    </div>
  );
}
