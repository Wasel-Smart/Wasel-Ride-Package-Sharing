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
  field: 'rgba(255,255,255,0.08)',

  border: 'var(--wasel-service-border)',
  borderH: 'var(--wasel-service-border-strong)',

  cyan: 'var(--wasel-app-blue)',
  cyanG: 'rgba(15,115,255,0.18)',
  blue: 'var(--wasel-app-teal)',
  blueG: 'rgba(25,231,187,0.18)',
  green: 'var(--wasel-app-teal)',
  greenG: 'rgba(25,231,187,0.16)',
  gold: 'var(--wasel-app-sky)',
  goldG: 'rgba(157,232,255,0.18)',
  red: '#ff5060',
  navy: 'var(--wasel-app-hero)',

  text: 'var(--wasel-service-text)',
  sub: 'var(--wasel-service-sub)',
  muted: 'var(--wasel-service-muted)',

  F,
  FA,
  FD: "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)",

  gradC: 'linear-gradient(135deg, #0f73ff 0%, #2d9cff 48%, #19e7bb 100%)',
  gradG: 'linear-gradient(135deg, #19e7bb 0%, #9de8ff 100%)',
  gradGld: 'linear-gradient(135deg, #9de8ff 0%, #19e7bb 100%)',
  gradGold: 'linear-gradient(135deg, #9de8ff 0%, #19e7bb 100%)',
  gradB: 'linear-gradient(135deg, #0f73ff 0%, #9de8ff 48%, #19e7bb 100%)',
  gradNav: GRAD_NAVY,
  gradHero: 'var(--wasel-service-head-bg)',
  glowC: 'rgba(101,225,255,0.24)',
  glowT: 'rgba(25,231,187,0.22)',

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
