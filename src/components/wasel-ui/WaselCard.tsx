/**
 * WaselCard - design-system surface container.
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { ANIM, C, F, R, SH } from '../../utils/wasel-ds';

type CardVariant = 'default' | 'solid' | 'brand' | 'elevated';

interface WaselCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: string;
  radius?: string;
  hover?: boolean;
  children: ReactNode;
}

const variantMap: Record<CardVariant, CSSProperties> = {
  default: {
    background: C.card,
    border: `1px solid ${C.border}`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: SH.card,
  },
  solid: {
    background: C.cardSolid,
    border: `1px solid ${C.border}`,
    boxShadow: SH.card,
  },
  brand: {
    background: `linear-gradient(135deg, ${C.cyanDim} 0%, ${C.greenDim} 100%)`,
    border: `1px solid ${C.borderHov}`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: SH.cyan,
  },
  elevated: {
    background: C.elevated,
    border: `1px solid ${C.borderFaint}`,
    boxShadow: SH.sm,
  },
};

export function WaselCard({
  variant = 'solid',
  padding = '20px',
  radius = R.xxl,
  hover = false,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: WaselCardProps) {
  const base: CSSProperties = {
    position: 'relative',
    borderRadius: radius,
    padding,
    fontFamily: F,
    transition: hover
      ? `transform ${ANIM.dur.slow} ${ANIM.ease.spring}, box-shadow ${ANIM.dur.slow} ${ANIM.ease.default}, border-color ${ANIM.dur.slow} ${ANIM.ease.default}`
      : undefined,
    ...variantMap[variant],
    ...style,
  };

  return (
    <div
      {...rest}
      style={base}
      onMouseEnter={e => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = SH.md;
          e.currentTarget.style.borderColor = C.borderHov;
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        if (hover) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = (variantMap[variant].boxShadow as string) ?? '';
          e.currentTarget.style.borderColor = '';
        }
        onMouseLeave?.(e);
      }}
    >
      {children}
    </div>
  );
}
