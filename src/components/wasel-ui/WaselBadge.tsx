/**
 * WaselBadge — unified design system
 */

import type { ReactNode } from 'react';

interface WaselBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'live';
  label: string;
  icon?: ReactNode;
}

const variantStyles = {
  default: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  success: { bg: 'rgba(34,197,94,0.15)', color: 'var(--success)' },
  warning: { bg: 'rgba(245,158,11,0.15)', color: 'var(--warning)' },
  error: { bg: 'rgba(239,68,68,0.15)', color: 'var(--error)' },
  live: { bg: 'rgba(34,197,94,0.15)', color: 'var(--success)' },
};

export function WaselBadge({ variant = 'default', label, icon }: WaselBadgeProps) {
  const style = variantStyles[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        background: style.bg,
        color: style.color,
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
