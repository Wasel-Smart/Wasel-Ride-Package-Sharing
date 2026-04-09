/**
 * Structured Wasel tokens for documentation, charts, and design-system consumers.
 *
 * These stay in sync with `utils/wasel-ds.ts` but preserve the original export
 * surface used around the codebase.
 */

export const WaselColors = {
  spaceDeep: '#081C36',
  spaceCard: '#0D284B',
  space1: '#0B2341',
  space2: '#102C4D',
  space3: '#16385D',
  space4: '#214A75',

  cyan: '#47B7E6',
  cyanLight: '#72D0EF',
  gold: '#A8D614',
  goldLight: '#C9E96B',
  green: '#6BB515',
  greenDark: '#4A910E',
  lime: '#C9E96B',

  teal: '#72D0EF',
  bronze: '#A8D614',
  orange: '#C9E96B',
  borderDark: 'rgba(93,150,210,0.2)',
  navyBase: '#081C36',
  navyCard: '#0D284B',

  textPrimary: '#EEF5FF',
  textSecondary: 'rgba(238,245,255,0.84)',
  textMuted: 'rgba(171,194,221,0.66)',

  success: '#6BB515',
  warning: '#FFD84A',
  error: '#FF646A',
  info: '#47B7E6',

  cyanGlow: 'rgba(71,183,230,0.18)',
  goldGlow: 'rgba(168,214,20,0.16)',
  greenGlow: 'rgba(107,181,21,0.18)',
  glassBg: 'rgba(13,40,75,0.84)',
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
  sans:
    "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  arabic:
    "var(--wasel-font-arabic, 'Cairo', 'Tajawal', 'Almarai', sans-serif)",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const WaselFontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.3125rem',
  '2xl': '1.625rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
  '5xl': '3.25rem',
} as const;

export const WaselRadius = {
  sm: '10px',
  base: '14px',
  lg: '18px',
  xl: '22px',
  '2xl': '28px',
  full: '9999px',
} as const;

export const WaselShadows = {
  sm: '0 8px 20px rgba(4,16,32,0.22)',
  base: '0 18px 44px rgba(4,16,32,0.3)',
  lg: '0 30px 72px rgba(4,16,32,0.38)',
  glow: '0 18px 50px rgba(71,183,230,0.2)',
  glowGold: '0 18px 50px rgba(168,214,20,0.18)',
  glowGreen: '0 18px 50px rgba(107,181,21,0.22)',
  cyanBorder: '0 0 0 1px rgba(93,150,210,0.18), 0 18px 44px rgba(4,16,32,0.3)',
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
  fast: '120ms cubic-bezier(0.2, 0.9, 0.2, 1)',
  base: '180ms cubic-bezier(0.2, 0.9, 0.2, 1)',
  slow: '280ms cubic-bezier(0.2, 0.9, 0.2, 1)',
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const WaselGlass = {
  card: {
    background: 'rgba(13,40,75,0.84)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(93,150,210,0.16)',
  },
  overlay: {
    background: 'rgba(3,12,20,0.84)',
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(10,33,60,0.94)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(93,150,210,0.12)',
  },
} as const;

export const WaselGradients = {
  primaryBtn: 'linear-gradient(135deg, #72D0EF 0%, #2F92CF 42%, #8BC61A 100%)',
  accentBtn: 'linear-gradient(135deg, #6BB515 0%, #A8D614 100%)',
  successBtn: 'linear-gradient(135deg, #47B7E6 0%, #6BB515 100%)',
  heroCard:
    'linear-gradient(135deg, rgba(71,183,230,0.14) 0%, rgba(114,208,239,0.08) 56%, rgba(168,214,20,0.08) 100%)',
  constellation: 'linear-gradient(135deg, #47B7E6 0%, #72D0EF 48%, #A8D614 100%)',
} as const;
