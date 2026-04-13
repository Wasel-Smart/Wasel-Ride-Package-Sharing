/**
 * Wasel brand tokens aligned to the glowing network mark.
 *
 * The identity is built around:
 * - luminous teal for primary actions and live signal states
 * - mint and aqua highlights for routes, glows, and focus feedback
 * - deep navy and graphite surfaces for the atmospheric shell
 */

export const C = {
  bg: 'var(--background)',
  bgAlt: 'var(--wasel-surface-1)',
  bgDeep: 'var(--wasel-surface-0)',
  card: 'var(--wasel-panel-soft)',
  cardSolid: 'var(--card)',
  card2: 'var(--wasel-surface-3)',
  panel: 'var(--wasel-panel-muted)',
  elevated: 'var(--wasel-panel-muted-strong)',

  navy: '#050B1A',
  navyMid: '#122235',
  navyLight: '#25394E',

  cyan: '#19E7BB',
  cyanDark: '#0FA588',
  cyanDim: 'rgba(25,231,187,0.16)',
  cyanGlow: 'rgba(25,231,187,0.24)',
  blue: '#65E1FF',
  blueLight: '#D8FBFF',
  blueDim: 'rgba(101,225,255,0.18)',
  gold: '#48CFFF',
  goldDim: 'rgba(72,207,255,0.18)',
  green: '#A2FFE7',
  greenDim: 'rgba(162,255,231,0.18)',
  purple: '#96B7C6',
  purpleDim: 'rgba(150,183,198,0.16)',
  orange: '#0BC3A0',
  orangeDim: 'rgba(11,195,160,0.16)',

  text: 'var(--wasel-copy-primary)',
  textSub: 'var(--wasel-copy-muted)',
  textMuted: 'var(--wasel-copy-muted)',
  textDim: 'var(--wasel-copy-soft)',

  border: 'var(--border)',
  borderHov: 'rgba(var(--wasel-border-rgb), 0.34)',
  borderFaint: 'rgba(var(--wasel-border-rgb), 0.10)',

  error: '#FF646A',
  errorDim: 'rgba(255,100,106,0.12)',
  warning: '#8CF7E4',
  success: '#19E7BB',
  info: '#65E1FF',

  overlay: 'var(--wasel-overlay)',
  glass: 'var(--wasel-glass-xl)',
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
  cyan: '0 18px 50px rgba(25,231,187,0.2)',
  cyanL: '0 24px 64px rgba(25,231,187,0.28)',
  blue: '0 18px 50px rgba(101,225,255,0.2)',
  green: '0 18px 50px rgba(162,255,231,0.18)',
  gold: '0 18px 50px rgba(72,207,255,0.22)',
  inner: 'inset 0 1px 0 rgba(255,255,255,0.05)',
} as const;

export const GRAD = 'linear-gradient(135deg, #D9FFF8 0%, #1AE7BB 44%, #0C9F85 100%)';
export const GRAD_GOLD = 'linear-gradient(135deg, #48CFFF 0%, #A2FFE7 100%)';
export const GRAD_GREEN = 'linear-gradient(135deg, #19E7BB 0%, #A2FFE7 100%)';
export const GRAD_NAVY = 'linear-gradient(135deg, #050B1A 0%, #25394E 100%)';
export const GRAD_PURPLE = 'linear-gradient(135deg, #2DBFDF 0%, #D8FBFF 100%)';
export const GRAD_HERO = 'linear-gradient(160deg, #040917 0%, #0A1225 40%, #1B2942 68%, #65717A 100%)';
export const GRAD_SIGNAL = 'linear-gradient(135deg, #65E1FF 0%, #1AE7BB 44%, #0BC3A0 100%)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, rgba(101,225,255,0.24), rgba(25,231,187,0.18) 44%, rgba(4,18,30,0) 74%)';

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
  return `0 0 0 3px ${color}2E`;
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
    background: `${color}16`,
    border: `1px solid ${color}30`,
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
