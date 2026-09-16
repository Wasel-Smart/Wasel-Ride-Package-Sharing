import { lazy, Suspense, useEffect, useState } from 'react';
import { Radar } from 'lucide-react';
import { motion } from 'framer-motion';
import { WaselErrorBoundary } from '../../../components/ErrorBoundary';
import { TYPE } from '../../../utils/wasel-ds';
import { C, POPULAR_ROUTES, Skeleton } from '../HomePageShared';

const CorridorGlobeScene = lazy(() => import('./CorridorGlobeScene'));

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') {return false;}
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      'WebGLRenderingContext' in window && (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

interface CorridorGlobeSectionProps {
  ar: boolean;
}

export function CorridorGlobeSection({ ar }: CorridorGlobeSectionProps) {
  const [canRender3D, setCanRender3D] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setCanRender3D(supportsWebGL());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <motion.section
      initial={false}
      className="wasel-home-section"
      aria-label={ar ? 'شبكة الممرات الحية' : 'The live corridor network'}
    >
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wasel-home-section-icon">
            <Radar size={16} />
          </div>
          <h2 className="wasel-home-section-title">
            {ar ? 'شبكة الممرات الحية' : 'The live corridor network'}
          </h2>
        </div>
      </div>

      <div
        className="wasel-home-globe-panel"
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}
      >
        <div className="wasel-home-globe-canvas">
          {canRender3D ? (
            <WaselErrorBoundary fallback={<GlobeFallback ar={ar} />}>
              <Suspense fallback={<GlobeLoading />}>
                <CorridorGlobeScene reduceMotion={reduceMotion} />
              </Suspense>
            </WaselErrorBoundary>
          ) : (
            <GlobeFallback ar={ar} />
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
            {ar
              ? 'مسارات مباشرة من عمّان إلى وجهات واصل الأكثر طلبًا، مع حركة حيّة على كل ممر.'
              : 'Live routes from Amman to Wasel’s busiest destinations, with real-time movement on every corridor.'}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {POPULAR_ROUTES.slice(0, 5).map(route => (
              <div
                key={`${route.from}-${route.to}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: TYPE.size.xs,
                  color: C.textSub,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      background: route.color,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  {ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`}
                </span>
                <span style={{ color: C.textMuted, fontWeight: TYPE.weight.semibold, flexShrink: 0 }}>
                  {route.priceJod} {ar ? 'د.أ' : 'JOD'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function GlobeLoading() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
      <Skeleton w="70%" h={200} radius={16} />
    </div>
  );
}

function GlobeFallback({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        borderRadius: 16,
        background: C.elevated,
        border: `1px dashed ${C.border}`,
        color: C.textMuted,
        fontSize: TYPE.size.sm,
        textAlign: 'center',
        padding: 20,
      }}
    >
      {ar ? 'معاينة الخريطة التفاعلية غير متاحة على هذا الجهاز' : 'Interactive map preview isn’t available on this device'}
    </div>
  );
}
