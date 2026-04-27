/**
 * Wasel Unified Design System Tokens
 * Production-grade design system for dark/light modes
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* ═══════════════════════════════════════════════════════════════
   COLOR SYSTEM - DUAL MODE
   ═══════════════════════════════════════════════════════════════ */

export const DARK = {
  bgPrimary: '#0B0B0C',
  bgSecondary: '#141416',
  bgTertiary: '#1F1A17',
  bgElevated: '#2A241F',
  accent: '#F59E0B',
  accentSoft: '#FBBF24',
  accentStrong: '#D97706',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.48)',
  border: 'rgba(255,255,255,0.10)',
  borderHover: 'rgba(255,255,255,0.18)',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export const LIGHT = {
  bgPrimary: '#F6F3EE',
  bgSecondary: '#ECE7DF',
  bgTertiary: '#E2DBD1',
  bgElevated: '#D6CEC3',
  accent: '#F59E0B',
  accentSoft: '#FBBF24',
  accentStrong: '#D97706',
  textPrimary: 'rgba(20,20,20,0.92)',
  textSecondary: 'rgba(20,20,20,0.65)',
  textMuted: 'rgba(20,20,20,0.48)',
  border: 'rgba(20,20,20,0.10)',
  borderHover: 'rgba(20,20,20,0.18)',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
} as const;

/* ═══════════════════════════════════════════════════════════════
   TYPOGRAPHY SYSTEM
   ═══════════════════════════════════════════════════════════════ */

export const FONT = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  arabic: "'Cairo', 'Tajawal', sans-serif",
  mono: "'JetBrains Mono', 'Fira Mono', monospace",
} as const;

export const TYPE = {
  size: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

/* ═══════════════════════════════════════════════════════════════
   SPACING SYSTEM (8px grid)
   ═══════════════════════════════════════════════════════════════ */

export const SPACE = {
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
} as const;

/* ═══════════════════════════════════════════════════════════════
   BORDER RADIUS
   ═══════════════════════════════════════════════════════════════ */

export const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '14px',
  xl: '16px',
  full: '9999px',
} as const;

/* ═══════════════════════════════════════════════════════════════
   SHADOWS (minimal usage)
   ═══════════════════════════════════════════════════════════════ */

export const SHADOW = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.10)',
} as const;

/* ═══════════════════════════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════════════════════════ */

export const TRANSITION = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

/* ═══════════════════════════════════════════════════════════════
   BREAKPOINTS
   ═══════════════════════════════════════════════════════════════ */

export const BREAKPOINT = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

/* ═══════════════════════════════════════════════════════════════
   UTILITY FUNCTION
   ═══════════════════════════════════════════════════════════════ */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT STYLES
   ═══════════════════════════════════════════════════════════════ */

export const COMPONENT = {
  card: {
    base: {
      borderRadius: RADIUS.lg,
      border: '1px solid',
      padding: SPACE[4],
    },
    button: {
      padding: `${SPACE[2]} ${SPACE[4]}`,
      borderRadius: RADIUS.full,
      fontSize: TYPE.size.sm,
      fontWeight: TYPE.weight.semibold,
    },
  },
  input: {
    height: '44px',
    padding: `${SPACE[2]} ${SPACE[3]}`,
    borderRadius: RADIUS.md,
    fontSize: TYPE.size.base,
  },
  page: {
    padding: SPACE[4],
    maxWidth: '600px',
    margin: '0 auto',
  },
} as const;
