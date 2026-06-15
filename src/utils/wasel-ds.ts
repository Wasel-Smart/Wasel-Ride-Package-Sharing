/**
 * Wasel design system tokens.
 * Unified around midnight navy surfaces with aqua, mint, and sun-amber accents.
 */

export const C = {
  bg: '#06111B',
  bgAlt: '#0A1824',
  bgDeep: '#03080F',
  card: 'rgba(9,22,34,0.78)',
  cardSolid: '#0F2333',
  card2: '#142C3F',
  panel: 'rgba(184,244,255,0.055)',
  elevated: 'rgba(255,255,255,0.055)',

  navy: '#234763',
  navyMid: '#366786',
  navyLight: '#5D8FAF',

  cyan: '#58DDFF',
  cyanDark: '#B9F4FF',
  cyanDim: 'rgba(88,221,255,0.1)',
  cyanGlow: 'rgba(88,221,255,0.2)',
  blue: '#7DE7CB',
  blueLight: '#C9FFF1',
  blueDim: 'rgba(125,231,203,0.12)',
  gold: '#FFBE5C',
  goldDim: 'rgba(255,190,92,0.14)',
  green: '#47D69E',
  greenDim: 'rgba(71,214,158,0.12)',
  purple: '#8FA6FF',
  purpleDim: 'rgba(143,166,255,0.12)',
  orange: '#FF9A74',
  orangeDim: 'rgba(255,154,116,0.12)',

  text: '#F3FAFF',
  textSub: 'rgba(232,244,252,0.86)',
  textMuted: 'rgba(191,214,230,0.72)',
  textDim: 'rgba(150,176,195,0.58)',

  border: 'rgba(156,202,230,0.14)',
  borderHov: 'rgba(88,221,255,0.3)',
  borderFaint: 'rgba(156,202,230,0.075)',

  error: '#FF7C8B',
  errorDim: 'rgba(255,124,139,0.14)',
  warning: '#FFBE5C',
  success: '#47D69E',
  info: '#58DDFF',

  overlay: 'rgba(4,10,18,0.8)',
  glass: 'rgba(7,18,29,0.9)',
} as const;

export const F = "'Plus Jakarta Sans', 'Cairo', 'Tajawal', 'Inter', sans-serif";
export const FA = "'Cairo', 'Tajawal', 'Plus Jakarta Sans', sans-serif";
export const FM = "'JetBrains Mono', 'Fira Mono', monospace";

export const TYPE = {
  size: {
    xs: '0.6875rem',
    sm: '0.8125rem',
    base: '0.9375rem',
    md: '1rem',
    lg: '1.15rem',
    xl: '1.35rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 780,
    ultra: 880,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },
  letterSpacing: {
    tighter: '0',
    tight: '0',
    normal: '0',
    wide: '0',
    wider: '0',
    widest: '0',
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
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  xxl: '16px',
  '3xl': '20px',
  full: '9999px',
} as const;

export const SH = {
  none: 'none',
  xs: '0 1px 2px rgba(0,0,0,0.25)',
  sm: '0 2px 8px rgba(0,0,0,0.24)',
  card: '0 12px 32px rgba(0,0,0,0.28)',
  md: '0 16px 36px rgba(0,0,0,0.3)',
  lg: '0 22px 52px rgba(0,0,0,0.36)',
  xl: '0 32px 72px rgba(0,0,0,0.44)',
  navy: '0 10px 30px rgba(0,0,0,0.26)',
  cyan: '0 5px 18px rgba(88,221,255,0.14)',
  cyanL: '0 12px 30px rgba(88,221,255,0.18)',
  blue: '0 10px 24px rgba(125,231,203,0.16)',
  green: '0 10px 24px rgba(71,214,158,0.18)',
  gold: '0 10px 26px rgba(255,190,92,0.2)',
  inner: 'inset 0 1px 3px rgba(0,0,0,0.3)',
} as const;

export const GRAD = 'linear-gradient(135deg, #74E9FF 0%, #40C8F6 48%, #4CE0AD 100%)';
export const GRAD_GOLD = 'linear-gradient(135deg, #FFD780 0%, #FFB85F 50%, #FF9878 100%)';
export const GRAD_GREEN = 'linear-gradient(135deg, #6BF0C8 0%, #34D8A7 52%, #209B7D 100%)';
export const GRAD_NAVY = 'linear-gradient(145deg, #0B1D2D 0%, #081725 56%, #040B12 100%)';
export const GRAD_PURPLE = 'linear-gradient(135deg, #B7ABFF 0%, #7F91FF 100%)';
export const GRAD_HERO = 'linear-gradient(145deg, #06111B 0%, #0A1824 54%, #10293C 100%)';
export const GRAD_SIGNAL = 'linear-gradient(135deg, #EEF8FF 0%, #8DEBFF 52%, #47D69E 100%)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, rgba(88,221,255,0.22), rgba(255,190,92,0.1) 42%, rgba(6,19,31,0) 74%)';

export const ANIM = {
  dur: {
    fast: '100ms',
    normal: '160ms',
    slow: '250ms',
    slower: '400ms',
    page: '500ms',
  },
  ease: {
    default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
}: { padding?: string; radius?: string } = {}) {
  return {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: SH.card,
    backdropFilter: 'blur(16px)',
  };
}

export function solidCard({
  padding = '20px',
  radius = R.xl,
}: { padding?: string; radius?: string } = {}) {
  return {
    background: C.cardSolid,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: SH.card,
  };
}

export function focusRing(color = C.gold): string {
  return `0 0 0 3px ${color}30`;
}

export function statusColor(status: 'success' | 'warning' | 'error' | 'info' | 'neutral'): string {
  return {
    success: C.green,
    warning: C.gold,
    error: C.error,
    info: C.cyan,
    neutral: C.textMuted,
  }[status];
}

export function pillStyle(color: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: R.full,
    background: `${color}14`,
    border: `1px solid ${color}28`,
    fontSize: TYPE.size.xs,
    fontWeight: String(TYPE.weight.bold),
    color,
  };
}

export const GLOBAL_STYLES = `
@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
}
@keyframes pulse-glow {
  0%,100% { box-shadow: 0 0 12px rgba(88,221,255,0.16); }
  50% { box-shadow: 0 0 28px rgba(88,221,255,0.34); }
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
  50% { transform: translate(30px, -20px); }
}
`;
