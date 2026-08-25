/**
 * GDPR Cookie Consent Banner
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WaselButton } from '@/components/wasel-ui/WaselButton';
import { safeStorageGetItem, safeStorageSetItem } from '@/utils/browserStorage';
import { tx } from '../../locales/tx';

const CONSENT_KEY = 'wasel_cookie_consent';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const consent = safeStorageGetItem('localStorage', CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    safeStorageSetItem(
      'localStorage',
      CONSENT_KEY,
      JSON.stringify({
        accepted: true,
        timestamp: Date.now(),
        version: '1.0',
      }),
    );
    setShowBanner(false);
  }, []);

  const handleDecline = useCallback(() => {
    safeStorageSetItem(
      'localStorage',
      CONSENT_KEY,
      JSON.stringify({
        accepted: false,
        timestamp: Date.now(),
        version: '1.0',
      }),
    );
    setShowBanner(false);
  }, []);

  useEffect(() => {
    if (!showBanner) return;
    acceptRef.current?.focus();
  }, [showBanner]);

  useEffect(() => {
    if (!showBanner) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDecline();
        return;
      }

      if (event.key !== 'Tab') return;

      const banner = bannerRef.current;
      if (!banner) return;

      const focusable = Array.from(banner.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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

  if (!showBanner) return null;

  return (
    <div
      ref={bannerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 22, 40, 0.98)',
        borderTop: '1px solid rgba(85, 233, 255, 0.2)',
        padding: '1.5rem',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3
            style={{ fontSize: '1rem', fontWeight: 700, color: '#EFF6FF', marginBottom: '0.5rem' }}
          >
            {tx('cookieConsentBanner.cookie_consent')}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(239, 246, 255, 0.7)', lineHeight: 1.6 }}>
            {tx(
              'cookieConsentBanner.we_use_cookies_to_enhance_your_experience_analyze_site_usage_and_provide_personalized_content_by_clicking_accept_you_consent_to_our_use_of_cookies_see_our',
            )}{' '}
            <a href="/privacy" style={{ color: '#55E9FF', textDecoration: 'underline' }}>
              {tx('sidebar.privacy')}
            </a>{' '}
            {tx('cookieConsentBanner.for_details')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <WaselButton
            onClick={handleDecline}
            variant="outline"
            style={{
              borderColor: 'rgba(85, 233, 255, 0.3)',
              color: '#EFF6FF',
            }}
          >
            {tx('cookieConsentBanner.decline')}
          </WaselButton>
          <WaselButton
            ref={acceptRef}
            onClick={handleAccept}
            style={{
              background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 100%)',
              color: '#041018',
            }}
          >
            {tx('cookieConsentBanner.accept')}
          </WaselButton>
        </div>
      </div>
    </div>
  );
}
