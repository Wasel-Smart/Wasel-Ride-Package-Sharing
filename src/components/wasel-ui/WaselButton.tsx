/**
 * WaselButton - primary interactive element.
 * Hover/active states are driven by CSS classes injected once into the document,
 * eliminating the fragile e.currentTarget.style mutation pattern.
 */

import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { C, F, GRAD, GRAD_GOLD, R, SH, TYPE } from '../../utils/wasel-ds';

const STYLE_ID = 'wasel-btn-css';
const BTN_CSS = `
  .wbtn { position: relative; overflow: hidden; transition: transform 160ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, opacity 160ms ease; }
  .wbtn::after { content:''; position:absolute; inset:0; background:linear-gradient(to right, transparent 0%, rgba(255,255,255,0.13) 50%, transparent 100%); transform:translateX(-110%); transition:transform 0.55s ease; pointer-events:none; border-radius:inherit; }
  .wbtn:not(:disabled):hover::after { transform:translateX(110%); }
  .wbtn:not(:disabled):hover { transform: translateY(-2px) scale(1.015); }
  .wbtn:not(:disabled):active { transform: scale(0.97) !important; }
  .wbtn[data-variant='primary']:not(:disabled):hover { box-shadow: 0 14px 36px rgba(0,229,255,0.38), 0 1px 0 rgba(255,255,255,0.18) inset; }
  .wbtn[data-variant='outline']:not(:disabled):hover { background: rgba(0,229,255,0.1) !important; border-color: rgba(0,229,255,0.5) !important; box-shadow: 0 0 22px rgba(0,229,255,0.16); }
  .wbtn[data-variant='ghost']:not(:disabled):hover { background: rgba(255,255,255,0.07) !important; color: #F8FBFF !important; }
  .wbtn[data-variant='gold']:not(:disabled):hover { box-shadow: 0 14px 36px rgba(255,138,11,0.38); }
  .wbtn[data-variant='danger']:not(:disabled):hover { background: rgba(255,124,139,0.22) !important; }
  @keyframes wbtn-spin { to { transform: rotate(360deg); } }
  .wbtn-spinner { animation: wbtn-spin 0.9s linear infinite; }
`;

if ( typeof document !== 'undefined' && !document.getElementById( STYLE_ID ) ) {
  const el = document.createElement( 'style' );
  el.id = STYLE_ID;
  el.textContent = BTN_CSS;
  document.head.appendChild( el );
}

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface WaselButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  dir?: 'ltr' | 'rtl';
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
    boxShadow: SH.blue,
    hoverShadow: SH.blueL,
  },
  outline: {
    background: 'transparent',
    color: C.cyan,
    border: `1px solid ${ C.border }`,
    boxShadow: 'none',
    hoverShadow: SH.blue,
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
    boxShadow: SH.orange,
    hoverShadow: SH.orange,
  },
  danger: {
    background: C.errorDim,
    color: C.error,
    border: `1px solid ${ C.errorDim }`,
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

export function WaselButton ( {
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconEnd,
  dir = 'ltr',
  children,
  disabled,
  style,
  className,
  ...rest
}: WaselButtonProps ) {
  const v = variantStyles[ variant ];
  const s = sizeStyles[ size ];
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
    userSelect: 'none',
    WebkitUserSelect: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    minWidth: 0,
    ...style,
  };

  return (
    <button
      { ...rest }
      dir={ dir }
      disabled={ isDisabled }
      data-variant={ variant }
      className={ `wbtn${ className ? ` ${ className }` : '' }` }
      style={ baseStyle }
    >
      { loading ? (
        <Loader2 size={ size === 'sm' ? 14 : 16 } className="wbtn-spinner" />
      ) : (
        icon
      ) }
      <span style={ { overflow: 'hidden', textOverflow: 'ellipsis' } }>{ children }</span>
      { !loading && iconEnd }
    </button>
  );
}
