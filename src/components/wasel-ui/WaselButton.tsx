/**
 * WaselButton — primary interactive element.
 *
 * Variants:
 *  - primary  : Electric Cyan gradient CTA
 *  - outline  : Transparent with cyan border
 *  - ghost    : No border, subtle hover
 *  - gold     : Solar Gold gradient (accent / demo)
 *  - danger   : Error red
 *
 * Always pulls from design-system tokens — zero hardcoded hex.
 */

import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { C, R, SH, F, TYPE } from '../../utils/wasel-ds';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface WaselButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  fullWidth?: boolean;
  icon?:     ReactNode;
  iconEnd?:  ReactNode;
  children:  ReactNode;
}

const variantStyles: Record<ButtonVariant, { background: string; color: string; border: string; boxShadow: string; hoverShadow: string }> = {
  primary: {
    background:  'linear-gradient(135deg, #47B7E6 0%, #1E5FAE 100%)',
    color:       '#040C18',
    border:      'none',
    boxShadow:   SH.cyan,
    hoverShadow: SH.cyanL,
  },
  outline: {
    background:  'transparent',
    color:       C.cyan,
    border:      `1px solid ${C.border}`,
    boxShadow:   'none',
    hoverShadow: SH.cyan,
  },
  ghost: {
    background:  'transparent',
    color:       C.textSub,
    border:      'none',
    boxShadow:   'none',
    hoverShadow: 'none',
  },
  gold: {
    background:  'linear-gradient(135deg, #A8D614 0%, #6BB515 100%)',
    color:       '#040C18',
    border:      'none',
    boxShadow:   SH.gold,
    hoverShadow: '0 10px 36px rgba(168,214,20,0.45)',
  },
  danger: {
    background:  C.errorDim,
    color:       C.error,
    border:      `1px solid ${C.error}28`,
    boxShadow:   'none',
    hoverShadow: '0 4px 20px rgba(255,68,85,0.25)',
  },
};

const sizeStyles: Record<ButtonSize, { height: string; padding: string; fontSize: string; borderRadius: string }> = {
  sm: { height: '36px', padding: '0 14px', fontSize: TYPE.size.sm,   borderRadius: R.lg },
  md: { height: '46px', padding: '0 20px', fontSize: TYPE.size.base, borderRadius: R.xl },
  lg: { height: '54px', padding: '0 28px', fontSize: TYPE.size.md,   borderRadius: R.xl },
};

export function WaselButton({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
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
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '8px',
    width:          fullWidth ? '100%' : undefined,
    height:         s.height,
    padding:        s.padding,
    fontSize:       s.fontSize,
    fontWeight:     TYPE.weight.black,
    fontFamily:     F,
    letterSpacing:  '-0.01em',
    borderRadius:   s.borderRadius,
    border:         v.border,
    background:     v.background,
    color:          v.color,
    boxShadow:      v.boxShadow,
    cursor:         isDisabled ? 'not-allowed' : 'pointer',
    opacity:        isDisabled ? 0.6 : 1,
    transition:     'all 160ms cubic-bezier(0.25,0.1,0.25,1)',
    userSelect:     'none',
    WebkitUserSelect:'none',
    outline:        'none',
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          (e.currentTarget as HTMLButtonElement).style.transform    = 'translateY(-1px) scale(1.01)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow    = v.hoverShadow;
          if (variant === 'outline') {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderHov;
            (e.currentTarget as HTMLButtonElement).style.background  = C.cyanDim;
          }
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform   = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow  = v.boxShadow;
        (e.currentTarget as HTMLButtonElement).style.borderColor = '';
        (e.currentTarget as HTMLButtonElement).style.background  = v.background;
        onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
        rest.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = '';
        rest.onMouseUp?.(e);
      }}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} style={{ animation: 'spin 1s linear infinite' }} />
      ) : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
}


