/**
 * Wasel design tokens aligned with the light screenshot palette.
 *
 * Buttons use the shared sky-blue action color `#A9E3FF`.
 */

export const WaselColors = {
  // Surfaces
  spaceDeep: '#EEF4FB',
  spaceCard: '#FFFFFF',
  space1: '#F6F9FD',
  space2: '#FFFFFF',
  space3: '#F0F5FB',
  space4: '#DBE7F2',

  // Brand colors
  cyan: '#A9E3FF',
  cyanLight: '#EEF8FF',
  gold: '#A9E3FF',
  goldLight: '#EEF8FF',
  green: '#22C2AA',
  greenDark: '#1AA792',
  lime: '#7ECDF9',

  teal: '#A9E3FF',
  bronze: '#A9E3FF',
  orange: '#A9E3FF',
  borderDark: 'rgba(185,208,228,0.72)',
  navyBase: '#143459',
  navyCard: '#FFFFFF',

  textPrimary: '#143459',
  textSecondary: 'rgba(100,123,149,0.86)',
  textMuted: 'rgba(100,123,149,0.66)',

  success: '#22C2AA',
  warning: '#A9E3FF',
  error: '#FF646A',
  info: '#A9E3FF',

  cyanGlow: 'rgba(169,227,255,0.24)',
  goldGlow: 'rgba(169,227,255,0.24)',
  greenGlow: 'rgba(34,194,170,0.16)',
  glassBg: 'rgba(255,255,255,0.9)',
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
  sm: '0 8px 20px rgba(20,52,89,0.08)',
  base: '0 18px 44px rgba(20,52,89,0.1)',
  lg: '0 30px 72px rgba(20,52,89,0.12)',
  glow: '0 18px 44px rgba(169,227,255,0.22)',
  glowGold: '0 18px 44px rgba(169,227,255,0.22)',
  glowGreen: '0 18px 42px rgba(34,194,170,0.14)',
  cyanBorder: '0 0 0 1px rgba(185,208,228,0.72), 0 18px 44px rgba(20,52,89,0.1)',
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
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(185,208,228,0.72)',
  },
  overlay: {
    background: 'rgba(20,52,89,0.12)',
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(185,208,228,0.72)',
  },
} as const;

export const WaselGradients = {
  primaryBtn: 'linear-gradient(135deg, #EEF8FF 0%, #D6EEFF 52%, #A9E3FF 100%)',
  accentBtn: 'linear-gradient(135deg, #D7F0FF 0%, #A9E3FF 100%)',
  successBtn: 'linear-gradient(135deg, #DFF3FF 0%, #A9E3FF 100%)',
  heroCard:
    'linear-gradient(135deg, rgba(169,227,255,0.16) 0%, rgba(255,255,255,0.08) 56%, rgba(34,194,170,0.06) 100%)',
  constellation: 'linear-gradient(135deg, #EEF8FF 0%, #A9E3FF 68%, #22C2AA 100%)',
} as const;
