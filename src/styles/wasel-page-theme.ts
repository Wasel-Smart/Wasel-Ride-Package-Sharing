import { C, F, FA, GRAD, GRAD_GOLD, GRAD_GREEN, GRAD_HERO, GRAD_NAVY, R } from '../utils/wasel-ds';

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

// Radius scale now aliases the single wasel-ds source of truth (R) so that
// service pages (Find Ride, Offer Ride, Bus, Packages, Driver) render the
// exact same corner geometry as the rest of the app (Wallet, Trust Center,
// Settings, etc.), which use WaselPagePrimitives / R directly. Previously
// this scale hardcoded its own values (e.g. xl: 16) that drifted from R.xl
// (18px), producing a visible 2px inconsistency between page clusters.
export const PAGE_RADIUS = {
  sm: Number.parseInt(R.sm, 10),
  md: Number.parseInt(R.md, 10),
  lg: Number.parseInt(R.lg, 10),
  xl: Number.parseInt(R.xl, 10),
  xxl: Number.parseInt(R.xxl, 10),
  full: 9999,
} as const;
