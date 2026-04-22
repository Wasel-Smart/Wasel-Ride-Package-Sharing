import { BRAND } from './brand';

export const colors = {
  dark: {
    page: BRAND.colors.dark.bg,
    pageMuted: BRAND.colors.dark.bg,
    surface: BRAND.colors.dark.surface,
    surfaceRaised: BRAND.colors.dark.surface,
    surfaceSoft: 'color-mix(in srgb, #111827 78%, #0B0F14 22%)',
    border: BRAND.colors.dark.border,
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    text: BRAND.colors.dark.textPrimary,
    textMuted: BRAND.colors.dark.textMuted,
    textSoft: 'rgba(248, 250, 252, 0.52)',
    accent: BRAND.colors.brand.solid,
    accentStrong: BRAND.colors.brand.gradientStart,
    accentSoft: 'color-mix(in srgb, #E67E22 18%, transparent)',
    success: BRAND.colors.brand.gradientStart,
    warning: BRAND.colors.brand.solid,
    danger: BRAND.colors.brand.hover,
    info: BRAND.colors.brand.gradientStart,
  },
  light: {
    page: BRAND.colors.light.bg,
    pageMuted: BRAND.colors.light.bg,
    surface: BRAND.colors.light.surface,
    surfaceRaised: BRAND.colors.light.surface,
    surfaceSoft: 'color-mix(in srgb, #FFFDF9 74%, #F5EFE6 26%)',
    border: BRAND.colors.light.border,
    borderStrong: 'rgba(15, 23, 42, 0.14)',
    text: BRAND.colors.light.textPrimary,
    textMuted: BRAND.colors.light.textMuted,
    textSoft: 'rgba(107, 114, 128, 0.76)',
    accent: BRAND.colors.brand.solid,
    accentStrong: BRAND.colors.brand.gradientStart,
    accentSoft: 'color-mix(in srgb, #E67E22 10%, transparent)',
    success: BRAND.colors.brand.gradientStart,
    warning: BRAND.colors.brand.solid,
    danger: BRAND.colors.brand.hover,
    info: BRAND.colors.brand.gradientStart,
  },
} as const;

export const spacing = {
  0: '0rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '2rem',
  8: '2.5rem',
  9: '3rem',
  10: '4rem',
} as const;

export const typography = {
  fontFamily: {
    display: BRAND.fonts.display,
    body: BRAND.fonts.sans,
    arabic: BRAND.fonts.sans,
    mono: BRAND.fonts.mono,
  },
  fontSize: {
    title: '2rem',
    section: '1.5rem',
    body: '1rem',
    bodySmall: '0.875rem',
    caption: '0.75rem',
    micro: '0.75rem',
  },
  fontWeight: {
    regular: 500,
    strong: 700,
  },
  lineHeight: {
    tight: 1.05,
    heading: 1.12,
    body: 1.62,
  },
} as const;

export const radius = {
  sm: '0.75rem',
  md: '1rem',
  lg: '1.25rem',
  pill: '999px',
} as const;

export const borders = {
  subtle: '1px solid var(--ds-border)',
  strong: '1px solid var(--ds-border-strong)',
} as const;

export const motion = {
  fast: '160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  base: '220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  slow: '320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  entrance: '420ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const layout = {
  maxWidth: '76rem',
  wideWidth: '92rem',
  contentWidth: '42rem',
  formWidth: '32rem',
} as const;

export const tokens = {
  colors,
  spacing,
  typography,
  radius,
  borders,
  motion,
  layout,
} as const;

export type ThemeName = keyof typeof colors;
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type SpacingToken = keyof typeof spacing;

export const designTokenPattern = /var\(--ds-[a-z0-9-]+\)/;

export default tokens;
