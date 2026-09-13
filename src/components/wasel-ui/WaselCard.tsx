/**
 * WaselCard - design-system surface container.
 * Hover lift is CSS-class driven — no e.currentTarget.style mutations.
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { C, F, R, SH } from '../../utils/wasel-ds';

const CARD_STYLE_ID = 'wasel-card-css';
if (typeof document !== 'undefined' && !document.getElementById(CARD_STYLE_ID)) {
  const el = document.createElement('style');
  el.id = CARD_STYLE_ID;
  el.textContent = `
    .wcard-hover {
      transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 250ms ease,
                  border-color 250ms ease;
    }
    .wcard-hover:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 32px rgba(8,29,57,0.32);
      border-color: rgba(20,127,228,0.28) !important;
    }
    .wcard-hover:active {
      transform: translateY(-1px) scale(0.99);
    }
  `;
  document.head.appendChild(el);
}

type CardVariant = 'default' | 'solid' | 'brand' | 'elevated';

interface WaselCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: string;
  radius?: string;
  hover?: boolean;
  dir?: 'ltr' | 'rtl';
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
    boxShadow: SH.blue,
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
  className,
  ...rest
}: WaselCardProps) {
  const base: CSSProperties = {
    position: 'relative',
    borderRadius: radius,
    padding,
    fontFamily: F,
    ...variantMap[variant],
    ...style,
  };

  return (
    <div
      {...rest}
      className={`${hover ? 'wcard-hover' : ''}${className ? ` ${className}` : ''}`}
      style={base}
    >
      {children}
    </div>
  );
}
