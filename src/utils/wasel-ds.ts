/**
 * Wasel design system tokens.
 * Unified around the warm ivory wordmark on charcoal surfaces.
 */

export const C = {
  bg: '#111316',
  bgAlt: '#171A1F',
  bgDeep: '#0B0D10',
  card: 'rgba(247,241,232,0.05)',
  cardSolid: '#181C22',
  card2: '#20252D',
  panel: 'rgba(247,241,232,0.028)',
  elevated: 'rgba(247,241,232,0.08)',

  navy: '#2D2D31',
  navyMid: '#49433E',
  navyLight: '#655E57',

  cyan: '#F4EFE8',
  cyanDark: '#D8D0C5',
  cyanDim: 'rgba(244,239,232,0.10)',
  cyanGlow: 'rgba(244,239,232,0.22)',
  blue: '#D1AF84',
  blueLight: '#E0C4A3',
  blueDim: 'rgba(209,175,132,0.12)',
  gold: '#B88A52',
  goldDim: 'rgba(184,138,82,0.14)',
  green: '#7F9370',
  greenDim: 'rgba(127,147,112,0.14)',
  purple: '#A58872',
  purpleDim: 'rgba(165,136,114,0.12)',
  orange: '#C96F47',
  orangeDim: 'rgba(201,111,71,0.12)',

  text: '#F7F1E8',
  textSub: 'rgba(247,241,232,0.82)',
  textMuted: 'rgba(223,215,205,0.58)',
  textDim: 'rgba(189,180,168,0.46)',

  border: 'rgba(244,239,232,0.14)',
  borderHov: 'rgba(244,239,232,0.28)',
  borderFaint: 'rgba(244,239,232,0.08)',

  error: '#DB6C63',
  errorDim: 'rgba(219,108,99,0.14)',
  warning: '#C89A5D',
  success: '#7F9370',
  info: '#F4EFE8',

  overlay: 'rgba(10,11,13,0.82)',
  glass: 'rgba(19,22,26,0.90)',
} as const;

export const F = "'Plus Jakarta Sans', 'Inter', 'Cairo', 'Tajawal', sans-serif";
export const FA = "'Cairo', 'Tajawal', sans-serif";
export const FM = "'JetBrains Mono', 'Fira Mono', monospace";

export const TYPE = {
  size: {
    xs: '0.65rem',
    sm: '0.75rem',
    base: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
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
    black: 800,
    ultra: 900,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },
  letterSpacing: {
    tighter: '-0.04em',
    tight: '-0.02em',
    normal: '0',
    wide: '0.06em',
    wider: '0.1em',
    widest: '0.14em',
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
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  xxl: '20px',
  '3xl': '28px',
  full: '9999px',
} as const;

export const SH = {
  none: 'none',
  xs: '0 1px 2px rgba(0,0,0,0.25)',
  sm: '0 1px 4px rgba(0,0,0,0.3)',
  card: '0 8px 30px rgba(0,0,0,0.32)',
  md: '0 12px 34px rgba(0,0,0,0.38)',
  lg: '0 18px 48px rgba(0,0,0,0.46)',
  xl: '0 24px 70px rgba(0,0,0,0.54)',
  navy: '0 8px 32px rgba(0,0,0,0.34)',
  cyan: '0 4px 20px rgba(244,239,232,0.18)',
  cyanL: '0 10px 36px rgba(244,239,232,0.24)',
  blue: '0 8px 22px rgba(209,175,132,0.22)',
  green: '0 8px 22px rgba(127,147,112,0.22)',
  gold: '0 8px 24px rgba(184,138,82,0.26)',
  inner: 'inset 0 1px 3px rgba(0,0,0,0.3)',
} as const;

export const GRAD = 'linear-gradient(135deg, #C59A64 0%, #8A673F 100%)';
export const GRAD_GOLD = 'linear-gradient(135deg, #C59A64 0%, #A17540 100%)';
export const GRAD_GREEN = 'linear-gradient(135deg, #7F9370 0%, #5C6E54 100%)';
export const GRAD_NAVY = 'linear-gradient(145deg, #171A1F 0%, #12151A 56%, #0B0D10 100%)';
export const GRAD_PURPLE = 'linear-gradient(135deg, #A58872 0%, #7C6354 100%)';
export const GRAD_HERO = 'linear-gradient(145deg, #111316 0%, #171A1F 56%, #20252D 100%)';
export const GRAD_SIGNAL = 'linear-gradient(135deg, #F7F1E8 0%, #D3B38B 56%, #A07C54 100%)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, rgba(244,239,232,0.18), rgba(184,138,82,0.12) 42%, rgba(17,19,22,0) 74%)';

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

export function card({ padding = '20px', radius = R.xl }: { padding?: string; radius?: string } = {}) {
  return {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: SH.card,
    backdropFilter: 'blur(16px)',
  };
}

export function solidCard({ padding = '20px', radius = R.xl }: { padding?: string; radius?: string } = {}) {
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
  0%,100% { box-shadow: 0 0 12px rgba(244,239,232,0.18); }
  50% { box-shadow: 0 0 28px rgba(184,138,82,0.35); }
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
