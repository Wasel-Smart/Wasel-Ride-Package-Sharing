/**
 * Wasel brand tokens aligned to the neon linked mobility mark.
 *
 * The identity is built around:
 * - luminous cyan for movement, system focus, and live state
 * - electric lime for shared capacity, routing gain, and positive momentum
 * - midnight navy support surfaces that let the mark glow without noise
 */

export const C = {
  bg: '#061120',
  bgAlt: '#08192D',
  bgDeep: '#040C18',
  card: 'rgba(9,24,42,0.8)',
  cardSolid: '#0A1B30',
  card2: '#10253D',
  panel: 'rgba(255,255,255,0.03)',
  elevated: 'rgba(255,255,255,0.07)',

  navy: '#09182B',
  navyMid: '#10365A',
  navyLight: '#1B5D8F',

  cyan: '#12DBFF',
  cyanDark: '#0E86D2',
  cyanDim: 'rgba(18,219,255,0.16)',
  cyanGlow: 'rgba(18,219,255,0.32)',
  blue: '#0F7BC3',
  blueLight: '#5DCCFF',
  blueDim: 'rgba(15,123,195,0.18)',
  gold: '#BFFF18',
  goldDim: 'rgba(191,255,24,0.16)',
  green: '#69FF45',
  greenDim: 'rgba(105,255,69,0.16)',
  purple: '#39D8F1',
  purpleDim: 'rgba(57,216,241,0.14)',
  orange: '#D8FF67',
  orangeDim: 'rgba(216,255,103,0.16)',

  text: '#EAF7FF',
  textSub: 'rgba(234,247,255,0.84)',
  textMuted: 'rgba(158,185,210,0.66)',
  textDim: 'rgba(121,149,176,0.5)',

  border: 'rgba(70,205,255,0.18)',
  borderHov: 'rgba(70,205,255,0.34)',
  borderFaint: 'rgba(255,255,255,0.08)',

  error: '#FF646A',
  errorDim: 'rgba(255,100,106,0.12)',
  warning: '#FFD84A',
  success: '#69FF45',
  info: '#12DBFF',

  overlay: 'rgba(3,12,20,0.84)',
  glass: 'rgba(8,23,39,0.9)',
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
  xs: '0 4px 12px rgba(1,9,16,0.16)',
  sm: '0 10px 24px rgba(1,9,16,0.2)',
  card: '0 18px 44px rgba(1,10,18,0.28)',
  md: '0 24px 56px rgba(1,10,18,0.34)',
  lg: '0 34px 80px rgba(1,10,18,0.38)',
  xl: '0 44px 100px rgba(1,10,18,0.42)',
  navy: '0 20px 54px rgba(1,10,18,0.34)',
  cyan: '0 18px 50px rgba(18,219,255,0.22)',
  cyanL: '0 24px 64px rgba(18,219,255,0.34)',
  blue: '0 18px 50px rgba(15,123,195,0.24)',
  green: '0 18px 50px rgba(105,255,69,0.24)',
  gold: '0 18px 50px rgba(191,255,24,0.22)',
  inner: 'inset 0 1px 0 rgba(255,255,255,0.05)',
} as const;

export const GRAD = 'linear-gradient(135deg, #12DBFF 0%, #0E86D2 52%, #39D8F1 100%)';
export const GRAD_GOLD = 'linear-gradient(135deg, #67FF49 0%, #BFFF18 100%)';
export const GRAD_GREEN = 'linear-gradient(135deg, #16E2FF 0%, #92FF2A 100%)';
export const GRAD_NAVY = 'linear-gradient(135deg, #09182B 0%, #113557 100%)';
export const GRAD_PURPLE = 'linear-gradient(135deg, #0F7BC3 0%, #12DBFF 100%)';
export const GRAD_HERO = 'linear-gradient(160deg, #040E1B 0%, #081A2D 42%, #0D2942 100%)';
export const GRAD_SIGNAL = 'linear-gradient(135deg, #12DBFF 0%, #2AD4FF 44%, #BFFF18 100%)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, rgba(18,219,255,0.3), rgba(105,255,69,0.16) 44%, rgba(4,18,30,0) 74%)';

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
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), rgba(11,33,53,0.88)',
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: SH.card,
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
    background: C.cardSolid,
    border: `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow: SH.card,
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
  0%,100% { box-shadow: 0 0 18px rgba(22,199,242,0.2); }
  50% { box-shadow: 0 0 28px rgba(22,199,242,0.34), 0 0 36px rgba(199,255,26,0.18); }
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
