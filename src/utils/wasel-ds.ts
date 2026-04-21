import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Shared Wasel helper tokens aligned to the active landing-page palette.
 *
 * Decorative colors should mirror the current orange/beige Wasel identity,
 * while semantic state colors still come from the design-system theme.
 */

export const C = {
  bg: 'var(--ds-page, #0f1113)',
  bgAlt: 'var(--ds-page-muted, #15181c)',
  bgDeep: 'var(--ds-page, #0f1113)',
  card: 'var(--ds-surface, #1a1d22)',
  cardSolid: 'var(--ds-surface, #1a1d22)',
  card2: 'var(--ds-surface-raised, #20242a)',
  panel: 'var(--ds-surface-soft, #262b32)',
  elevated: 'var(--ds-surface-raised, #20242a)',

  navy: '#0f1113',
  navyMid: '#15181c',
  navyLight: '#20242a',

  cyan: 'var(--ds-accent, #f59a2c)',
  cyanDark: 'var(--ds-accent, #f59a2c)',
  cyanDim: 'color-mix(in srgb, var(--ds-accent, #f59a2c) 12%, transparent)',
  cyanGlow: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 18%, transparent)',
  blue: 'var(--ds-accent-strong, #ffb357)',
  blueLight: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 12%, transparent)',
  blueDim: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 10%, transparent)',
  gold: 'var(--ds-warning, #efb45d)',
  goldDim: 'color-mix(in srgb, var(--ds-warning, #efb45d) 10%, transparent)',
  green: 'var(--ds-success, #79c67d)',
  greenDim: 'color-mix(in srgb, var(--ds-success, #79c67d) 10%, transparent)',
  purple: 'var(--ds-info, #6bb9df)',
  purpleDim: 'color-mix(in srgb, var(--ds-info, #6bb9df) 10%, transparent)',
  orange: 'var(--ds-accent, #f59a2c)',
  orangeDim: 'color-mix(in srgb, var(--ds-accent, #f59a2c) 10%, transparent)',

  text: 'var(--ds-text, #f5efe7)',
  textSub: 'var(--ds-text-muted, #b9aea0)',
  textMuted: 'var(--ds-text-soft, #8b8277)',
  textDim: 'var(--ds-text-soft, #8b8277)',

  border: 'var(--ds-border, #313841)',
  borderHov: 'var(--ds-border-strong, #45505c)',
  borderFaint: 'color-mix(in srgb, var(--ds-border, #313841) 72%, transparent)',

  error: 'var(--ds-danger, #ee705d)',
  errorDim: 'color-mix(in srgb, var(--ds-danger, #ee705d) 10%, transparent)',
  warning: 'var(--ds-warning, #efb45d)',
  success: 'var(--ds-success, #79c67d)',
  info: 'var(--ds-info, #6bb9df)',

  overlay: 'var(--ds-surface-overlay, rgb(15 17 19 / 0.8))',
  glass: 'var(--ds-surface, #1a1d22)',
} as const;

export const F = "var(--wasel-font-sans, 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif)";
export const FA = "var(--wasel-font-arabic, 'Cairo', 'Tajawal', sans-serif)";
export const FM = "'JetBrains Mono', 'Fira Mono', monospace";

export const TYPE = {
  size: {
    xs: '0.66rem',
    sm: '0.76rem',
    base: '0.92rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.32rem',
    '2xl': '1.6rem',
    '3xl': '2rem',
    '4xl': '2.5rem',
    '5xl': '3.25rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800,
    ultra: 900,
  },
  lineHeight: {
    tight: 1.08,
    snug: 1.24,
    normal: 1.5,
    relaxed: 1.68,
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
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
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
  xs: 'var(--wasel-shadow-sm)',
  sm: 'var(--wasel-shadow-sm)',
  card: 'var(--wasel-shadow-md)',
  md: 'var(--wasel-shadow-lg)',
  lg: 'var(--wasel-shadow-xl)',
  xl: 'var(--wasel-shadow-xl)',
  navy: 'var(--wasel-shadow-md)',
  cyan: '0 18px 50px rgb(var(--accent-secondary-rgb) / 0.20)',
  cyanL: '0 24px 64px rgb(var(--accent-secondary-rgb) / 0.28)',
  blue: '0 18px 50px rgb(var(--accent-secondary-rgb) / 0.16)',
  green: '0 18px 50px rgb(var(--success-rgb) / 0.18)',
  gold: '0 18px 50px rgb(var(--warning-rgb) / 0.22)',
  inner: 'inset 0 1px 0 rgb(255 255 255 / 0.05)',
} as const;

export const GRAD = 'var(--ds-accent, #f59a2c)';
export const GRAD_GOLD = 'var(--ds-warning, #efb45d)';
export const GRAD_GREEN = 'var(--ds-success, #79c67d)';
export const GRAD_NAVY =
  'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, color-mix(in srgb, var(--ds-page, #0f1113) 92%, var(--ds-accent-soft, #3f2a15) 8%) 54%, var(--ds-page, #0f1113) 100%)';
export const GRAD_PURPLE = 'var(--ds-info, #6bb9df)';
export const GRAD_HERO =
  'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, color-mix(in srgb, var(--ds-surface, #1a1d22) 92%, var(--ds-accent-soft, #3f2a15) 8%) 54%, var(--ds-page, #0f1113) 100%)';
export const GRAD_SIGNAL =
  'linear-gradient(135deg, var(--ds-accent-strong, #ffb357) 0%, var(--ds-accent, #f59a2c) 100%)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, color-mix(in srgb, var(--ds-accent, #f59a2c) 16%, transparent), color-mix(in srgb, var(--ds-accent-strong, #ffb357) 10%, transparent) 44%, transparent 74%)';

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
    success: C.green,
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
  0%,100% { box-shadow: 0 0 18px rgba(245,154,44,0.18); }
  50% { box-shadow: 0 0 28px rgba(245,154,44,0.26), 0 0 36px rgba(255,179,87,0.16); }
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
