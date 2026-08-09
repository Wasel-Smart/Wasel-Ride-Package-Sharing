/**
 * Design tokens re-exported from the canonical wasel-ds source.
 * WaselMap and other components import from here.
 */
import { C, TYPE, R, SH, GRAD } from '../utils/wasel-ds';

export const colors = {
  background: {
    dark: C.bg,
    panel: C.card,
    glass: C.glass,
    light: C.elevated,
    input: C.bgAlt,
    overlay: C.overlay,
  },
  text: {
    light: C.text,
    primary: C.textSub,
    secondary: C.textMuted,
    muted: C.textDim,
    dark: C.bg,
    brandMuted: C.cyanDim,
  },
  border: {
    primary: C.border,
    secondary: C.borderHov,
    light: C.borderFaint,
    active: C.cyanGlow,
    activeLight: C.cyan,
  },
  primary: {
    brand: C.cyan,
    brandLight: C.cyanDark,
  },
  secondary: {
    green: C.green,
    orange: C.orange,
  },
  status: {
    error: C.error,
    warning: C.warning,
    success: C.success,
  },
} as const;

export const typography = {
  font: {
    body: "'Plus Jakarta Sans', 'Cairo', 'Tajawal', 'Inter', sans-serif",
  },
  size: {
    xs: TYPE.size.xs,
    sm: TYPE.size.sm,
    base: TYPE.size.base,
  },
  weight: {
    extrabold: TYPE.weight.bold,
  },
} as const;

export const radii = {
  lg: R.lg,
  xl: R.xl,
  '2xl': R.xxl,
} as const;

export const shadows = {
  md: SH.md,
  lg: SH.lg,
  xl: SH.xl,
  active: SH.blue,
  activeLg: SH.blueL,
} as const;

export const effects = {
  backdropFilter: 'blur(16px)',
  backdropFilterLg: 'blur(24px)',
} as const;

export const gradients = {
  primary: GRAD,
  primaryActive: 'linear-gradient(135deg, #38beff 0%, #34d8a7 100%)',
} as const;
