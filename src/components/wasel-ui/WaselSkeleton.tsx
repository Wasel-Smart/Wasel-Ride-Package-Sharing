import type { CSSProperties, HTMLAttributes } from 'react';
import { R } from '../../utils/wasel-ds';

export interface WaselSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'line-sm' | 'line-lg' | 'circle' | 'card' | 'avatar' | 'rect';
  width?: string | number;
  height?: string | number;
  rounded?: keyof typeof R | string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Standardized WaselSkeleton component with brand aurora shimmer
 */
export function WaselSkeleton ( {
  variant = 'line',
  width,
  height,
  rounded,
  className = '',
  style,
  ...rest
}: WaselSkeletonProps ) {
  const variantClass = variant !== 'rect' ? `sk-${ variant }` : '';
  const resolvedBorderRadius = rounded
    ? typeof rounded === 'string' && rounded in R
      ? R[ rounded as keyof typeof R ]
      : rounded
    : undefined;

  return (
    <div
      aria-hidden="true"
      className={ `skeleton-base ${ variantClass } ${ className }`.trim() }
      style={ {
        width,
        height,
        ...( resolvedBorderRadius ? { borderRadius: resolvedBorderRadius } : {} ),
        ...style,
      } }
      { ...rest }
    />
  );
}

