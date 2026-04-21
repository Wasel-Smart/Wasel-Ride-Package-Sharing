/**
 * Wasel page design tokens — clarity edition.
 * All service flows share identical typography, colour, and spacing.
 */
import { F, FA } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg: 'var(--ds-page, #0f1113)',
  card:
    'linear-gradient(180deg, color-mix(in srgb, var(--ds-surface-raised, #20242a) 68%, var(--ds-surface, #1a1d22)) 0%, var(--ds-surface, #1a1d22) 100%)',
  card2:
    'color-mix(in srgb, var(--ds-surface-soft, #262b32) 82%, var(--ds-surface, #1a1d22))',
  card3:
    'color-mix(in srgb, var(--ds-accent, #f59a2c) 10%, var(--ds-surface, #1a1d22))',
  panel:
    'color-mix(in srgb, var(--ds-surface-raised, #20242a) 78%, var(--ds-surface, #1a1d22))',
  field: 'var(--ds-surface-raised, #20242a)',

  border: 'var(--ds-border, #313841)',
  borderH:
    'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 32%, var(--ds-border, #313841))',

  cyan: 'var(--ds-accent, #f59a2c)',
  cyanG: 'color-mix(in srgb, var(--ds-accent, #f59a2c) 12%, transparent)',
  blue: 'var(--ds-accent-strong, #ffb357)',
  blueG: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 12%, transparent)',
  green: 'var(--ds-success, #79c67d)',
  greenG: 'color-mix(in srgb, var(--ds-success, #79c67d) 12%, transparent)',
  gold: 'var(--ds-warning, #efb45d)',
  goldG: 'color-mix(in srgb, var(--ds-warning, #efb45d) 12%, transparent)',
  red: 'var(--ds-danger, #ee705d)',
  navy: 'var(--ds-page, #0f1113)',

  text: 'var(--ds-text, #f5efe7)',
  sub: 'var(--ds-text-muted, #b9aea0)',
  muted: 'var(--ds-text-soft, #8b8277)',

  F,
  FA,
  FD: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",

  gradC:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-accent-strong, #ffb357) 86%, white 14%) 0%, var(--ds-accent-strong, #ffb357) 48%, var(--ds-accent, #f59a2c) 100%)',
  gradG:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-accent, #f59a2c) 92%, white 8%) 0%, var(--ds-accent, #f59a2c) 100%)',
  gradGld:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-warning, #efb45d) 84%, white 16%) 0%, var(--ds-warning, #efb45d) 100%)',
  gradGold:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-warning, #efb45d) 84%, white 16%) 0%, var(--ds-warning, #efb45d) 100%)',
  gradB:
    'linear-gradient(135deg, var(--ds-surface-raised, #20242a) 0%, var(--ds-page, #0f1113) 100%)',
  gradNav:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, var(--ds-page, #0f1113) 100%)',
  gradHero:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, color-mix(in srgb, var(--ds-surface, #1a1d22) 92%, var(--ds-accent-soft, #3f2a15) 8%) 54%, var(--ds-page, #0f1113) 100%)',
  glowC: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 24%, transparent)',
  glowT: 'color-mix(in srgb, var(--ds-accent, #f59a2c) 18%, transparent)',

  sectionHeadBg:
    'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted, #15181c) 88%, var(--ds-accent-soft, #3f2a15) 12%) 0%, color-mix(in srgb, var(--ds-surface, #1a1d22) 92%, var(--ds-accent-soft, #3f2a15) 8%) 54%, var(--ds-page, #0f1113) 100%)',
  cardGrad:
    'linear-gradient(180deg, color-mix(in srgb, var(--ds-accent-strong, #ffb357) 8%, var(--ds-surface-raised, #20242a)) 0%, color-mix(in srgb, var(--ds-accent, #f59a2c) 4%, var(--ds-surface, #1a1d22)) 100%)',

  shadowCard: 'var(--ds-shadow-md, 0 20px 44px rgb(0 0 0 / 0.24))',
  shadowMd: 'var(--ds-shadow-lg, 0 32px 72px rgb(0 0 0 / 0.34))',
  shadowTeal: 'var(--ds-shadow-md, 0 20px 44px rgb(0 0 0 / 0.24))',
} as const;

export const PAGE_RADIUS = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  full: 9999,
} as const;
