/**
 * DeferredLandingMap
 *
 * Loads the interactive Wasel map only after the landing page hero is fully
 * painted and the browser is idle.  This keeps the landing page LCP fast:
 * the heavy Leaflet + tile-fetch work is pushed out of the critical path.
 *
 * Usage:
 *   <DeferredLandingMap height={220} className="landing-page__network-map-interactive" />
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { scheduleDeferredTask } from '../../utils/runtimeScheduling';

/* Lazily import the full WaselMap so it never enters the initial bundle. */
const WaselMap = lazy(() =>
  import('../../components/WaselMap').then((mod) => ({ default: mod.WaselMap })),
);

/* Jordan default center — Amman. */
const AMMAN_CENTER = { lat: 31.9539, lng: 35.9106 };

/* Key corridors shown as a faint route preview on the landing map. */
const CORRIDOR_ROUTE = [
  { lat: 32.5568, lng: 35.8486, label: 'Irbid' },   // Irbid
  { lat: 31.9539, lng: 35.9106, label: 'Amman' },    // Amman
  { lat: 29.5321, lng: 35.006,  label: 'Aqaba' },    // Aqaba
];

interface DeferredLandingMapProps {
  /** CSS height value (number → px, string → verbatim). Defaults to 220. */
  height?: number | string;
  /** Extra class names applied to the outer wrapper. */
  className?: string;
  /**
   * How long (ms) after mount to wait before even loading the map JS.
   * Defaults to 2 400 ms — well after LCP so the map never competes with it.
   */
  deferMs?: number;
}

/**
 * A simple placeholder shown while the map defers / loads.
 * Matches the dark landing palette so there is no layout shift.
 */
function MapPlaceholder({ height, className }: { height: string; className: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        height,
        borderRadius: 16,
        background:
          'radial-gradient(circle at 60% 40%, rgba(242,138,36,0.06), transparent 55%), ' +
          'linear-gradient(180deg, rgba(14,17,21,0.92) 0%, rgba(11,14,18,0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle animated pulse so users know something is loading */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        aria-hidden="true"
        style={{ opacity: 0.28 }}
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="#f28a24"
          strokeWidth="3"
          strokeDasharray="60 66"
          strokeLinecap="round"
          style={{
            animation: 'wasel-map-spin 1.8s linear infinite',
            transformOrigin: '24px 24px',
          }}
        />
      </svg>
      <style>{`@keyframes wasel-map-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function DeferredLandingMap({
  height = 220,
  className = '',
  deferMs = 2_400,
}: DeferredLandingMapProps) {
  const [shouldRender, setShouldRender] = useState(false);

  const cssHeight =
    typeof height === 'number' ? `${height}px` : height;

  useEffect(() => {
    /*
     * scheduleDeferredTask wraps requestIdleCallback (with a setTimeout
     * fallback).  We wait until the browser is idle AND at least `deferMs`
     * have passed so the map never competes with above-the-fold rendering.
     */
    const cancel = scheduleDeferredTask(() => {
      setShouldRender(true);
    }, deferMs);

    return () => {
      cancel();
    };
  }, [deferMs]);

  if (!shouldRender) {
    return <MapPlaceholder height={cssHeight} className={className} />;
  }

  return (
    <Suspense fallback={<MapPlaceholder height={cssHeight} className={className} />}>
      <WaselMap
        center={AMMAN_CENTER}
        height={height}
        className={className}
        route={CORRIDOR_ROUTE}
        showMosques={false}
        showRadars={false}
        compact
      />
    </Suspense>
  );
}
