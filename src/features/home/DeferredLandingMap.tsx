import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { scheduleDeferredTask } from '../../utils/runtimeScheduling';

const MobilityOSLandingMap = lazy(async () => {
  const mod = await import('./MobilityOSLandingMap');
  return { default: mod.MobilityOSLandingMap };
});

function LandingMapPlaceholder() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: 'clamp(440px, 62vw, 720px)',
        borderRadius: 30,
        border: '1px solid rgba(245,154,44,0.08)',
        background:
          'radial-gradient(circle at 50% 14%, rgba(245,154,44,0.16), rgba(15,17,19,0) 20%), radial-gradient(circle at 78% 80%, rgba(255,179,87,0.12), rgba(15,17,19,0) 24%), linear-gradient(180deg, rgba(32,24,18,0.98), rgba(15,17,19,1))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 28px 72px rgba(0,0,0,0.26)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
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
      `}</style>
    </div>
  );
}

export function DeferredLandingMap({ ar = false }: { ar?: boolean }) {
  const isTestEnv = import.meta.env.MODE === 'test';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isTestEnv || shouldLoad) {
      return undefined;
    }

    const cancelIdleLoad = scheduleDeferredTask(() => {
      setShouldLoad(true);
    }, 3_200);

    if (typeof IntersectionObserver !== 'function') {
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
  }, [isTestEnv, shouldLoad]);

  return (
    <div ref={isTestEnv ? undefined : containerRef}>
      {isTestEnv || !shouldLoad ? (
        <LandingMapPlaceholder />
      ) : (
        <Suspense fallback={<LandingMapPlaceholder />}>
          <MobilityOSLandingMap ar={ar} />
        </Suspense>
      )}
    </div>
  );
}
