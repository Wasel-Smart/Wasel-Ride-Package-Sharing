/**
 * Wasel Design System - canonical import surface.
 *
 * New UI code should import tokens and primitives from here:
 *
 *   import {
 *     C,
 *     R,
 *     TYPE,
 *     WaselBadge,
 *     WaselButton,
 *     WaselCard,
 *     WaselDialog,
 *     WaselInput,
 *     WaselSelect,
 *   } from '@/design-system';
 *
 * `src/utils/wasel-ds.ts` owns the canonical token values. Older token modules
 * are re-exported only for compatibility while route screens migrate.
 */

// Token layer.
export * from '../tokens/wasel-tokens';

// Primary token source: C, R, TYPE, SPACE, SH, ANIM, and related helpers.
export * from '../utils/wasel-ds';

// Legacy extended constants.
export {
  WaselAnimations,
  WaselBreakpoints,
  WaselImages,
  WaselTypography,
  cardStyle,
  glassmorphism,
  glowEffect,
} from '../styles/wasel-design-system';

// Page-level theme shorthand.
export * from '../styles/wasel-page-theme';

// Auth utilities.
export { friendlyAuthError, pwStrength } from '../utils/authHelpers';

// Components.
export { WaselLogo } from '../components/wasel-ds/WaselLogo';
export { WaselBadge } from '../components/wasel-ui/WaselBadge';
export { WaselButton } from '../components/wasel-ui/WaselButton';
export { WaselInput } from '../components/wasel-ui/WaselInput';
export { WaselCard } from '../components/wasel-ui/WaselCard';
export { WaselDialog } from '../components/wasel-ui/WaselDialog';
export { WaselSelect } from '../components/wasel-ui/WaselSelect';
export type { WaselSelectOption } from '../components/wasel-ui/WaselSelect';
