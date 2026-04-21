/**
 * WaselButton — unified design system
 * Three variants: primary, secondary, ghost
 */

import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface WaselButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  userSelect: 'none',
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#0B0B0C',
  },
  secondary: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    height: '36px',
    padding: '0 14px',
    fontSize: '13px',
    borderRadius: 'var(--radius-full)',
  },
  md: {
    height: '44px',
    padding: '0 20px',
    fontSize: '14px',
    borderRadius: 'var(--radius-full)',
  },
};

export function WaselButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  style,
  ...rest
}: WaselButtonProps) {
  const isDisabled = disabled || loading;

  const buttonStyle: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    width: fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.5 : 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={buttonStyle}
      onMouseDown={e => {
        if (!isDisabled) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
        }
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}
