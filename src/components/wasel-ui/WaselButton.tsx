/**
 * WaselButton - primary interactive element.
 */

import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { ANIM, C, F, GRAD, GRAD_GOLD, R, SH, TYPE } from '../../utils/wasel-ds';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface WaselButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<
  ButtonVariant,
  { background: string; color: string; border: string; boxShadow: string; hoverShadow: string }
> = {
  primary: {
    background: GRAD,
    color: C.bgDeep,
    border: 'none',
    boxShadow: SH.cyan,
    hoverShadow: SH.cyanL,
  },
  outline: {
    background: 'transparent',
    color: C.cyan,
    border: `1px solid ${C.border}`,
    boxShadow: 'none',
    hoverShadow: SH.cyan,
  },
  ghost: {
    background: 'transparent',
    color: C.textSub,
    border: 'none',
    boxShadow: 'none',
    hoverShadow: 'none',
  },
  gold: {
    background: GRAD_GOLD,
    color: C.bgDeep,
    border: 'none',
    boxShadow: SH.gold,
    hoverShadow: SH.gold,
  },
  danger: {
    background: C.errorDim,
    color: C.error,
    border: `1px solid ${C.errorDim}`,
    boxShadow: 'none',
    hoverShadow: SH.sm,
  },
};

const sizeStyles: Record<
  ButtonSize,
  { height: string; padding: string; fontSize: string; borderRadius: string }
> = {
  sm: { height: '36px', padding: '0 14px', fontSize: TYPE.size.sm, borderRadius: R.lg },
  md: { height: '46px', padding: '0 20px', fontSize: TYPE.size.base, borderRadius: R.xl },
  lg: { height: '54px', padding: '0 28px', fontSize: TYPE.size.md, borderRadius: R.xl },
};

export function WaselButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconEnd,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: WaselButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: fullWidth ? '100%' : undefined,
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    fontWeight: TYPE.weight.black,
    fontFamily: F,
    letterSpacing: TYPE.letterSpacing.normal,
    borderRadius: s.borderRadius,
    border: v.border,
    background: v.background,
    color: v.color,
    boxShadow: v.boxShadow,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: `transform ${ANIM.dur.normal} ${ANIM.ease.default}, box-shadow ${ANIM.dur.normal} ${ANIM.ease.default}, border-color ${ANIM.dur.normal} ${ANIM.ease.default}, background ${ANIM.dur.normal} ${ANIM.ease.default}`,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    minWidth: 0,
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={e => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = v.hoverShadow;
          if (variant === 'outline') {
            e.currentTarget.style.borderColor = C.borderHov;
            e.currentTarget.style.background = C.cyanDim;
          }
          if (variant === 'ghost') {
            e.currentTarget.style.background = C.elevated;
            e.currentTarget.style.color = C.text;
          }
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = v.boxShadow;
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.background = v.background;
        e.currentTarget.style.color = v.color;
        onMouseLeave?.(e);
      }}
      onMouseDown={e => {
        if (!isDisabled) e.currentTarget.style.transform = 'scale(0.98)';
        rest.onMouseDown?.(e);
      }}
      onMouseUp={e => {
        if (!isDisabled) e.currentTarget.style.transform = '';
        rest.onMouseUp?.(e);
      }}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        icon
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
      {!loading && iconEnd}
    </button>
  );
}
