/**
 * Wasel Mobile — Design Token System
 * Single source of truth for all visual decisions.
 */

// ── Colour palette ──────────────────────────────────────────────────────────
export const C = {
  // Backgrounds
  bg:      '#0A1628',
  card:    '#0E1D35',
  card2:   '#112240',
  card3:   '#0C1A2E',
  overlay: 'rgba(10,22,40,0.92)',

  // Brand
  cyan:    '#00C8E8',
  cyanDim: 'rgba(0,200,232,0.15)',
  cyanBorder: 'rgba(0,200,232,0.30)',

  // Semantic
  green:   '#00C875',
  greenDim:'rgba(0,200,117,0.15)',
  gold:    '#F0A830',
  goldDim: 'rgba(240,168,48,0.15)',
  red:     '#FF4D6A',
  redDim:  'rgba(255,77,106,0.15)',
  purple:  '#A78BFA',
  purpleDim:'rgba(167,139,250,0.15)',

  // Text
  text:    '#EFF6FF',
  sub:     '#8AA4C0',
  muted:   '#5A7A9A',
  dim:     '#3A5470',

  // Borders
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)',
  border3: 'rgba(255,255,255,0.20)',
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────
export const S = {
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ── Border radius ──────────────────────────────────────────────────────────
export const R = {
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  pill: 100,
} as const;

// ── Typography ─────────────────────────────────────────────────────────────
export const T = {
  display: { fontSize: 28, fontWeight: '800' as const, color: C.text, letterSpacing: -0.5 },
  h1:      { fontSize: 24, fontWeight: '800' as const, color: C.text, letterSpacing: -0.3 },
  h2:      { fontSize: 20, fontWeight: '700' as const, color: C.text },
  h3:      { fontSize: 17, fontWeight: '700' as const, color: C.text },
  h4:      { fontSize: 15, fontWeight: '700' as const, color: C.text },
  body:    { fontSize: 14, fontWeight: '400' as const, color: C.text, lineHeight: 22 },
  bodyMd:  { fontSize: 14, fontWeight: '500' as const, color: C.text },
  small:   { fontSize: 12, fontWeight: '400' as const, color: C.sub,  lineHeight: 18 },
  smallBd: { fontSize: 12, fontWeight: '700' as const, color: C.sub },
  label:   { fontSize: 11, fontWeight: '700' as const, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  price:   { fontSize: 26, fontWeight: '800' as const, color: C.cyan  },
  priceSm: { fontSize: 18, fontWeight: '800' as const, color: C.cyan  },
} as const;

// ── Common component shapes ────────────────────────────────────────────────
export const card = {
  backgroundColor: C.card,
  borderRadius: R.lg,
  borderWidth: 1,
  borderColor: C.border,
} as const;

export const card2 = {
  backgroundColor: C.card2,
  borderRadius: R.lg,
  borderWidth: 1,
  borderColor: C.border,
} as const;

// ── Status colour map ──────────────────────────────────────────────────────
export type StatusKey =
  | 'pending' | 'pending_driver'
  | 'confirmed' | 'accepted' | 'active'
  | 'completed' | 'captured'
  | 'cancelled' | 'rejected' | 'failed'
  | 'in_progress';

export const STATUS_COLORS: Record<StatusKey, { bg: string; text: string; dot: string }> = {
  pending:        { bg: C.goldDim,   text: C.gold,  dot: C.gold  },
  pending_driver: { bg: C.goldDim,   text: C.gold,  dot: C.gold  },
  confirmed:      { bg: C.cyanDim,   text: C.cyan,  dot: C.cyan  },
  accepted:       { bg: C.cyanDim,   text: C.cyan,  dot: C.cyan  },
  active:         { bg: C.greenDim,  text: C.green, dot: C.green },
  in_progress:    { bg: C.greenDim,  text: C.green, dot: C.green },
  completed:      { bg: 'rgba(100,200,100,0.12)', text: '#5EC87A', dot: '#5EC87A' },
  captured:       { bg: 'rgba(100,200,100,0.12)', text: '#5EC87A', dot: '#5EC87A' },
  cancelled:      { bg: C.redDim,    text: C.red,   dot: C.red   },
  rejected:       { bg: C.redDim,    text: C.red,   dot: C.red   },
  failed:         { bg: C.redDim,    text: C.red,   dot: C.red   },
};
