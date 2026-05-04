import { C, F, FA, GRAD, GRAD_GOLD, GRAD_GREEN, GRAD_HERO, GRAD_NAVY } from '../utils/wasel-ds';

export const PAGE_DS = {
  bg: C.bg,
  card: C.cardSolid,
  card2: C.card2,
  border: C.border,
  borderH: C.borderHov,
  cyan: C.cyan,
  cyanG: C.cyanGlow,
  gold: C.gold,
  goldG: C.goldDim,
  green: C.green,
  greenG: C.greenDim,
  blue: C.blue,
  blueG: C.blueDim,
  red: C.error,
  navy: C.navy,
  text: C.text,
  sub: C.textSub,
  muted: C.textMuted,
  F,
  FA,
  gradC: GRAD,
  gradG: GRAD_GREEN,
  gradGld: GRAD_GOLD,
  gradGold: GRAD_GOLD,
  gradB: GRAD,
  gradNav: GRAD_NAVY,
  gradHero: GRAD_HERO,
} as const;

export const PAGE_RADIUS = { sm: 8, md: 10, lg: 12, xl: 16, xxl: 20, full: 9999 } as const;
