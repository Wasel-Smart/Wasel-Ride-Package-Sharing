/**
 * Wasel page design tokens — v10 unified investor-grade system.
 * Used by waselServiceShared, all feature pages, and shared components.
 */
import {
  F,
  FA,
  GRAD,
  GRAD_GOLD,
  GRAD_GREEN,
  GRAD_HERO,
  GRAD_NAVY,
  GRAD_SIGNAL,
} from '../utils/wasel-ds';

export const PAGE_DS = {
  /* ── Backgrounds ─────────────────────────────────── */
  bg:    'var(--wasel-surface-0)',
  card:  'var(--wasel-surface-2)',
  card2: 'var(--wasel-surface-3)',

  /* ── Borders ─────────────────────────────────────── */
  border:  'var(--wasel-panel-border)',
  borderH: 'var(--wasel-panel-border-hover)',

  /* ── Brand colours ───────────────────────────────── */
  cyan:   '#19e7bb',
  cyanG:  'rgba(25,231,187,0.22)',
  blue:   '#65e1ff',
  blueG:  'rgba(101,225,255,0.18)',
  green:  '#a2ffe7',
  greenG: 'rgba(162,255,231,0.16)',
  gold:   '#48cfff',
  goldG:  'rgba(72,207,255,0.16)',
  red:    '#ff5060',
  navy:   'var(--wasel-surface-0)',

  /* ── Copy ────────────────────────────────────────── */
  text:  'var(--wasel-copy-primary)',
  sub:   'var(--wasel-copy-muted)',
  muted: 'var(--wasel-copy-soft)',

  /* ── Fonts ───────────────────────────────────────── */
  F,
  FA,

  /* ── Gradients ───────────────────────────────────── */
  gradC:    GRAD,
  gradG:    GRAD_GREEN,
  gradGld:  GRAD_GOLD,
  gradGold: GRAD_GOLD,
  gradB:    GRAD_SIGNAL,
  gradNav:  GRAD_NAVY,
  gradHero: GRAD_HERO,

  /* ── Section head background ─────────────────────── */
  sectionHeadBg:
    'linear-gradient(180deg, rgba(10,20,34,0.96), rgba(7,14,26,0.93))',

  /* ── Card inner gradient ──────────────────────────── */
  cardGrad:
    'linear-gradient(152deg, rgba(12,20,34,0.98) 0%, rgba(7,13,24,0.97) 100%)',

  /* ── Shadows ─────────────────────────────────────── */
  shadowCard:  'var(--wasel-shadow-card)',
  shadowMd:    'var(--wasel-shadow-md)',
  shadowTeal:  'var(--wasel-shadow-teal)',
} as const;

export const PAGE_RADIUS = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  full: 9999,
} as const;
