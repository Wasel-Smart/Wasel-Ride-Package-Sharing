/**
 * Wasel design tokens — unified gold-navy identity.
 *
 * SINGLE SOURCE OF TRUTH: All values in sync with brand-tokens.json and
 * brand-theme.css CSS variables. Do not add colours here that differ from
 * brand-theme.css :root definitions.
 *
 * Brand palette:
 *   Primary action  — #F4C651  (solar gold)
 *   Primary deep    — #D59E26  (burnished gold)
 *   Primary light   — #FFF0C1  (champagne)
 *   Accent bronze   — #C5831F
 *   Backgrounds     — deep navy #07111B → surface #101D2C
 */

export const WaselColors = {
  // Surfaces
  spaceDeep: '#07111B',
  spaceCard: '#101D2C',
  space1: '#0C1724',
  space2: '#101D2C',
  space3: '#172738',
  space4: '#203447',

  // Brand primaries (gold)
  cyan: '#F4C651',        // canonical primary — named cyan for legacy compat
  cyanLight: '#FFF0C1',   // champagne highlight
  gold: '#D59E26',        // deep gold
  goldLight: '#FFE8A0',   // light gold
  green: '#FFF0C1',       // cream / champagne alias
  greenDark: '#D59E26',   // deep gold alias
  lime: '#FFE8A0',        // warm lime alias

  teal: '#FFF0C1',        // champagne alias
  bronze: '#C5831F',      // accent bronze
  orange: '#DB9F2C',      // warm accent
  borderDark: 'rgba(7,15,25,0.72)',
  navyBase: '#07111B',
  navyCard: '#101D2C',

  textPrimary: '#F8EFD6',
  textSecondary: 'rgba(228,214,180,0.82)',
  textMuted: 'rgba(216,198,160,0.58)',

  success: '#FFF0C1',
  warning: '#FFE08A',
  error: '#FF646A',
  info: '#FFE8A0',

  cyanGlow: 'rgba(244,198,81,0.2)',
  goldGlow: 'rgba(213,158,38,0.18)',
  greenGlow: 'rgba(255,240,193,0.18)',
  glassBg: 'rgba(12,23,36,0.84)',
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
  glow: '0 18px 50px rgba(30,168,231,0.2)',
  glowGold: '0 18px 50px rgba(243,178,58,0.18)',
  glowGreen: '0 18px 50px rgba(255,207,99,0.22)',
  cyanBorder: '0 0 0 1px rgba(76,123,170,0.18), 0 18px 44px rgba(4,16,32,0.3)',
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
    background: 'rgba(16,34,53,0.84)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(76,123,170,0.16)',
  },
  overlay: {
    background: 'rgba(3,12,20,0.84)',
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(11,25,41,0.94)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(76,123,170,0.12)',
  },
} as const;

export const WaselGradients = {
  primaryBtn: 'linear-gradient(135deg, #FFF0C1 0%, #F4C651 44%, #C5831F 100%)',
  accentBtn: 'linear-gradient(135deg, #D59E26 0%, #FFE8A0 100%)',
  successBtn: 'linear-gradient(135deg, #F4C651 0%, #FFF0C1 100%)',
  heroCard:
    'linear-gradient(135deg, rgba(244,198,81,0.14) 0%, rgba(255,240,193,0.08) 56%, rgba(197,131,31,0.08) 100%)',
  constellation: 'linear-gradient(135deg, #FFF0C1 0%, #F4C651 44%, #D59E26 100%)',
} as const;
