/**
 * WaselCard — design-system surface container.
 *
 * Variants:
 *  - default  : Glass card (translucent, backdrop blur)
 *  - solid    : Opaque dark card (#0A1628)
 *  - brand    : Cyan-tinted hero/feature card
 *  - elevated : Slightly brighter surface, for nested cards
 *
 * All values from design tokens — zero hardcoded hex.
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { C, R, SH, F } from '../../utils/wasel-ds';

type CardVariant = 'default' | 'solid' | 'brand' | 'elevated';

interface WaselCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?:   CardVariant;
  padding?:   string;
  radius?:    string;
  hover?:     boolean;
  children:   ReactNode;
}

const variantMap: Record<CardVariant, CSSProperties> = {
  default: {
    background:    C.card,
    border:        `1px solid ${C.border}`,
    backdropFilter:'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow:     SH.card,
  },
  solid: {
    background: C.cardSolid,
    border:     `1px solid ${C.border}`,
    boxShadow:  SH.card,
  },
  brand: {
    background:    `linear-gradient(135deg, ${C.cyanDim} 0%, ${C.greenDim} 100%)`,
    border:        `1px solid ${C.borderHov}`,
    backdropFilter:'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow:     SH.cyan,
  },
  elevated: {
    background: C.elevated,
    border:     `1px solid ${C.borderFaint}`,
    boxShadow:  SH.sm,
  },
};

export function WaselCard({
  variant  = 'solid',
  padding  = '20px',
  radius   = R.xxl,
  hover    = false,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: WaselCardProps) {
  const base: CSSProperties = {
    position:     'relative',
    borderRadius: radius,
    padding,
    fontFamily:   F,
    transition:   hover ? 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, border-color 200ms ease' : undefined,
    ...variantMap[variant],
    ...style,
  };

  return (
    <div
      {...rest}
      style={base}
      onMouseEnter={(e) => {
        if (hover) {
          (e.currentTarget as HTMLDivElement).style.transform   = 'translateY(-3px) scale(1.01)';
          (e.currentTarget as HTMLDivElement).style.boxShadow  = SH.md;
          (e.currentTarget as HTMLDivElement).style.borderColor = C.borderHov;
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hover) {
          (e.currentTarget as HTMLDivElement).style.transform   = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow  = variantMap[variant].boxShadow as string ?? '';
          (e.currentTarget as HTMLDivElement).style.borderColor = '';
        }
        onMouseLeave?.(e);
      }}
    >
      {children}
    </div>
  );
}
