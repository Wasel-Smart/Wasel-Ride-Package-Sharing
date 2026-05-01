import { useEffect, useState } from 'react';
import {
  getAvailabilitySnapshot,
  probeBackendHealth,
  subscribeAvailability,
  type AvailabilitySnapshot,
} from '../../services/core';
import { C, F } from '../../utils/wasel-ds';

interface AvailabilityBannerProps {
  ar?: boolean;
}

function getBannerState(snapshot: AvailabilitySnapshot, ar: boolean) {
  if (!snapshot.networkOnline) {
    return {
      tone: 'offline' as const,
      title: ar ? 'أنت غير متصل الآن' : 'You are offline',
      description: ar
        ? 'التطبيق يعمل ببيانات محلية حتى تعود الشبكة.'
        : 'The app is using local fallbacks until the network returns.',
      buttonLabel: ar ? 'إعادة الفحص' : 'Retry',
    };
  }

  if (snapshot.usingFallbackMode || snapshot.backendStatus === 'degraded') {
    return {
      tone: 'degraded' as const,
      title: ar ? 'الخدمة تعمل بوضع احتياطي' : 'Service is running in fallback mode',
      description: ar
        ? 'بعض البيانات قد تكون محلية أو أقل حداثة من المعتاد.'
        : 'Some data may be local or less fresh than usual.',
      buttonLabel: ar ? 'فحص الخدمة' : 'Check service',
    };
  }

  return null;
}

export function AvailabilityBanner({ ar = false }: AvailabilityBannerProps) {
  const [snapshot, setSnapshot] = useState(() => getAvailabilitySnapshot());
  const [checking, setChecking] = useState(false);

  useEffect(() => subscribeAvailability(setSnapshot), []);

  const bannerState = getBannerState(snapshot, ar);
  if (!bannerState) {
    return null;
  }

  const theme =
    bannerState.tone === 'offline'
      ? {
          border: 'rgba(255,124,139,0.28)',
          background: 'linear-gradient(90deg, rgba(255,124,139,0.14), rgba(6,19,31,0.84))',
          accent: C.error,
        }
      : {
          border: 'rgba(255,190,92,0.28)',
          background: 'linear-gradient(90deg, rgba(255,190,92,0.12), rgba(6,19,31,0.84))',
          accent: C.gold,
        };

  const handleProbe = async () => {
    setChecking(true);
    try {
      await probeBackendHealth();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderBottom: `1px solid ${theme.border}`,
        background: theme.background,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              color: theme.accent,
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: 2,
              fontFamily: F,
            }}
          >
            {bannerState.title}
          </div>
          <div
            style={{
              color: C.textMuted,
              fontSize: '0.78rem',
              fontFamily: F,
            }}
          >
            {bannerState.description}
          </div>
        </div>

        <button
          onClick={handleProbe}
          disabled={checking}
          style={{
            minWidth: 112,
            height: 34,
            padding: '0 14px',
            borderRadius: 999,
            border: `1px solid ${theme.border}`,
            background: 'rgba(6,19,31,0.72)',
            color: C.text,
            fontWeight: 700,
            fontFamily: F,
            cursor: checking ? 'wait' : 'pointer',
            opacity: checking ? 0.75 : 1,
          }}
        >
          {checking ? (ar ? 'جارٍ الفحص...' : 'Checking...') : bannerState.buttonLabel}
        </button>
      </div>
    </div>
  );
}

export default AvailabilityBanner;
