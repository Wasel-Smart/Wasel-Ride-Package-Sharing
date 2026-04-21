/**
 * WaselCard — unified design system
 * Single card design with optional variants
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

interface WaselCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated';
  padding?: string;
  hover?: boolean;
  children: ReactNode;
}

const variantStyles: Record<string, CSSProperties> = {
  default: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
  },
  elevated: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
  },
};

export function WaselCard({
  variant = 'default',
  padding = '16px',
  hover = false,
  children,
  style,
  ...rest
}: WaselCardProps) {
  const baseStyle: CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    padding,
    transition: hover ? 'transform 150ms ease, border-color 150ms ease' : undefined,
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div
      {...rest}
      style={baseStyle}
      onMouseEnter={e => {
        if (hover) {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)';
        }
      }}
      onMouseLeave={e => {
        if (hover) {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        }
      }}
    >
      {children}
    </div>
  );
}
