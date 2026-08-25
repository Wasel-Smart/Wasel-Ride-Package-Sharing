import React from 'react';

type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

const BASE_CLASSES = 'bg-white/5';

const ANIMATION_CLASSES = {
  pulse: 'animate-pulse',
  wave: 'animate-shimmer',
  none: '',
};

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: 'rounded-sm',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-lg',
};

export function Skeleton({
  variant = 'rounded',
  width,
  height,
  className = '',
  animation = 'pulse',
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'text' ? 16 : 120),
    ...(width === undefined && variant === 'text' ? { maxWidth: '100%' } : {}),
  };

  return (
    <div
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${ANIMATION_CLASSES[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-white/8 bg-white/[0.03] p-5 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={14} width="40%" />
          <Skeleton variant="text" height={12} width="25%" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton variant="text" height={12} />
        <Skeleton variant="text" height={12} width="80%" />
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={18} width="30%" />
          <Skeleton variant="text" height={12} width="50%" />
        </div>
      </div>
      <SkeletonText lines={4} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}
