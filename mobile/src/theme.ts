export const colors = {
  // Brand
  primary: '#147FE4', // Wasel Connection Blue
  secondary: '#72C70D', // Wasel Movement Green

  // Neutrals
  bg: '#081D39',
  surface: '#0E2240',
  surfaceElevated: '#132B4D',
  surfaceAlt: '#1A3560',
  surfaceMuted: '#0A1F3A',
  line: 'rgba(20, 127, 228, 0.16)',
  lineStrong: 'rgba(20, 127, 228, 0.28)',

  // Text
  textPrimary: '#F8FBFF',
  textSecondary: '#C4DCEE',
  textMuted: '#95B2C9',
  ink: '#F8FBFF',
  text: '#F8FBFF',
  muted: '#95B2C9',
  navy: '#081D39',
  charcoal: '#C4DCEE',

  // Brand accents (dark mode palette)
  cyan: '#147FE4',
  teal: '#58DDFF',
  green: '#72C70D',
  amber: '#FF8A0B',
  blue: '#147FE4',
  gold: '#FFBE5C',
  lilac: '#C084FC',
  rose: '#FDA4AF',
  red: '#FCA5A5',

  // System
  success: '#72C70D',
  warning: '#FF8A0B',
  error: '#FF7C8B',
  info: '#147FE4',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  display: { fontSize: 48, fontWeight: '800' as const, letterSpacing: -1 },
  heading: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  lead: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.25 },
  subtitle: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '500' as const },
  micro: { fontSize: 10, fontWeight: '600' as const, textTransform: 'uppercase', letterSpacing: 0.5 },
  button: { fontSize: 16, fontWeight: '700' as const },
  label: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase', letterSpacing: 1 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#081D39',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  lift: {
    shadowColor: '#081D39',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
};

export const motion = {
  fast: 160,
  standard: 240,
};

export const hitSlop = {
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
};
