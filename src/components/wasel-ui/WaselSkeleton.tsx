/**
 * WaselSkeleton — loading placeholder shimmer component.
 * Used while data fetches to prevent layout shift.
 */

import type { CSSProperties } from 'react';
import { R } from '../../utils/wasel-ds';

interface WaselSkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  style?: CSSProperties;
}

const shimmerKeyframes = `
@keyframes wasel-shimmer {
  0%   { background-position: -800px 0; }
  100% { background-position: 800px 0; }
}
`;

let injected = false;
function injectShimmer() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const existing = document.getElementById('wasel-shimmer-keyframes');
  if (existing) return;
  const style = document.createElement('style');
  style.id = 'wasel-shimmer-keyframes';
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}

export function WaselSkeleton({
  width = '100%',
  height = '16px',
  radius = R.md,
  style,
}: WaselSkeletonProps) {
  injectShimmer();

  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, rgba(255,245,222,0.04) 0%, rgba(255,245,222,0.1) 50%, rgba(255,245,222,0.04) 100%)',
        backgroundSize: '800px 100%',
        animation: 'wasel-shimmer 1.5s linear infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** Convenience: card-shaped skeleton with title + 3 text lines */
export function WaselSkeletonCard({ padding = '20px' }: { padding?: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: R.xxl,
        padding,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <WaselSkeleton height="20px" width="55%" radius={R.sm} />
      <WaselSkeleton height="13px" width="90%" radius={R.sm} />
      <WaselSkeleton height="13px" width="75%" radius={R.sm} />
      <WaselSkeleton height="13px" width="60%" radius={R.sm} />
    </div>
  );
}
