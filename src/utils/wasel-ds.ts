/**
 * Wasel brand tokens aligned to the glowing network mark.
 *
 * The identity is built around:
 * - luminous teal for primary actions and live signal states
 * - mint and aqua highlights for routes, glows, and focus feedback
 * - deep navy and graphite surfaces for the atmospheric shell
 */

export const C = {
  bg: 'var(--bg-primary)',
  bgAlt: 'var(--bg-tertiary)',
  bgDeep: 'var(--bg-primary)',
  card: 'var(--surface-soft)',
  cardSolid: 'var(--card)',
  card2: 'var(--service-card-strong)',
  panel: 'var(--surface-muted)',
  elevated: 'var(--surface-muted-strong)',

  navy: 'var(--wasel-app-hero)',
  navyMid: '#0b2236',
  navyLight: '#18354d',

  cyan: '#65e1ff',
  cyanDark: '#19e7bb',
  cyanDim: 'rgba(101,225,255,0.16)',
  cyanGlow: 'rgba(101,225,255,0.24)',
  blue: '#9de8ff',
  blueLight: '#d8fbff',
  blueDim: 'rgba(157,232,255,0.18)',
  gold: '#d8fbff',
  goldDim: 'rgba(216,251,255,0.18)',
  green: '#19e7bb',
  greenDim: 'rgba(25,231,187,0.18)',
  purple: '#b4d7e8',
  purpleDim: 'rgba(180,215,232,0.16)',
  orange: '#ff9d6c',
  orangeDim: 'rgba(255,157,108,0.16)',

  text: 'var(--wasel-copy-primary)',
  textSub: 'var(--wasel-copy-muted)',
  textMuted: 'var(--wasel-copy-muted)',
  textDim: 'var(--wasel-copy-soft)',

  border: 'var(--border)',
  borderHov: 'var(--border-strong)',
  borderFaint: 'var(--surface-divider)',

  error: '#FF646A',
  errorDim: 'rgba(255,100,106,0.12)',
  warning: '#8CF7E4',
  success: '#19E7BB',
  info: '#65E1FF',

  overlay: 'var(--bg-overlay)',
  glass: 'var(--surface-glass)',
} as const;

export const F = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
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
  cyan: '0 18px 50px rgba(101,225,255,0.2)',
  cyanL: '0 24px 64px rgba(101,225,255,0.28)',
  blue: '0 18px 50px rgba(157,232,255,0.2)',
  green: '0 18px 50px rgba(25,231,187,0.18)',
  gold: '0 18px 50px rgba(216,251,255,0.22)',
  inner: 'inset 0 1px 0 rgb(255 255 255 / 0.05)',
} as const;

export const GRAD = 'var(--wasel-app-button-primary)';
export const GRAD_GOLD = 'var(--theme-gradient-primary)';
export const GRAD_GREEN = 'var(--theme-gradient-accent)';
export const GRAD_NAVY = 'var(--wasel-service-head-bg)';
export const GRAD_PURPLE = 'var(--theme-gradient-primary)';
export const GRAD_HERO = 'var(--wasel-service-head-bg)';
export const GRAD_SIGNAL = 'var(--wasel-app-button-primary)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, rgba(101,225,255,0.24), rgba(25,231,187,0.16) 44%, rgba(4,18,30,0) 74%)';

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
  0%,100% { box-shadow: 0 0 18px rgba(25,231,187,0.18); }
  50% { box-shadow: 0 0 28px rgba(25,231,187,0.26), 0 0 36px rgba(162,255,231,0.16); }
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
