export const colors = {
  dark: {
    page: '#0f1113',
    pageMuted: '#15181c',
    surface: '#1a1d22',
    surfaceRaised: '#20242a',
    surfaceSoft: '#262b32',
    border: '#313841',
    borderStrong: '#45505c',
    text: '#f5efe7',
    textMuted: '#b9aea0',
    textSoft: '#8b8277',
    accent: '#f59a2c',
    accentStrong: '#ffb357',
    accentSoft: '#3f2a15',
    success: '#79c67d',
    warning: '#efb45d',
    danger: '#ee705d',
    info: '#6bb9df',
  },
  light: {
    page: '#eee3d5',
    pageMuted: '#e5d8c7',
    surface: '#f3e8da',
    surfaceRaised: '#f7eddf',
    surfaceSoft: '#e9dcc9',
    border: '#c8b69e',
    borderStrong: '#b19878',
    text: '#201a15',
    textMuted: '#6b5f52',
    textSoft: '#8d7d6d',
    accent: '#de7b0d',
    accentStrong: '#f59a2c',
    accentSoft: '#f0d9bc',
    success: '#4f8d57',
    warning: '#b9782a',
    danger: '#bf5c45',
    info: '#2e6f8d',
  },
} as const;

export const spacing = {
  0: '0rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.5rem',
  6: '2rem',
  7: '2.5rem',
  8: '3rem',
  9: '4rem',
} as const;

export const typography = {
  fontFamily: {
    display: "'Space Grotesk', 'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    body: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    arabic: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    title: '1.75rem',
    section: '1.25rem',
    body: '1rem',
    bodySmall: '0.875rem',
    caption: '0.8125rem',
    micro: '0.75rem',
  },
  fontWeight: {
    regular: 500,
    strong: 700,
  },
  lineHeight: {
    tight: 1.05,
    heading: 1.15,
    body: 1.55,
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
