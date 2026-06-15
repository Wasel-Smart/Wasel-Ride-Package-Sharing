import { C, F, GRAD, GRAD_GOLD, GRAD_GREEN, R, SH } from '../utils/wasel-ds';

export const WaselColors = {
  spaceDeep: C.bg,
  spaceCard: C.cardSolid,
  space1: C.bgAlt,
  space2: C.cardSolid,
  space3: C.card2,
  space4: C.navyLight,
  cyan: C.cyan,
  cyanLight: C.cyanDark,
  gold: C.gold,
  goldLight: C.blueLight,
  green: C.green,
  greenDark: '#5E7257',
  lime: '#A9B98D',
  teal: C.cyan,
  bronze: C.gold,
  orange: C.orange,
  borderDark: C.borderFaint,
  navyBase: C.bg,
  navyCard: C.cardSolid,
  textPrimary: C.text,
  textSecondary: C.textSub,
  textMuted: C.textMuted,
  success: C.success,
  warning: C.warning,
  error: C.error,
  info: C.info,
  cyanGlow: C.cyanGlow,
  goldGlow: C.goldDim,
  greenGlow: C.greenDim,
  glassBg: C.glass,
} as const;

export const WaselSpacing = {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
} as const;

export const WaselFonts = {
  sans: F,
  arabic: "'Cairo', 'Tajawal', 'Almarai', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const WaselFontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
} as const;

export const WaselRadius = {
  sm: R.sm,
  base: R.lg,
  lg: R.xl,
  xl: R.xxl,
  '2xl': R['3xl'],
  full: R.full,
} as const;

export const WaselShadows = {
  sm: SH.sm,
  base: SH.card,
  lg: SH.md,
  glow: SH.cyan,
  glowGold: SH.gold,
  glowGreen: SH.green,
  cyanBorder: SH.cyan,
} as const;

export const WaselZIndex = {
  base: 0,
  raised: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;

export const WaselTransitions = {
  fast: '150ms ease',
  base: '250ms ease',
  slow: '400ms ease',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const WaselGlass = {
  card: {
    background: 'rgba(24,28,34,0.85)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${C.border}`,
  },
  overlay: {
    background: C.overlay,
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(19,22,26,0.97)',
    backdropFilter: 'blur(32px)',
    border: `1px solid ${C.borderFaint}`,
  },
} as const;

export const WaselGradients = {
  primaryBtn: GRAD,
  accentBtn: GRAD_GOLD,
  successBtn: GRAD_GREEN,
  heroCard: 'linear-gradient(135deg, rgba(244,239,232,0.10) 0%, rgba(184,138,82,0.06) 100%)',
  constellation: 'linear-gradient(135deg, #F7F1E8 0%, #B88A52 100%)',
} as const;
