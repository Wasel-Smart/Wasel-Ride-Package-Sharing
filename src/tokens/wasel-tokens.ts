/**
 * Structured Wasel tokens for documentation, charts, and design-system consumers.
 *
 * These stay in sync with `utils/wasel-ds.ts` but preserve the original export
 * surface used around the codebase.
 */

export const WaselColors = {
  spaceDeep: '#061726',
  spaceCard: '#0B2135',
  space1: '#0A1F31',
  space2: '#0D2740',
  space3: '#12314D',
  space4: '#183D5F',

  cyan: '#16C7F2',
  cyanLight: '#63E2F4',
  gold: '#C7FF1A',
  goldLight: '#E4FF3A',
  green: '#60C536',
  greenDark: '#49A82F',
  lime: '#D7FF62',

  teal: '#16C7F2',
  bronze: '#C7FF1A',
  orange: '#D7FF62',
  borderDark: 'rgba(73,190,242,0.2)',
  navyBase: '#061726',
  navyCard: '#0B2135',

  textPrimary: '#EAF7FF',
  textSecondary: 'rgba(234,247,255,0.84)',
  textMuted: 'rgba(153,184,210,0.66)',

  success: '#60C536',
  warning: '#FFD84A',
  error: '#FF646A',
  info: '#16C7F2',

  cyanGlow: 'rgba(22,199,242,0.18)',
  goldGlow: 'rgba(199,255,26,0.16)',
  greenGlow: 'rgba(96,197,54,0.18)',
  glassBg: 'rgba(11,33,53,0.84)',
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
  sm: '0 8px 20px rgba(1,9,16,0.2)',
  base: '0 18px 44px rgba(1,10,18,0.28)',
  lg: '0 30px 72px rgba(1,10,18,0.36)',
  glow: '0 18px 50px rgba(22,199,242,0.22)',
  glowGold: '0 18px 50px rgba(199,255,26,0.18)',
  glowGreen: '0 18px 50px rgba(96,197,54,0.22)',
  cyanBorder: '0 0 0 1px rgba(73,190,242,0.18), 0 18px 44px rgba(1,10,18,0.28)',
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
    background: 'rgba(11,33,53,0.84)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(73,190,242,0.16)',
  },
  overlay: {
    background: 'rgba(3,12,20,0.84)',
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(8,27,43,0.94)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(73,190,242,0.12)',
  },
} as const;

export const WaselGradients = {
  primaryBtn: 'linear-gradient(135deg, #16C7F2 0%, #0A74C9 52%, #33D7D0 100%)',
  accentBtn: 'linear-gradient(135deg, #59C83B 0%, #C7FF1A 100%)',
  successBtn: 'linear-gradient(135deg, #2ED7B7 0%, #7EED3A 100%)',
  heroCard:
    'linear-gradient(135deg, rgba(22,199,242,0.14) 0%, rgba(51,215,208,0.08) 56%, rgba(199,255,26,0.08) 100%)',
  constellation: 'linear-gradient(135deg, #16C7F2 0%, #3AD7E4 48%, #C7FF1A 100%)',
} as const;
