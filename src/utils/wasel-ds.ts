/**
 * Wasel Design System Tokens — Brand Single Source of Truth
 *
 * Palette sourced from docs/BRAND_GUIDELINES.md:
 *   Brand ink    #081D39
 *   Connection blue #00E5FF
 *   Movement green #72C70D
 *   Journey orange #FF8A0B
 *
 * Semantic aliases preserve backward compatibility with existing components.
 */

export const C = {
  bg: '#081D39',
  bgAlt: '#0a1f3a',
  bgDeep: '#050B12',
  card: 'rgba(8,29,57,0.78)',
  cardSolid: '#0e2240',
  card2: '#132b4d',
  panel: 'rgba(20,127,228,0.06)',
  elevated: 'rgba(255,255,255,0.06)',

  brandInk: '#081D39',
  brandBlue: '#00E5FF',
  brandGreen: '#72C70D',
  brandOrange: '#FF8A0B',

  navy: '#081D39',
  navyMid: '#0e2240',
  navyLight: '#132b4d',

  blue: '#00E5FF',
  blueLight: '#58DDFF',
  blueDim: 'rgba(0,229,255,0.12)',
  cyan: '#00E5FF',
  cyanDark: '#58DDFF',
  cyanDim: 'rgba(0,229,255,0.1)',
  cyanGlow: 'rgba(0,229,255,0.2)',

  green: '#72C70D',
  greenDark: '#5a6b08',
  greenDim: 'rgba(114,199,13,0.12)',

  // True brand gold (BRAND_GUIDELINES.md "Supporting accents"). Distinct from journey
  // orange below — use for premium badges, rewards, Wasel Plus. `orange` stays the
  // primary CTA/journey colour and is intentionally left pointing at brandOrange.
  gold: '#FFBE5C',
  goldDim: 'rgba(255,190,92,0.14)',
  bronze: '#FFBE5C',
  bronzeDim: 'rgba(255,190,92,0.14)',

  orange: '#FF8A0B',
  orangeDim: 'rgba(255,138,11,0.12)',

  purple: '#8FA6FF',
  purpleDim: 'rgba(143,166,255,0.12)',

  // True brand teal/cyan accent (BRAND_GUIDELINES.md). Distinct from `cyan` above,
  // which is kept as a compatibility alias for `blue` so existing "cyan"-named
  // usages that actually mean the primary interactive blue don't shift colour.
  // New info/map/data-viz UI should reference `teal`, not `cyan`.
  teal: '#58DDFF',
  tealDim: 'rgba(88,221,255,0.12)',
  tealGlow: 'rgba(88,221,255,0.2)',

  // Secondary success / eco-movement accent (BRAND_GUIDELINES.md).
  lime: '#9AF1CF',
  limeDim: 'rgba(154,241,207,0.12)',

  text: '#F8FBFF',
  textSub: 'rgba(248,251,255,0.86)',
  textMuted: 'rgba(196,220,238,0.68)',
  textDim: 'rgba(149,178,201,0.56)',

  border: 'rgba(20,127,228,0.16)',
  borderHov: 'rgba(20,127,228,0.28)',
  borderFaint: 'rgba(20,127,228,0.08)',

  error: '#FF7C8B',
  errorDim: 'rgba(255,124,139,0.14)',
  warning: '#FF8A0B',
  success: '#72C70D',
  info: '#00E5FF',

  overlay: 'rgba(4,10,18,0.8)',
  glass: 'rgba(8,29,57,0.9)',
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
    tighter: '-0.04em',
    tight: '-0.02em',
    normal: '0',
    wide: '0.03em',
    wider: '0.06em',
    widest: '0.1em',
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
  md: '12px',
  lg: '14px',
  xl: '18px',
  xxl: '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

export const SH = {
  none: 'none',
  xs: '0 1px 2px rgba(8,29,57,0.25)',
  sm: '0 2px 8px rgba(8,29,57,0.28)',
  card: '0 10px 28px rgba(8,29,57,0.28)',
  md: '0 14px 32px rgba(8,29,57,0.32)',
  lg: '0 18px 42px rgba(8,29,57,0.38)',
  xl: '0 26px 58px rgba(8,29,57,0.46)',
  navy: '0 8px 26px rgba(8,29,57,0.28)',
  blue: '0 4px 18px rgba(20,127,228,0.16)',
  blueL: '0 10px 28px rgba(20,127,228,0.2)',
  green: '0 8px 20px rgba(114,199,13,0.18)',
  orange: '0 8px 22px rgba(255,138,11,0.2)',
  inner: 'inset 0 1px 3px rgba(8,29,57,0.3)',
} as const;

export const SH_ALIASES = {
  cyan: SH.blue,
  cyanL: SH.blueL,
  gold: SH.orange,
} as const;

export const shadows = { ...SH, ...SH_ALIASES } as const;

export const GRAD = 'linear-gradient(135deg, #00E5FF 0%, #38BEFF 52%, #32D8A6 100%)';
export const GRAD_GOLD = 'linear-gradient(135deg, #FF8A0B 0%, #FFB35C 48%, #FF936A 100%)';
export const GRAD_ORANGE = 'linear-gradient(135deg, #FF8A0B 0%, #FFB35C 48%, #FF936A 100%)';
export const GRAD_GREEN = 'linear-gradient(135deg, #72C70D 0%, #34D8A7 52%, #209B7D 100%)';
export const GRAD_NAVY = 'linear-gradient(145deg, #081D39 0%, #0a1f3a 56%, #050B12 100%)';
export const GRAD_PURPLE = 'linear-gradient(135deg, #B7ABFF 0%, #7F91FF 100%)';
export const GRAD_HERO = 'linear-gradient(145deg, #081D39 0%, #0a1f3a 56%, #132b4d 100%)';
export const GRAD_SIGNAL = 'linear-gradient(135deg, #F8FBFF 0%, #8DEBFF 52%, #47D69E 100%)';
export const GRAD_AURORA =
  'radial-gradient(circle at top, rgba(20,127,228,0.18), rgba(114,199,13,0.08) 42%, rgba(8,29,57,0) 74%)';

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

export function focusRing(color = C.brandBlue): string {
  return `0 0 0 3px ${color}30`;
}

export function statusColor(status: 'success' | 'warning' | 'error' | 'info' | 'neutral'): string {
  return {
    success: C.brandGreen,
    warning: C.brandOrange,
    error: C.error,
    info: C.brandBlue,
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
