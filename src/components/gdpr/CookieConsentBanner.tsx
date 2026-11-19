/**
 * GDPR Cookie Consent Banner — Responsive & Mobile-Nav-Aware
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WaselButton } from '@/components/wasel-ui/WaselButton';
import { safeStorageGetItem } from '@/utils/browserStorage';
import { saveCookieDecision } from '@/utils/analyticsConsent';
import { tx } from '../../locales/tx';

const CONSENT_KEY = 'wasel_cookie_consent';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    const consent = safeStorageGetItem('localStorage', CONSENT_KEY);
    return !consent;
  });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {return;}
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAccept = useCallback(() => {
    saveCookieDecision('accepted');
    setShowBanner(false);
  }, []);

  const handleDecline = useCallback(() => {
    saveCookieDecision('declined');
    setShowBanner(false);
  }, []);

  useEffect(() => {
    if (!showBanner) { return; }
    const acceptBtn = document.getElementById('cookie-accept-btn');
    acceptBtn?.focus();
  }, [showBanner]);

  useEffect(() => {
    if (!showBanner) { return; }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDecline();
        return;
      }

      if (event.key !== 'Tab') { return; }

      const banner = bannerRef.current;
      if (!banner) { return; }

      const focusable = Array.from(banner.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) { return; }

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showBanner, handleDecline]);

  if (!showBanner) { return null; }

  return (
    <div
      ref={bannerRef}
      style={{
        position: 'fixed',
        bottom: isMobile ? 'calc(68px + env(safe-area-inset-bottom, 0px))' : 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 22, 40, 0.98)',
        borderTop: '1px solid rgba(85, 233, 255, 0.2)',
        padding: isMobile ? '1rem' : '1.25rem 1.5rem',
        zIndex: 999,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 20px rgba(8,29,57, 0.35)',
        transition: 'bottom 0.2s ease-in-out',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: isMobile ? '200px' : '280px' }}>
          <h3
            style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FBFF', marginBottom: '0.35rem' }}
          >
            {tx('cookieConsentBanner.cookie_consent')}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(248,251,255,0.72)', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {tx(
              'cookieConsentBanner.we_use_cookies_to_enhance_your_experience_analyze_site_usage_and_provide_personalized_content_by_clicking_accept_you_consent_to_our_use_of_cookies_see_our',
            )}{' '}
            <a href="/privacy" style={{ color: '#00E5FF', textDecoration: 'underline' }}>
              {tx('sidebar.privacy')}
            </a>{' '}
            {tx('cookieConsentBanner.for_details')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
          <WaselButton
            onClick={() => { void handleDecline(); }}
            variant="outline"
            style={{
              borderColor: 'rgba(0,229,255,0.3)',
              color: '#F8FBFF',
              padding: '0.4rem 0.9rem',
              fontSize: '0.8125rem',
            }}
          >
            {tx('cookieConsentBanner.decline')}
          </WaselButton>
          <WaselButton
            id="cookie-accept-btn"
            onClick={() => { void handleAccept(); }}
            style={{
              background: 'linear-gradient(135deg, #00E5FF 0%, #0a3d6e 100%)',
              color: '#081D39',
              padding: '0.4rem 1rem',
              fontSize: '0.8125rem',
            }}
          >
            {tx('cookieConsentBanner.accept')}
          </WaselButton>
        </div>
      </div>
    </div>
  );
}
