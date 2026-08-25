export const colors = {
  // Brand
  primary: '#00E5FF', // Wasel Cyan
  secondary: '#72C70D', // Motion Lime
  ember: '#FF8A0B', // Journey Ember

  // Neutrals
  bg: '#050B12',
  surface: '#081D39',
  surfaceElevated: '#0e2240',
  surfaceAlt: '#132b4d',
  surfaceMuted: '#0a1f3a',
  line: '#334155',
  lineStrong: '#475569',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#697586',
  ink: '#FFFFFF',
  text: '#E2E8F0',
  muted: '#94A3B8',
  navy: '#F6F8FB',
  charcoal: '#E2E8F0',

  // Brand accents (dark mode palette)
  cyan: '#00E5FF',
  teal: '#00E5FF',
  green: '#72C70D',
  amber: '#FF8A0B',
  blue: '#60A5FA',
  gold: '#FF8A0B',
  lilac: '#C084FC',
  rose: '#FDA4AF',
  red: '#FCA5A5',

  // System
  success: '#22C55E',
  warning: '#FFB020',
  error: '#FF4D67',
  info: '#38BDF8',
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
