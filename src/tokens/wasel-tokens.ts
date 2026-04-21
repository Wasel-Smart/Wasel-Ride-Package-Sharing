import {
  borderRadius,
  breakpoints,
  colors,
  shadows,
  spacing,
  transitions,
  typography,
  zIndex,
} from '../design-system/tokens';

export const WaselColors = {
  spaceDeep: colors.background,
  spaceCard: colors.surfaceStrong,
  space1: colors.background,
  space2: colors.surface,
  space3: colors.surfaceMuted,
  space4: 'rgba(169,227,255,0.12)',

  cyan: colors.primary,
  cyanLight: '#EEF8FF',
  gold: colors.primary,
  goldLight: '#DFF6FF',
  green: colors.secondary,
  greenDark: '#17C7A5',
  lime: colors.accent,

  teal: colors.primary,
  bronze: colors.accent,
  orange: '#F8BA3E',
  borderDark: colors.borderStrong,
  navyBase: colors.background,
  navyCard: colors.surfaceStrong,

  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textMuted: colors.text.muted,

  success: colors.state.success,
  warning: colors.state.warning,
  error: colors.state.error,
  info: colors.state.info,

  cyanGlow: 'rgba(169,227,255,0.24)',
  goldGlow: 'rgba(126,205,249,0.22)',
  greenGlow: 'rgba(25,231,187,0.18)',
  glassBg: 'rgba(8,15,26,0.88)',
} as const;

export const WaselSpacing = {
  ...spacing,
} as const;

export const WaselFonts = {
  sans: typography.fontFamily.sans,
  arabic: typography.fontFamily.arabic,
  mono: typography.fontFamily.mono,
} as const;

export const WaselFontSizes = {
  ...typography.fontSize,
} as const;

export const WaselRadius = {
  sm: borderRadius.sm,
  base: borderRadius.base,
  lg: borderRadius.md,
  xl: borderRadius.lg,
  '2xl': borderRadius.xl,
  full: borderRadius.full,
} as const;

export const WaselShadows = {
  sm: shadows.sm,
  base: shadows.base,
  lg: shadows.lg,
  glow: shadows.glow,
  glowGold: shadows.glow,
  glowGreen: shadows.glowAccent,
  cyanBorder:
    '0 0 0 1px rgba(169,227,255,0.18), 0 18px 44px rgba(0,0,0,0.32)',
} as const;

export const WaselZIndex = {
  base: zIndex.base,
  raised: 10,
  overlay: zIndex.modalBackdrop,
  modal: zIndex.modal,
  toast: zIndex.toast,
  tooltip: 400,
} as const;

export const WaselTransitions = {
  fast: transitions.fast,
  base: transitions.base,
  slow: transitions.slow,
  spring: transitions.spring,
} as const;

export const WaselGlass = {
  card: {
    background: colors.surfaceStrong,
    backdropFilter: 'blur(18px)',
    border: `1px solid ${colors.border}`,
  },
  overlay: {
    background: 'rgba(6,13,26,0.56)',
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(8,15,26,0.94)',
    backdropFilter: 'blur(28px)',
    border: `1px solid ${colors.borderStrong}`,
  },
} as const;

export const WaselGradients = {
  primaryBtn: colors.gradients.primary,
  accentBtn: colors.gradients.signal,
  successBtn: 'linear-gradient(135deg, #19E7BB 0%, #A9E3FF 100%)',
  heroCard:
    'linear-gradient(135deg, rgba(169,227,255,0.16) 0%, rgba(255,255,255,0.08) 56%, rgba(25,231,187,0.08) 100%)',
  constellation: colors.gradients.signal,
} as const;

export const WaselBreakpoints = breakpoints;
