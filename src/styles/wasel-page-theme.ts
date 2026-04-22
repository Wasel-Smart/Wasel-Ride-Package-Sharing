/**
 * Shared page adapter for older service surfaces.
 * Keep this mapping aligned with the canonical Wasel CSS variable contract.
 */
import { F, FA } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg: 'var(--ds-page)',
  card: 'var(--wasel-panel-strong)',
  card2: 'var(--wasel-service-card-2)',
  card3: 'var(--wasel-service-card-3)',
  panel: 'var(--wasel-panel-strong)',
  field: 'var(--surface-field)',

  border: 'var(--ds-border)',
  borderH: 'var(--wasel-button-primary-border-strong)',

  cyan: 'var(--ds-accent)',
  cyanG: 'color-mix(in srgb, var(--ds-accent) 12%, transparent)',
  blue: 'var(--ds-accent-strong)',
  blueG: 'color-mix(in srgb, var(--ds-accent-strong) 12%, transparent)',
  green: 'var(--ds-accent-strong)',
  greenG: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
  gold: 'var(--ds-accent-strong)',
  goldG: 'color-mix(in srgb, var(--ds-accent-strong) 12%, transparent)',
  red: 'var(--wasel-brand-hover)',
  navy: 'var(--ds-page)',

  text: 'var(--ds-text)',
  sub: 'var(--ds-text-muted)',
  muted: 'var(--ds-text-soft)',

  F,
  FA,
  FD: "var(--wasel-font-display, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)",

  gradC: 'var(--theme-gradient-primary)',
  gradG: 'var(--theme-gradient-primary)',
  gradGld: 'var(--theme-gradient-primary)',
  gradGold: 'var(--theme-gradient-primary)',
  gradB: 'linear-gradient(135deg, var(--ds-surface-raised) 0%, var(--ds-page) 100%)',
  gradNav: 'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted) 88%, var(--ds-accent-soft) 12%) 0%, var(--ds-page) 100%)',
  gradHero: 'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted) 88%, var(--ds-accent-soft) 12%) 0%, color-mix(in srgb, var(--ds-surface) 94%, var(--ds-accent-soft) 6%) 52%, var(--ds-page) 100%)',
  glowC: 'color-mix(in srgb, var(--ds-accent-strong) 26%, transparent)',
  glowT: 'color-mix(in srgb, var(--ds-accent) 18%, transparent)',

  sectionHeadBg: 'var(--wasel-service-head-bg)',
  cardGrad: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',

  shadowCard: 'var(--wasel-shadow-lg)',
  shadowMd: 'var(--wasel-shadow-md)',
  shadowTeal: 'var(--wasel-shadow-teal)',
} as const;

export const PAGE_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
} as const;
