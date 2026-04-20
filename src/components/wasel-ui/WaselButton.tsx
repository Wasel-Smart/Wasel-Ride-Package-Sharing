/**
 * WaselButton — primary interactive element.
 *
 * Variants:
 *  - primary  : Network teal gradient CTA
 *  - outline  : Transparent with brand border
 *  - ghost    : No border, subtle hover
 *  - gold     : Aqua accent gradient
 *  - danger   : Error red
 *
 * Always pulls from design-system tokens — zero hardcoded hex.
 */

import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { C, R, F, TYPE } from '../../utils/wasel-ds';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_PRIMARY = 'var(--wasel-app-button-primary)';
const BUTTON_PRIMARY_FOREGROUND = 'var(--wasel-button-primary-foreground)';
const BUTTON_PRIMARY_SHADOW = 'var(--wasel-button-primary-shadow)';
const BUTTON_PRIMARY_HOVER = 'var(--wasel-button-primary-shadow-hover)';
const BUTTON_OUTLINE_BG = 'var(--wasel-button-primary-soft)';
const BUTTON_OUTLINE_BG_HOVER = 'var(--wasel-button-primary-soft-strong)';
const BUTTON_OUTLINE_BORDER = 'var(--wasel-button-primary-border)';
const BUTTON_OUTLINE_BORDER_HOVER = 'var(--wasel-button-primary-border-strong)';
const BUTTON_OUTLINE_TEXT = 'var(--wasel-button-primary)';

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
    background: BUTTON_PRIMARY,
    color: BUTTON_PRIMARY_FOREGROUND,
    border: '1px solid rgb(255 255 255 / 0.10)',
    boxShadow: BUTTON_PRIMARY_SHADOW,
    hoverShadow: BUTTON_PRIMARY_HOVER,
  },
  outline: {
    background: BUTTON_OUTLINE_BG,
    color: BUTTON_OUTLINE_TEXT,
    border: `1px solid ${BUTTON_OUTLINE_BORDER}`,
    boxShadow: 'none',
    hoverShadow: 'var(--wasel-shadow-sm)',
  },
  ghost: {
    background: 'transparent',
    color: C.textSub,
    border: 'none',
    boxShadow: 'none',
    hoverShadow: 'none',
  },
  gold: {
    background: BUTTON_PRIMARY,
    color: BUTTON_PRIMARY_FOREGROUND,
    border: `1px solid ${BUTTON_OUTLINE_BORDER}`,
    boxShadow: BUTTON_PRIMARY_SHADOW,
    hoverShadow: BUTTON_PRIMARY_HOVER,
  },
  danger: {
    background: C.errorDim,
    color: 'var(--danger)',
    border: `1px solid ${C.error}28`,
    boxShadow: 'none',
    hoverShadow: '0 4px 20px rgb(var(--danger-rgb) / 0.25)',
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

  const baseStyle: React.CSSProperties = {
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
    letterSpacing: '-0.01em',
    borderRadius: s.borderRadius,
    border: v.border,
    background: v.background,
    color: v.color,
    boxShadow: v.boxShadow,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'all 160ms cubic-bezier(0.25,0.1,0.25,1)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // Note: focus-visible outline is handled by globals.css :focus-visible rule
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={e => {
        if (!isDisabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) scale(1.01)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = v.hoverShadow;
          if (variant === 'outline') {
            (e.currentTarget as HTMLButtonElement).style.borderColor = BUTTON_OUTLINE_BORDER_HOVER;
            (e.currentTarget as HTMLButtonElement).style.background = BUTTON_OUTLINE_BG_HOVER;
          }
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = v.boxShadow;
        (e.currentTarget as HTMLButtonElement).style.borderColor = '';
        (e.currentTarget as HTMLButtonElement).style.background = v.background;
        onMouseLeave?.(e);
      }}
      onMouseDown={e => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
        rest.onMouseDown?.(e);
      }}
      onMouseUp={e => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = '';
        rest.onMouseUp?.(e);
      }}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        icon
      )}
      {children}
      {!loading && iconEnd}
    </button>
  );
}
