import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Radar, MapPin } from 'lucide-react';
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
  const sectionRef = useRef<HTMLElement>(null);
  const [canRender3D, setCanRender3D] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {return;}

    let removeMotionListener = () => {};
    const initializeGlobe = () => {
      setCanRender3D(supportsWebGL());
      const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (!mediaQuery) {return;}

      setReduceMotion(mediaQuery.matches);
      const handleChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
      mediaQuery.addEventListener('change', handleChange);
      removeMotionListener = () => mediaQuery.removeEventListener('change', handleChange);
    };

    if (typeof IntersectionObserver === 'undefined') {
      const frame = window.requestAnimationFrame(initializeGlobe);
      return () => {
        window.cancelAnimationFrame(frame);
        removeMotionListener();
      };
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        initializeGlobe();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    return () => {
      observer.disconnect();
      removeMotionListener();
    };
  }, []);

  return (
    <motion.section
      ref={sectionRef}
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
            <WaselErrorBoundary fallback={<StaticMapFallback ar={ar} />}>
              <Suspense fallback={<GlobeLoading />}>
                <CorridorGlobeScene reduceMotion={reduceMotion} />
              </Suspense>
            </WaselErrorBoundary>
          ) : (
            <StaticMapFallback ar={ar} />
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
            {ar
              ? 'استكشف المسارات الشائعة من عمّان إلى وجهات في أنحاء الأردن.'
              : 'Explore popular routes from Amman to destinations across Jordan.'}
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

function StaticMapFallback({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 16,
        background: C.elevated,
        border: `1px solid ${C.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <img
        src="/brand/assets/og/og-default.png"
        alt={ar ? 'خريطة مسارات واصل' : 'Wasel routes map'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <MapPin size={48} color={C.cyan} style={{ opacity: 0.8 }} />
        <p style={{ margin: 0, color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.6 }}>
          {ar
            ? 'خريطة تفاعلية للمسارات — تتطلب WebGL'
            : 'Interactive corridor map — requires WebGL'}
        </p>
        <p style={{ margin: 0, color: C.textSub, fontSize: TYPE.size.xs }}>
          {ar
            ? 'مسارات من عمّان إلى العقبة وإربد والبحر الميت والبتراء ووادي رم والزرقاء'
            : 'Routes from Amman to Aqaba, Irbid, the Dead Sea, Petra, Wadi Rum, and Zarqa'}
        </p>
      </div>
    </div>
  );
}
