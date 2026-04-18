/**
 * Wasel page design tokens — clarity edition.
 * All service flows share identical typography, colour, and spacing.
 */
import { F, FA } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg:    'var(--wasel-service-bg, var(--service-background, #F8FAFC))',
  card:  'var(--wasel-service-card, var(--service-card, #FFFFFF))',
  card2: 'var(--wasel-service-card-2, var(--service-card-muted, #F8FAFC))',
  card3: 'var(--wasel-service-card-3, var(--service-card-strong, #F1F5F9))',
  panel: 'var(--wasel-service-card-2, #F8FAFC)',
  field: '#FFFFFF',

  border:  'var(--wasel-service-border, var(--border, #E2E8F0))',
  borderH: 'var(--wasel-service-border-strong, var(--border-strong, #CBD5E1))',

  cyan:   'var(--primary, #3A7CA5)',
  cyanG:  'rgba(58, 124, 165, 0.08)',
  blue:   'var(--accent-secondary, #5B9BD5)',
  blueG:  'rgba(91, 155, 213, 0.08)',
  green:  'var(--success, #22C55E)',
  greenG: 'rgba(34, 197, 94, 0.10)',
  gold:   'var(--warning, #F59E0B)',
  goldG:  'rgba(245, 158, 11, 0.10)',
  red:    'var(--danger, #EF4444)',
  navy:   '#0F172A',

  text:  'var(--wasel-service-text, var(--service-text-primary, var(--text-primary, #0F172A)))',
  sub:   'var(--wasel-service-sub, var(--service-text-secondary, var(--text-secondary, #475569)))',
  muted: 'var(--wasel-service-muted, var(--service-text-muted, var(--text-muted, #64748B)))',

  F,
  FA,
  FD: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",

  gradC:    'linear-gradient(135deg, #22c2aa 0%, #3A7CA5 100%)',
  gradG:    'linear-gradient(135deg, #3A7CA5 0%, #5B9BD5 100%)',
  gradGld:  'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)',
  gradGold: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)',
  gradB:    'linear-gradient(135deg, #1E3A5F 0%, #3A7CA5 100%)',
  gradNav:  'linear-gradient(135deg, #1E3A5F 0%, #2D5A8E 54%, #3A7CA5 100%)',
  gradHero: 'var(--wasel-service-head-bg, var(--service-head-background))',
  glowC:    'rgba(58, 124, 165, 0.16)',
  glowT:    'rgba(91, 155, 213, 0.14)',

  sectionHeadBg: 'var(--wasel-service-head-bg, var(--service-head-background))',
  cardGrad:      '#FFFFFF',

  shadowCard: 'var(--wasel-shadow-card, 0 4px 12px rgba(15,23,42,0.06))',
  shadowMd:   'var(--wasel-shadow-md, 0 4px 12px rgba(15,23,42,0.08))',
  shadowTeal: 'var(--wasel-shadow-teal, 0 8px 24px rgba(58,124,165,0.18))',
} as const;

export const PAGE_RADIUS = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  full: 9999,
} as const;
