/**
 * GDPR Cookie Consent Banner
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { safeStorageGetItem, safeStorageSetItem } from '@/utils/browserStorage';

const CONSENT_KEY = 'wasel_cookie_consent';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = safeStorageGetItem('localStorage', CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
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
  };

  const handleDecline = () => {
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
  };

  if (!showBanner) return null;

  return (
    <div
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
            Cookie Consent
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(239, 246, 255, 0.7)', lineHeight: 1.6 }}>
            We use cookies to enhance your experience, analyze site usage, and provide personalized
            content. By clicking "Accept", you consent to our use of cookies. See our{' '}
            <a href="/privacy" style={{ color: '#55E9FF', textDecoration: 'underline' }}>
              Privacy Policy
            </a>{' '}
            for details.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            onClick={handleDecline}
            variant="outline"
            style={{
              borderColor: 'rgba(85, 233, 255, 0.3)',
              color: '#EFF6FF',
            }}
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            style={{
              background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 100%)',
              color: '#041018',
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
