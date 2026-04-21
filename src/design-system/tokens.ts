export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const colors = {
  primary: '#A9E3FF',
  secondary: '#19E7BB',
  accent: '#7ECDF9',
  background: '#060D1A',
  surface: '#0B1525',
  surfaceMuted: 'rgba(220,255,248,0.055)',
  surfaceStrong: 'rgba(10,18,28,0.84)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(169,227,255,0.22)',
  text: {
    primary: '#DCFFF8',
    secondary: 'rgba(220,255,248,0.72)',
    muted: 'rgba(220,255,248,0.48)',
    inverse: '#081520',
  },
  state: {
    success: '#19E7BB',
    warning: '#F8BA3E',
    error: '#FF5060',
    info: '#A9E3FF',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #EEF8FF 0%, #D6EEFF 52%, #A9E3FF 100%)',
    signal: 'linear-gradient(135deg, #A9E3FF 0%, #7ECDF9 58%, #19E7BB 100%)',
    hero: 'linear-gradient(180deg, rgba(220,255,248,0.055), rgba(220,255,248,0.018))',
  },
} as const;

export const typography = {
  fontFamily: {
    sans:
      "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Inter', 'Cairo', 'Tajawal', sans-serif)",
    display:
      "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)",
    arabic:
      "var(--wasel-font-arabic, 'Cairo', 'Tajawal', 'Segoe UI', sans-serif)",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: '0.6875rem',
    sm: '0.8125rem',
    base: '0.9375rem',
    lg: '1.0625rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.75rem',
    '5xl': '4.5rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    tight: 1.04,
    snug: 1.16,
    normal: 1.65,
    relaxed: 1.75,
    arabic: 1.95,
  },
  letterSpacing: {
    tighter: '-0.06em',
    tight: '-0.03em',
    normal: '0',
    wide: '0.08em',
    wider: '0.12em',
  },
} as const;

export const borderRadius = {
  none: '0px',
  sm: '10px',
  base: '14px',
  md: '18px',
  lg: '22px',
  xl: '28px',
  '2xl': '34px',
  full: '9999px',
} as const;

export const shadows = {
  xs: '0 2px 8px rgba(0,0,0,0.28)',
  sm: '0 4px 16px rgba(0,0,0,0.32)',
  base: '0 8px 28px rgba(0,0,0,0.38)',
  md: '0 16px 48px rgba(0,0,0,0.44)',
  lg: '0 24px 64px rgba(0,0,0,0.48)',
  xl: '0 28px 72px rgba(0,0,0,0.52)',
  glow: '0 18px 44px rgba(169,227,255,0.22)',
  glowAccent: '0 16px 42px rgba(25,231,187,0.18)',
} as const;

export const zIndex = {
  base: 0,
  sticky: 100,
  dropdown: 1000,
  modalBackdrop: 1040,
  modal: 1050,
  toast: 1080,
} as const;

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '900px',
  xl: '1024px',
  '2xl': '1280px',
  '3xl': '1536px',
} as const;

export const transitions = {
  fast: '120ms cubic-bezier(0.2, 0.9, 0.2, 1)',
  base: '180ms cubic-bezier(0.2, 0.9, 0.2, 1)',
  slow: '260ms cubic-bezier(0.2, 0.9, 0.2, 1)',
  spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const motion = {
  orbit: '22s linear infinite',
  float: '5.4s ease-in-out infinite',
  pulse: '1.9s ease-in-out infinite',
  page: '540ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const layout = {
  maxWidth: '1380px',
  contentWidth: '760px',
  shellPaddingInline: 'clamp(14px, 3vw, 20px)',
  shellPaddingTop: 'clamp(22px, 4vw, 28px)',
  shellPaddingBottom: 'clamp(72px, 8vw, 84px)',
  sectionGap: 'clamp(18px, 2.4vw, 28px)',
  cardPadding: 'clamp(18px, 3vw, 30px)',
  gridGap: 'clamp(12px, 2vw, 18px)',
} as const;

export const icon = {
  sm: '14px',
  md: '18px',
  lg: '20px',
} as const;

export const states = {
  hover: 'rgba(169,227,255,0.10)',
  hoverStrong: 'rgba(169,227,255,0.16)',
  active: 'rgba(169,227,255,0.22)',
  disabled: 'rgba(220,255,248,0.34)',
  focusRing: '0 0 0 3px rgb(169 227 255 / 0.18)',
} as const;

export const surfaces = {
  page:
    'linear-gradient(180deg, rgba(220,255,248,0.08) 0%, rgba(220,255,248,0.03) 100%), rgba(8,15,26,0.84)',
  pageStrong:
    'linear-gradient(180deg, rgba(220,255,248,0.10) 0%, rgba(220,255,248,0.05) 100%), rgba(8,15,26,0.90)',
} as const;

export const components = {
  button: {
    height: {
      sm: '40px',
      base: '46px',
      lg: '54px',
    },
    padding: {
      sm: '0 16px',
      base: '0 20px',
      lg: '0 24px',
    },
  },
  input: {
    height: {
      sm: '44px',
      base: '50px',
      lg: '54px',
    },
    padding: {
      sm: '0 14px',
      base: '0 16px',
      lg: '0 18px',
    },
  },
  card: {
    padding: {
      sm: '16px',
      base: '20px',
      lg: '24px',
    },
  },
} as const;

export const tokens = {
  spacing,
  colors,
  typography,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  transitions,
  motion,
  icon,
  states,
  surfaces,
  layout,
  components,
} as const;

export const cssVariables = `
:root {
  --wasel-layout-max-width: ${layout.maxWidth};
  --wasel-layout-content-width: ${layout.contentWidth};
  --wasel-layout-inline: ${layout.shellPaddingInline};
  --wasel-layout-top: ${layout.shellPaddingTop};
  --wasel-layout-bottom: ${layout.shellPaddingBottom};
  --wasel-layout-gap: ${layout.sectionGap};
  --wasel-card-padding: ${layout.cardPadding};
  --wasel-grid-gap: ${layout.gridGap};
  --wasel-motion-fast: ${transitions.fast};
  --wasel-motion-base: ${transitions.base};
  --wasel-motion-slow: ${transitions.slow};
  --wasel-icon-size-sm: ${icon.sm};
  --wasel-icon-size-md: ${icon.md};
  --wasel-icon-size-lg: ${icon.lg};
}
`;

export function getSpacing(value: keyof typeof spacing) {
  return spacing[value];
}

export function getResponsiveClamp(base: string, md = base, lg = md) {
  return `clamp(${base}, ${md}, ${lg})`;
}

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type Breakpoint = keyof typeof breakpoints;
export type Transition = keyof typeof transitions;

export default tokens;
