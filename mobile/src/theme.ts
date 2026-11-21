/**
 * Wasel Mobile Theme
 *
 * Colors, spacing, radii, typography and motion are sourced from the shared
 * token file (packages/shared/src/tokens.ts) so web and mobile stay in sync.
 * This file adds mobile-only utilities: shadows, hitSlop, MIN_TOUCH and the
 * readableTextOn() contrast helper.
 *
 * Brand rule: ONE hero color (cyan) for actions + ONE support color (green)
 * for success/route/"go" meaning. Every other hue is semantic only.
 */

import {
  BRAND,
  DARK_COLORS,
  LIGHT_COLORS,
  MOTION,
  RADII,
  SPACING,
  TYPOGRAPHY,
  type WaselColors,
} from '../../packages/shared/src/tokens';

// Re-export shared tokens so existing imports from '../theme' keep working.
export { BRAND, DARK_COLORS, LIGHT_COLORS, MOTION, RADII, SPACING, TYPOGRAPHY };
export type { WaselColors };

// Default export shape (dark mode) — preserved for all existing call sites
// that do `import { colors, spacing, ... } from '../theme'`.
export const colors = DARK_COLORS;
export const spacing = SPACING;
export const radii = RADII;
export const typography = TYPOGRAPHY;
export const motion = MOTION;

// ── Mobile-only shadows ───────────────────────────────────────────────────────
// Brand rule: soft navy shadows, never heavy black.

export const shadows = {
  card: {
    shadowColor: '#081D39',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 3,
  },
  lift: {
    shadowColor: '#081D39',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

// ── Touch & accessibility constants ──────────────────────────────────────────

export const hitSlop = { top: 10, right: 10, bottom: 10, left: 10 } as const;

/** Minimum comfortable touch target (WCAG 2.5.5 / Material 48dp). */
export const MIN_TOUCH = 48;

// ── Contrast utility ──────────────────────────────────────────────────────────

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Returns the more legible of dark ink / white for text drawn on `background`.
 * Only understands 6-digit hex; anything else falls back to onPrimary (safe
 * choice for translucent brand fills).
 */
export function readableTextOn(background: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(background);
  if (!match) return DARK_COLORS.onPrimary;
  const n = parseInt(match[1] as string, 16);
  const luminance =
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255);
  const contrastWithInk = (luminance + 0.05) / (0.0074 + 0.05);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithInk >= contrastWithWhite ? DARK_COLORS.onPrimary : '#FFFFFF';
}
