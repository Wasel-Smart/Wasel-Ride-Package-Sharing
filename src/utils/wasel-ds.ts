import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BRAND } from '../design-system/brand';

export const C = {
  bg: 'var(--ds-page)',
  bgAlt: 'var(--ds-page-muted)',
  bgDeep: 'var(--ds-page)',
  card: 'var(--ds-surface)',
  cardSolid: 'var(--ds-surface)',
  card2: 'var(--ds-surface-raised)',
  panel: 'var(--ds-surface-soft)',
  elevated: 'var(--ds-surface-raised)',

  navy: 'var(--ds-page)',
  navyMid: 'var(--ds-page-muted)',
  navyLight: 'var(--ds-surface-raised)',

  cyan: 'var(--ds-accent)',
  cyanDark: 'var(--wasel-brand-hover)',
  cyanDim: 'color-mix(in srgb, var(--ds-accent) 12%, transparent)',
  cyanGlow: 'color-mix(in srgb, var(--ds-accent-strong) 18%, transparent)',
  blue: 'var(--ds-accent-strong)',
  blueLight: 'color-mix(in srgb, var(--ds-accent-strong) 14%, transparent)',
  blueDim: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
  gold: 'var(--ds-accent-strong)',
  goldDim: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
  green: 'var(--ds-accent-strong)',
  greenDim: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
  purple: 'var(--wasel-brand-hover)',
  purpleDim: 'color-mix(in srgb, var(--wasel-brand-hover) 10%, transparent)',
  orange: 'var(--ds-accent)',
  orangeDim: 'color-mix(in srgb, var(--ds-accent) 10%, transparent)',

  text: 'var(--ds-text)',
  textSub: 'var(--ds-text-muted)',
  textMuted: 'var(--ds-text-soft)',
  textDim: 'var(--ds-text-soft)',

  border: 'var(--ds-border)',
  borderHov: 'var(--ds-border-strong)',
  borderFaint: 'color-mix(in srgb, var(--ds-border) 72%, transparent)',

  error: 'var(--wasel-brand-hover)',
  errorDim: 'color-mix(in srgb, var(--wasel-brand-hover) 10%, transparent)',
  warning: 'var(--ds-accent)',
  success: 'var(--ds-accent-strong)',
  info: 'var(--ds-accent-strong)',

  overlay: 'var(--ds-surface-overlay)',
  glass: 'var(--ds-surface)',
} as const;

export const F = "var(--wasel-font-sans, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";
export const FA = "var(--wasel-font-arabic, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";
export const FM = "'JetBrains Mono', 'Fira Mono', monospace";

export const TYPE = {
  size: {
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '0.9375rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.32rem',
    '2xl': '1.625rem',
    '3xl': '2rem',
    '4xl': '2.5rem',
    '5xl': '3.25rem',
  },
  weight: {
    regular: 500,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 700,
    ultra: 800,
  },
  lineHeight: {
    tight: 1.05,
    snug: 1.24,
    normal: 1.62,
    relaxed: 1.72,
    loose: 1.84,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.03em',
    normal: '0',
    wide: '0.08em',
    wider: '0.12em',
    widest: '0.18em',
  },
} as const;

export const SPACE = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '32px',
  8: '40px',
  9: '48px',
  10: '64px',
  12: '64px',
  14: '64px',
  16: '64px',
  20: '64px',
  24: '64px',
} as const;

export const R = {
  none: '0px',
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '22px',
  xxl: '28px',
  '3xl': '34px',
  full: '9999px',
} as const;

export const SH = {
  none: 'none',
  xs: 'var(--wasel-shadow-xs)',
  sm: 'var(--wasel-shadow-xs)',
  card: 'var(--wasel-shadow-md)',
  md: 'var(--wasel-shadow-md)',
  lg: 'var(--wasel-shadow-lg)',
  xl: 'var(--wasel-shadow-xl)',
  navy: 'var(--wasel-shadow-lg)',
  cyan: '0 18px 44px color-mix(in srgb, var(--ds-accent-strong) 18%, transparent)',
  cyanL: '0 22px 52px color-mix(in srgb, var(--ds-accent) 22%, transparent)',
  blue: '0 18px 44px color-mix(in srgb, var(--ds-accent) 16%, transparent)',
  green: '0 18px 44px color-mix(in srgb, var(--ds-accent-strong) 18%, transparent)',
  gold: '0 18px 44px color-mix(in srgb, var(--ds-accent-strong) 22%, transparent)',
  inner: 'inset 0 1px 0 rgb(255 255 255 / 0.05)',
} as const;

export const GRAD = 'var(--ds-accent)';
export const GRAD_GOLD = 'var(--ds-accent-strong)';
export const GRAD_GREEN = 'var(--ds-accent-strong)';
export const GRAD_NAVY =
  'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted) 88%, var(--ds-accent-soft) 12%) 0%, color-mix(in srgb, var(--ds-page) 92%, var(--ds-accent-soft) 8%) 54%, var(--ds-page) 100%)';
export const GRAD_PURPLE = 'var(--wasel-brand-hover)';
export const GRAD_HERO =
  'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted) 88%, var(--ds-accent-soft) 12%) 0%, color-mix(in srgb, var(--ds-surface) 92%, var(--ds-accent-soft) 8%) 54%, var(--ds-page) 100%)';
export const GRAD_SIGNAL = 'var(--theme-gradient-primary)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, color-mix(in srgb, var(--ds-accent) 16%, transparent), color-mix(in srgb, var(--ds-accent-strong) 10%, transparent) 44%, transparent 74%)';

export const ANIM = {
  dur: {
    fast: '120ms',
    normal: '180ms',
    slow: '260ms',
    slower: '420ms',
    page: '540ms',
  },
  ease: {
    default: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
    spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decel: 'cubic-bezier(0, 0, 0.2, 1)',
  },
} as const;

export const BREAK = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 900,
  xl: 1024,
  '2xl': 1280,
  '3xl': 1536,
} as const;

export const Z = {
  base: 0,
  raised: 10,
  sticky: 100,
  overlay: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
} as const;

export function card({
  padding = '20px',
  radius = R.xl,
}: {
  padding?: string;
  radius?: string;
} = {}): Record<string, string | number> {
  return {
    background: 'var(--wasel-panel-strong)',
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: 'var(--wasel-shadow-md)',
    backdropFilter: 'blur(18px)',
  };
}

export function solidCard({
  padding = '20px',
  radius = R.xl,
}: {
  padding?: string;
  radius?: string;
} = {}): Record<string, string | number> {
  return {
    background: 'var(--card)',
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: 'var(--wasel-shadow-md)',
  };
}

export function focusRing(color = C.cyan): string {
  return `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)`;
}

export function statusColor(status: 'success' | 'warning' | 'error' | 'info' | 'neutral'): string {
  return {
    success: C.success,
    warning: C.warning,
    error: C.error,
    info: C.cyan,
    neutral: C.textMuted,
  }[status];
}

export function pillStyle(color: string): Record<string, string> {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: R.full,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
    fontSize: TYPE.size.xs,
    fontWeight: String(TYPE.weight.bold),
    color,
  };
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const GLOBAL_STYLES = `
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.92); }
}
@keyframes pulse-glow {
  0%,100% { box-shadow: ${BRAND.shadows.brandGlowDark}; }
  50% { box-shadow: 0 0 24px rgba(245,176,65,0.22), 0 0 36px rgba(230,126,34,0.12); }
}
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes float {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes orb-drift {
  0%,100% { transform: translate(0, 0); }
  50% { transform: translate(24px, -16px); }
}
`;
