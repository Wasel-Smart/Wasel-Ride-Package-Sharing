/**
 * Wasel page design tokens.
 * Scoped for the /app experience so service flows inherit the landing palette
 * while keeping a darker operational surface inside the shell.
 */
import { F, FA, GRAD_NAVY } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg: 'var(--wasel-service-bg)',
  card: 'var(--wasel-service-card)',
  card2: 'var(--wasel-service-card-2)',
  card3: 'var(--wasel-service-card-3)',
  panel: 'var(--wasel-app-nav-surface)',
  field: 'var(--surface-field)',

  border: 'var(--wasel-service-border)',
  borderH: 'var(--wasel-service-border-strong)',

  cyan: 'var(--accent-secondary)',
  cyanG: 'rgb(var(--accent-secondary-rgb) / 0.18)',
  blue: 'var(--accent)',
  blueG: 'rgb(var(--accent-rgb) / 0.18)',
  green: 'var(--success)',
  greenG: 'rgb(var(--success-rgb) / 0.16)',
  gold: 'var(--warning)',
  goldG: 'rgb(var(--warning-rgb) / 0.16)',
  red: 'var(--danger)',
  navy: 'var(--wasel-app-hero)',

  text: 'var(--wasel-service-text)',
  sub: 'var(--wasel-service-sub)',
  muted: 'var(--wasel-service-muted)',

  F,
  FA,
  FD: "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)",

  gradC: 'var(--theme-gradient-primary)',
  gradG: 'var(--theme-gradient-accent)',
  gradGld: 'var(--theme-gradient-accent)',
  gradGold: 'var(--theme-gradient-accent)',
  gradB: 'var(--theme-gradient-primary)',
  gradNav: GRAD_NAVY,
  gradHero: 'var(--wasel-service-head-bg)',
  glowC: 'rgb(var(--accent-secondary-rgb) / 0.24)',
  glowT: 'rgb(var(--accent-rgb) / 0.22)',

  sectionHeadBg: 'var(--wasel-service-head-bg)',
  cardGrad: 'var(--wasel-service-card)',

  shadowCard: 'var(--wasel-shadow-card)',
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
