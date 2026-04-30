import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { scheduleDeferredTask } from '../../utils/runtimeScheduling';

type LandingMapVariant = 'ambient' | 'full';

const MobilityOSLandingMap = lazy(async () => {
  const mod = await import('./MobilityOSLandingMap');
  return { default: mod.MobilityOSLandingMap };
});

function LandingMapPlaceholder() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: 'clamp(400px, 58vw, 660px)',
        borderRadius: 30,
        border: '1px solid var(--wasel-service-border-strong)',
        background:
          'radial-gradient(circle at 18% 14%, color-mix(in srgb, var(--ds-accent-strong) 18%, transparent), transparent 22%), radial-gradient(circle at 82% 80%, color-mix(in srgb, var(--ds-success) 12%, transparent), transparent 26%), linear-gradient(180deg, color-mix(in srgb, var(--ds-page-muted) 94%, transparent), var(--ds-page) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), var(--wasel-shadow-xl)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        className="landing-map-placeholder-shimmer"
        style={{
          position: 'absolute',
          inset: 18,
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.05)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.03) 20%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.03) 60%)',
          backgroundSize: '200% 100%',
          animation: 'landing-map-placeholder-shimmer 1.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes landing-map-placeholder-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-map-placeholder-shimmer {
            animation: none !important;
            background-position: 0 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export function DeferredLandingMap({
  ar = false,
  eager = false,
  variant = 'full',
}: {
  ar?: boolean;
  eager?: boolean;
  variant?: LandingMapVariant;
}) {
  const isTestEnv = import.meta.env.MODE === 'test';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(() => isTestEnv || eager);
  const prefersDeferredLoad = (() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const networkNavigator = navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    };
    const effectiveType = networkNavigator.connection?.effectiveType ?? '';

    return networkNavigator.connection?.saveData === true
      || effectiveType === 'slow-2g'
      || effectiveType === '2g'
      || effectiveType === '3g';
  })();

  useEffect(() => {
    if (isTestEnv || eager || shouldLoad) {
      return undefined;
    }

    const cancelIdleLoad = prefersDeferredLoad
      ? () => {}
      : scheduleDeferredTask(() => {
          setShouldLoad(true);
        }, 3_200);

    if (typeof IntersectionObserver !== 'function') {
      if (prefersDeferredLoad) {
        setShouldLoad(true);
      }

      return () => {
        cancelIdleLoad();
      };
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoad(true);
        }
      },
      { rootMargin: '240px 0px' },
    );

    const current = containerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      cancelIdleLoad();
      observer.disconnect();
    };
  }, [eager, isTestEnv, prefersDeferredLoad, shouldLoad]);

  return (
    <div ref={isTestEnv ? undefined : containerRef}>
      {isTestEnv || !shouldLoad ? (
        <LandingMapPlaceholder />
      ) : (
        <Suspense fallback={<LandingMapPlaceholder />}>
          <MobilityOSLandingMap ar={ar} variant={variant} />
        </Suspense>
      )}
    </div>
  );
}
