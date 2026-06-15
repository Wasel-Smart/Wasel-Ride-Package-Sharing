/**
 * WaselBadge - compact status indicator.
 */

import { Brain, Radio, Zap } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { C, F, R, TYPE } from '../../utils/wasel-ds';

type BadgeVariant = 'live' | 'ai' | 'new' | 'hot' | 'custom';

interface WaselBadgeProps {
  variant?: BadgeVariant;
  label?: string;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const iconSize = 12;

const variants: Record<
  BadgeVariant,
  {
    background: string;
    color: string;
    borderColor: string;
    dotColor?: string;
    defaultIcon?: ReactNode;
    defaultLabel: string;
  }
> = {
  live: {
    background: C.greenDim,
    color: C.green,
    borderColor: C.greenDim,
    dotColor: C.green,
    defaultIcon: <Radio size={iconSize} />,
    defaultLabel: 'LIVE DATA',
  },
  ai: {
    background: C.cyanDim,
    color: C.cyan,
    borderColor: C.cyanDim,
    defaultIcon: <Brain size={iconSize} />,
    defaultLabel: 'AI POWERED',
  },
  new: {
    background: C.goldDim,
    color: C.gold,
    borderColor: C.goldDim,
    dotColor: C.gold,
    defaultLabel: 'NEW',
  },
  hot: {
    background: C.errorDim,
    color: C.error,
    borderColor: C.errorDim,
    defaultIcon: <Zap size={iconSize} />,
    defaultLabel: 'HOT',
  },
  custom: {
    background: C.elevated,
    color: C.textMuted,
    borderColor: C.border,
    defaultLabel: '',
  },
};

export function WaselBadge({ variant = 'live', label, icon, className, style }: WaselBadgeProps) {
  const v = variants[variant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: R.full,
        fontSize: TYPE.size.xs,
        fontWeight: TYPE.weight.bold,
        fontFamily: F,
        lineHeight: 1,
        letterSpacing: TYPE.letterSpacing.wider,
        textTransform: 'uppercase',
        background: v.background,
        color: v.color,
        border: `1px solid ${v.borderColor}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {v.dotColor && (
        <span
          aria-hidden="true"
          className="live-dot"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: R.full,
            background: v.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      {icon || v.defaultIcon}
      {label || v.defaultLabel}
    </span>
  );
}
