/**
 * Wasel Design System — Single Source of Truth v2
 *
 * Import everything from here:
 *
 *   import { C, R, TYPE, WaselButton, WaselInput, WaselCard, WaselBadge } from '@/design-system';
 */

// ── Token layer ───────────────────────────────────────────────────────────────
export * from '../tokens/wasel-tokens';

// ── Primary token source (C, R, TYPE, SPACE, SH, ANIM, etc.) ─────────────────
// wasel-ds.ts is the canonical token file. wasel-design-system.ts re-exports
// a subset for legacy consumers — both are kept for compat.
export * from '../utils/wasel-ds';

// ── Extended colour / typography / spacing constants ─────────────────────────
// (WaselColors, WaselTypography, WaselSpacing, WaselRadius, WaselAnimations …)
export {
  WaselAnimations,
  WaselBreakpoints,
  WaselImages,
  WaselTypography,
  cardStyle,
  glassmorphism,
  glowEffect,
} from '../styles/wasel-design-system';

// ── Page-level theme shorthand ───────────────────────────────────────────────
export * from '../styles/wasel-page-theme';

// ── Auth utilities (friendlyAuthError, pwStrength) ───────────────────────────
export { friendlyAuthError, pwStrength } from '../utils/authHelpers';

// ── Components ────────────────────────────────────────────────────────────────
export { WaselLogo }   from '../components/wasel-ds/WaselLogo';
export { WaselBadge }  from '../components/wasel-ui/WaselBadge';
export { WaselButton } from '../components/wasel-ui/WaselButton';
export { WaselInput }  from '../components/wasel-ui/WaselInput';
export { WaselCard }   from '../components/wasel-ui/WaselCard';
