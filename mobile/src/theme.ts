export const colors = {
  primary: '#147FE4',
  secondary: '#72C70D',

  bg: '#081D39',
  surface: '#0e2240',
  surfaceElevated: '#132b4d',
  surfaceAlt: '#132b4d',
  surfaceMuted: '#0e2240',
  line: 'rgba(20,127,228,0.16)',
  lineStrong: 'rgba(20,127,228,0.28)',

  textPrimary: '#F8FBFF',
  textSecondary: 'rgba(248,251,255,0.86)',
  textMuted: 'rgba(196,220,238,0.68)',
  ink: '#F8FBFF',
  text: '#F8FBFF',
  muted: 'rgba(196,220,238,0.68)',
  navy: '#081D39',
  charcoal: '#E2E8F0',

  cyan: '#147FE4',
  teal: '#58DDFF',
  green: '#72C70D',
  amber: '#FF8A0B',
  blue: '#147FE4',
  gold: '#FFBE5C',
  lilac: '#8FA6FF',
  rose: '#FF7C8B',
  red: '#FF7C8B',

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
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  lift: {
    shadowColor: '#0B1220',
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
