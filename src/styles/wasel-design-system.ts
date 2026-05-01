import { C, F, GRAD, GRAD_GOLD, GRAD_GREEN, R, SH } from '../utils/wasel-ds';

export const WaselColors = {
  bg: C.bg,
  surface: C.bgAlt,
  card: C.cardSolid,
  card2: C.card2,
  border: C.border,
  border2: C.borderHov,
  borderGlow: C.cyanGlow,
  borderDark: C.borderFaint,
  cyan: C.cyan,
  cyanDark: C.cyanDark,
  cyanDim: C.cyanDim,
  cyanGlow: C.cyanGlow,
  teal: C.cyan,
  gold: C.gold,
  goldDim: C.goldDim,
  orange: C.orange,
  bronze: C.blue,
  green: C.green,
  greenDim: C.greenDim,
  purple: C.purple,
  purpleDim: C.purpleDim,
  red: C.error,
  redDim: C.errorDim,
  text: C.text,
  textDim: C.textMuted,
  muted: C.textDim,
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const WaselGradients = {
  primary: GRAD,
  cyan: GRAD,
  card: 'linear-gradient(180deg, rgba(247,241,232,0.05), rgba(247,241,232,0.02))',
  hero: `linear-gradient(to bottom, transparent, ${C.bg})`,
  glow: 'radial-gradient(circle, rgba(244,239,232,0.18), transparent)',
  gold: GRAD_GOLD,
  orange: `linear-gradient(135deg, ${C.orange}, ${C.gold})`,
  green: GRAD_GREEN,
  purple: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
} as const;

export const WaselShadows = {
  sm: SH.sm,
  md: SH.card,
  lg: SH.md,
  xl: SH.lg,
  glow: SH.cyan,
} as const;

export const WaselImages = {
  hero: 'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  aqaba: 'https://images.unsplash.com/photo-1649195309743-b0b19c102c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  irbid: 'https://images.unsplash.com/photo-1638367915999-8d559b61bd43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  deadSea: 'https://images.unsplash.com/photo-1726001739725-cfd1902b2a2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  petra: 'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  wadiRum: 'https://images.unsplash.com/photo-1762255047146-a62d5426d6b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  carpool: 'https://images.unsplash.com/photo-1748882585283-1b71bbbec96b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  package: 'https://images.unsplash.com/photo-1606295835125-2338079fdfc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  mosque: 'https://images.unsplash.com/photo-1733063166469-d77a93d7266e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
} as const;

export const WaselTypography = {
  sans: F,
  arabic: "'Cairo', 'Tajawal', sans-serif",
  h1: 'clamp(2.5rem, 5vw, 4rem)',
  h2: 'clamp(2rem, 4vw, 3rem)',
  h3: 'clamp(1.5rem, 3vw, 2rem)',
  h4: 'clamp(1.25rem, 2vw, 1.5rem)',
  body: '1rem',
  small: '0.875rem',
  tiny: '0.75rem',
} as const;

export const WaselSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const WaselAnimations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  smooth: { duration: 0.3, ease: 'easeInOut' },
} as const;

export const WaselRadius = {
  sm: R.sm,
  md: R.lg,
  lg: R.xl,
  xl: R.xxl,
  '2xl': R['3xl'],
  full: R.full,
} as const;

export const WaselBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const glassmorphism = (opacity = 0.8) => ({
  background: `rgba(24,28,34,${opacity})`,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${WaselColors.border}`,
});

export const glowEffect = (color = WaselColors.gold) => ({
  boxShadow: `0 0 40px ${color}40`,
});

export const cardStyle = () => ({
  background: WaselGradients.card,
  border: `1px solid ${WaselColors.border}`,
  borderRadius: WaselRadius.xl,
});
