/**
 * Wasel page design tokens — clarity edition.
 * All service flows share identical typography, colour, and spacing.
 */
import { F, FA } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg: 'var(--ds-page, #0f1113)',
  card: 'var(--wasel-panel-strong)',
  card2: 'rgba(255, 255, 255, 0.03)',
  card3: 'rgba(245, 154, 44, 0.12)',
  panel: 'var(--wasel-panel-strong)',
  field: 'var(--ds-surface-raised, #20242a)',

  border: 'var(--ds-border, #313841)',
  borderH: 'rgba(245, 154, 44, 0.30)',

  cyan: 'var(--ds-accent, #f59a2c)',
  cyanG: 'rgba(245, 154, 44, 0.12)',
  blue: '#47b7e6',
  blueG: 'rgba(71, 183, 230, 0.12)',
  green: 'var(--ds-success, #79c67d)',
  greenG: 'rgba(121, 198, 125, 0.12)',
  gold: 'var(--ds-warning, #efb45d)',
  goldG: 'rgba(239, 180, 93, 0.12)',
  red: 'var(--ds-danger, #ee705d)',
  navy: 'var(--ds-page, #0f1113)',

  text: 'var(--ds-text, #f5efe7)',
  sub: 'var(--ds-text-muted, #b9aea0)',
  muted: 'var(--ds-text-soft, #8b8277)',

  F,
  FA,
  FD: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",

  gradC: 'linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)',
  gradG: 'linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)',
  gradGld: 'linear-gradient(135deg, #f59a2c 0%, #ffb357 100%)',
  gradGold: 'linear-gradient(135deg, #f59a2c 0%, #ffb357 100%)',
  gradB: 'linear-gradient(135deg, var(--ds-surface-raised, #20242a) 0%, var(--ds-page, #0f1113) 100%)',
  gradNav: 'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, var(--ds-page, #0f1113) 100%)',
  gradHero: 'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, color-mix(in srgb, var(--ds-surface, #1a1d22) 92%, var(--ds-accent-soft, #3f2a15) 8%) 54%, var(--ds-page, #0f1113) 100%)',
  glowC: 'rgba(245, 154, 44, 0.24)',
  glowT: 'rgba(245, 154, 44, 0.18)',

  sectionHeadBg: 'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, color-mix(in srgb, var(--ds-surface, #1a1d22) 92%, var(--ds-accent-soft, #3f2a15) 8%) 54%, var(--ds-page, #0f1113) 100%)',
  cardGrad: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))',

  shadowCard: 'var(--wasel-shadow-lg, 0 18px 36px rgba(1,10,18,0.18))',
  shadowMd: 'var(--wasel-shadow-lg, 0 18px 36px rgba(1,10,18,0.18))',
  shadowTeal: 'var(--wasel-shadow-lg, 0 18px 36px rgba(1,10,18,0.18))',
} as const;

export const PAGE_RADIUS = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  full: 9999,
} as const;
