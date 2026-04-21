/**
 * Wasel page design tokens — clarity edition.
 * All service flows share identical typography, colour, and spacing.
 */
import { F, FA } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg: 'var(--wasel-shell-background, var(--background, #060D1A))',
  card:
    'var(--wasel-service-card, var(--wasel-panel-strong, rgba(10,18,28,0.84)))',
  card2:
    'var(--wasel-service-card-2, var(--wasel-panel-muted, rgba(220,255,248,0.055)))',
  card3:
    'var(--wasel-service-card-3, rgba(220,255,248,0.085))',
  panel:
    'var(--wasel-service-card-2, var(--wasel-panel-muted, rgba(220,255,248,0.055)))',
  field: 'var(--surface-field, rgba(8,15,26,0.94))',

  border:
    'var(--wasel-service-border, var(--wasel-panel-border, rgba(255,255,255,0.10)))',
  borderH:
    'var(--wasel-service-border-strong, var(--wasel-button-primary-border-strong, rgba(169,227,255,0.26)))',

  cyan: 'var(--primary, #A9E3FF)',
  cyanG: 'rgba(169,227,255,0.12)',
  blue: 'var(--accent-secondary, #7ECDF9)',
  blueG: 'rgba(126,205,249,0.12)',
  green: 'var(--success, #19E7BB)',
  greenG: 'rgba(25,231,187,0.12)',
  gold: 'var(--warning, #F8BA3E)',
  goldG: 'rgba(248,186,62,0.12)',
  red: 'var(--danger, #FF5060)',
  navy: '#060D1A',

  text:
    'var(--wasel-service-text, var(--wasel-copy-primary, var(--text-primary, #DCFFF8)))',
  sub:
    'var(--wasel-service-sub, var(--wasel-copy-secondary, var(--text-secondary, rgba(220,255,248,0.72))))',
  muted:
    'var(--wasel-service-muted, var(--wasel-copy-muted, var(--text-muted, rgba(220,255,248,0.48))))',

  F,
  FA,
  FD: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",

  gradC: 'var(--theme-gradient-primary, linear-gradient(135deg, #EEF8FF 0%, #D6EEFF 52%, #A9E3FF 100%))',
  gradG: 'var(--theme-gradient-signal, linear-gradient(135deg, #A9E3FF 0%, #7ECDF9 58%, #19E7BB 100%))',
  gradGld: 'linear-gradient(135deg, #F8BA3E 0%, #F4D57B 100%)',
  gradGold: 'linear-gradient(135deg, #F8BA3E 0%, #F4D57B 100%)',
  gradB: 'linear-gradient(135deg, rgba(8,15,26,0.98) 0%, rgba(11,21,37,0.98) 100%)',
  gradNav: 'linear-gradient(135deg, rgba(6,13,26,0.98) 0%, rgba(11,21,37,0.98) 52%, rgba(16,31,49,0.98) 100%)',
  gradHero: 'var(--wasel-service-head-bg, var(--service-head-background))',
  glowC: 'rgba(169,227,255,0.2)',
  glowT: 'rgba(25,231,187,0.16)',

  sectionHeadBg: 'var(--wasel-service-head-bg, var(--service-head-background))',
  cardGrad: 'linear-gradient(180deg, rgba(220,255,248,0.06) 0%, rgba(220,255,248,0.02) 100%)',

  shadowCard: 'var(--wasel-shadow-card, 0 8px 28px rgba(0,0,0,0.38))',
  shadowMd: 'var(--wasel-shadow-md, 0 16px 48px rgba(0,0,0,0.44))',
  shadowTeal: 'var(--wasel-shadow-teal, 0 18px 44px rgba(169,227,255,0.22))',
} as const;

export const PAGE_RADIUS = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  full: 9999,
} as const;
