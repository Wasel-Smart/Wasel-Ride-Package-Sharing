/**
 * Wasel Design-System Tokens — Shared Source of Truth
 *
 * Platform-neutral (no CSS, no DOM, no React Native APIs).
 * Both web (`src/utils/wasel-ds.ts`) and mobile (`mobile/src/theme.ts`)
 * derive from this file so colors, spacing, radii, motion and typography
 * stay in sync automatically.
 *
 * Brand palette (docs/BRAND_GUIDELINES.md):
 *   Ink    #081D39  |  Cyan   #00E5FF  |  Green  #72C70D  |  Orange #FF8A0B
 */

// ── Brand primitives ──────────────────────────────────────────────────────────

export const BRAND = {
  ink: '#081D39',
  cyan: '#00E5FF',
  green: '#72C70D',
  orange: '#FF8A0B',
  gold: '#FFBE5C',
  teal: '#66E0FF',
  lime: '#9AF1CF',
} as const;

// ── Dark-mode colors (default) ────────────────────────────────────────────────

export const DARK_COLORS = {
  bg: '#081D39',
  bgAlt: '#0a1f3a',
  surface: '#0e2240',
  surfaceElevated: '#132b4d',
  surfaceAlt: '#132b4d',
  surfaceMuted: '#0e2240',
  primary: BRAND.cyan,
  secondary: BRAND.green,
  onPrimary: '#04152B',
  textPrimary: '#F8FBFF',
  textSecondary: 'rgba(248,251,255,0.86)',
  textMuted: 'rgba(196,220,238,0.68)',
  textDim: 'rgba(149,178,201,0.76)',
  ink: '#F8FBFF',
  text: '#F8FBFF',
  muted: 'rgba(196,220,238,0.68)',
  line: 'rgba(0,229,255,0.16)',
  lineStrong: 'rgba(0,229,255,0.28)',
  lineInput: 'rgba(0,229,255,0.5)',
  success: BRAND.green,
  warning: BRAND.orange,
  error: '#FF7C8B',
  info: BRAND.cyan,
  cyan: BRAND.cyan,
  teal: BRAND.teal,
  green: BRAND.green,
  gold: BRAND.gold,
  amber: BRAND.orange,
  orange: BRAND.orange,
  blue: BRAND.cyan,
  lilac: '#8FA6FF',
  rose: '#FF7C8B',
  red: '#FF7C8B',
  navy: '#081D39',
  charcoal: '#E2E8F0',
  overlay: 'rgba(4,10,18,0.8)',
} as const;

// ── Light-mode colors ─────────────────────────────────────────────────────────
// Cyan (#00E5FF) is illegible on white (1.4:1 contrast); light mode uses the
// WCAG-compliant deep cyan #0369a1 — matching web globals.css --wasel-primary-light.

export const LIGHT_COLORS = {
  bg: '#f5fbff',
  bgAlt: '#eaf7ff',
  surface: '#ffffff',
  surfaceElevated: '#eef8ff',
  surfaceAlt: '#eaf7ff',
  surfaceMuted: '#ffffff',
  primary: '#0369a1',
  secondary: '#3f6e06',
  onPrimary: '#ffffff',
  textPrimary: '#081523',
  textSecondary: '#35556d',
  textMuted: '#5d7d96',
  textDim: '#8fa3b5',
  ink: '#081523',
  text: '#081523',
  muted: '#5d7d96',
  line: 'rgba(8,29,57,0.14)',
  lineStrong: 'rgba(8,29,57,0.22)',
  lineInput: 'rgba(8,29,57,0.35)',
  success: '#3f6e06',
  warning: '#a24d00',
  error: '#b4142c',
  info: '#035a8a',
  cyan: '#035a8a',
  teal: '#035a8a',
  green: '#3f6e06',
  gold: '#a24d00',
  amber: '#a24d00',
  orange: '#a24d00',
  blue: '#0369a1',
  lilac: '#4a3fa5',
  rose: '#b4142c',
  red: '#b4142c',
  navy: '#f5fbff',
  charcoal: '#1e293b',
  overlay: 'rgba(6,15,30,0.45)',
} as const;

export type WaselColors = typeof DARK_COLORS;

// ── Spacing (numbers — React Native dp; multiply by 1 for CSS px) ─────────────

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

// ── Radii (numbers) ───────────────────────────────────────────────────────────

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  display: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  heading:  { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  title:    { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  lead:     { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.25 },
  subtitle: { fontSize: 18, fontWeight: '600' as const },
  body:     { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption:  { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  micro:    { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  button:   { fontSize: 16, fontWeight: '700' as const },
  label:    { fontSize: 13, fontWeight: '700' as const },
} as const;

// ── Motion — BRAND_GUIDELINES.md: 150 / 200 / 280 ms only ────────────────────

export const MOTION = {
  fast: 150,
  standard: 200,
  slow: 280,
} as const;
