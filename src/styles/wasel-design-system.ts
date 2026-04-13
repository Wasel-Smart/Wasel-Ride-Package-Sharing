/**
 * WASEL | واصل — Design System Tokens v9.5
 * Single source of truth for all JS/TSX inline styles.
 * Perfectly aligned with brand-theme.css CSS variables.
 */

export const WaselColors = {
  /* Backgrounds */
  bg:         '#050b1a',
  surface:    '#080f1e',
  card:       '#0c1628',
  cardSolid:  '#0b1627',
  card2:      '#111e32',

  /* Borders */
  border:     'rgba(25,231,187,0.13)',
  borderHov:  'rgba(25,231,187,0.28)',
  borderGlow: 'rgba(162,255,231,0.28)',
  borderDark: 'rgba(5,11,26,0.72)',

  /* Brand palette */
  cyan:       '#19e7bb',
  cyanBright: '#22ffce',
  cyanDark:   '#0bc3a0',
  cyanDim:    'rgba(25,231,187,0.12)',
  cyanGlow:   'rgba(25,231,187,0.20)',
  teal:       '#a2ffe7',
  blue:       '#65e1ff',
  blueDim:    'rgba(101,225,255,0.12)',
  green:      '#a2ffe7',
  greenDim:   'rgba(162,255,231,0.12)',
  gold:       '#48cfff',
  goldDim:    'rgba(72,207,255,0.12)',
  orange:     '#65e1ff',
  navy:       '#0d1e30',
  purple:     '#8ab4c4',
  purpleDim:  'rgba(138,180,196,0.12)',
  error:      '#ff5c63',
  errorDim:   'rgba(255,92,99,0.10)',
  amber:      '#f8ba3e',
  amberDim:   'rgba(248,186,62,0.12)',

  /* Typography */
  text:       '#e9f5f7',
  textSub:    'rgba(186,216,222,0.74)',
  textMuted:  'rgba(148,180,188,0.54)',

  white:      '#ffffff',
  black:      '#000000',
} as const;

export const WaselGradients = {
  primary: 'linear-gradient(135deg, #dcfff8 0%, #19e7bb 42%, #65e1ff 100%)',
  cyan:    'linear-gradient(135deg, #19e7bb, #65e1ff)',
  teal:    'linear-gradient(135deg, #19e7bb, #a2ffe7)',
  card:    'linear-gradient(180deg, rgba(220,255,248,0.055), rgba(220,255,248,0.018)), rgba(10,18,28,0.88)',
  hero:    'linear-gradient(180deg, rgba(4,18,30,0) 0%, #050b1a 100%)',
  glow:    'radial-gradient(circle, rgba(25,231,187,0.20), transparent)',
  gold:    'linear-gradient(135deg, #65e1ff, #a2ffe7)',
  green:   'linear-gradient(135deg, #19e7bb, #a2ffe7)',
  navy:    'linear-gradient(180deg, #080f1e, #050b1a)',
  signal:  'linear-gradient(135deg, #19e7bb 0%, #65e1ff 100%)',
  hero2:   'radial-gradient(ellipse at 50% 0%, rgba(25,231,187,0.16), transparent 55%), linear-gradient(160deg, #040816, #06101e 40%, #0d1a2e 70%, #050d1a 100%)',
} as const;

/* Backwards-compat aliases */
export const GRAD        = WaselGradients.primary;
export const GRAD_GOLD   = WaselGradients.gold;
export const GRAD_GREEN  = WaselGradients.green;
export const GRAD_NAVY   = WaselGradients.navy;
export const GRAD_SIGNAL = WaselGradients.signal;
export const GRAD_HERO   = WaselGradients.hero2;

export const WaselShadows = {
  sm:   '0 8px 20px rgba(0,0,0,0.30)',
  md:   '0 18px 48px rgba(0,0,0,0.40)',
  lg:   '0 32px 80px rgba(0,0,0,0.48)',
  xl:   '0 48px 110px rgba(0,0,0,0.56)',
  glow: '0 18px 50px rgba(25,231,187,0.20)',
  blue: '0 18px 50px rgba(101,225,255,0.16)',
} as const;

export const WaselImages = {
  hero:    'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  aqaba:   'https://images.unsplash.com/photo-1649195309743-b0b19c102c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  irbid:   'https://images.unsplash.com/photo-1638367915999-8d559b61bd43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  deadSea: 'https://images.unsplash.com/photo-1726001739725-cfd1902b2a2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  petra:   'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  wadiRum: 'https://images.unsplash.com/photo-1762255047146-a62d5426d6b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  carpool: 'https://images.unsplash.com/photo-1748882585283-1b71bbbec96b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  package: 'https://images.unsplash.com/photo-1606295835125-2338079fdfc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  mosque:  'https://images.unsplash.com/photo-1733063166469-d77a93d7266e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
} as const;

export const WaselTypography = {
  sans:    "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  display: "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)",
  arabic:  "var(--wasel-font-arabic, 'Cairo', 'Tajawal', 'Almarai', sans-serif)",
  h1: 'clamp(2.4rem, 5vw, 4rem)',
  h2: 'clamp(1.9rem, 4vw, 3rem)',
  h3: 'clamp(1.45rem, 3vw, 2rem)',
  h4: 'clamp(1.15rem, 2vw, 1.5rem)',
  body:  '1rem',
  small: '0.875rem',
  tiny:  '0.75rem',
} as const;

export const WaselSpacing = {
  xs:  '0.25rem',
  sm:  '0.5rem',
  md:  '1rem',
  lg:  '1.5rem',
  xl:  '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const WaselAnimations = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slideUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
  scale: { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 } },
  spring: { type: 'spring', stiffness: 320, damping: 28 },
  smooth: { duration: 0.26, ease: 'easeInOut' },
} as const;

export const WaselRadius = {
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  '2xl': '28px',
  full: '9999px',
} as const;

export const WaselBreakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
} as const;

/** Glass morphism helper */
export const glassmorphism = (opacity = 0.84) => ({
  background: `rgba(9,17,30,${opacity})`,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: `1px solid ${WaselColors.border}`,
} as const);

/** Glow effect helper */
export const glowEffect = (color = WaselColors.cyan) => ({
  boxShadow: `0 18px 50px ${color}38`,
} as const);

/** Standard card style */
export const cardStyle = () => ({
  background: WaselGradients.card,
  border: `1px solid ${WaselColors.border}`,
  borderRadius: WaselRadius.xl,
  boxShadow: WaselShadows.md,
} as const);

/* Shorthand aliases used across the app */
export const C = WaselColors;
export const F = WaselTypography.sans;
export const FA = WaselTypography.arabic;
