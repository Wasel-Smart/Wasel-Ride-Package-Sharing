/**
 * WASEL | واصل — Design System Tokens v9.5
 * Single source of truth for all JS/TSX inline styles.
 * Perfectly aligned with brand-theme.css CSS variables.
 */

export const WaselColors = {
  /* Backgrounds */
  bg:         'var(--bg-primary)',
  surface:    'var(--surface-soft)',
  card:       'var(--wasel-service-card)',
  cardSolid:  'var(--surface-glass)',
  card2:      'var(--wasel-service-card-2)',

  /* Borders */
  border:     'var(--wasel-service-border)',
  borderHov:  'var(--wasel-service-border-strong)',
  borderGlow: 'rgb(var(--accent-secondary-rgb) / 0.28)',
  borderDark: 'color-mix(in srgb, var(--bg-primary) 72%, transparent)',

  /* Brand palette */
  cyan:       'var(--accent-secondary)',
  cyanBright: 'color-mix(in srgb, var(--accent-secondary) 72%, white)',
  cyanDark:   'var(--accent)',
  cyanDim:    'rgb(var(--accent-secondary-rgb) / 0.12)',
  cyanGlow:   'rgb(var(--accent-secondary-rgb) / 0.20)',
  teal:       'var(--accent)',
  blue:       'color-mix(in srgb, var(--accent-secondary) 72%, white)',
  blueDim:    'rgb(var(--accent-secondary-rgb) / 0.12)',
  green:      'var(--success)',
  greenDim:   'rgb(var(--success-rgb) / 0.12)',
  gold:       'var(--warning)',
  goldDim:    'rgb(var(--warning-rgb) / 0.12)',
  orange:     '#ff9d6c',
  navy:       'var(--bg-primary)',
  purple:     '#b4d7e8',
  purpleDim:  'rgba(180,215,232,0.12)',
  error:      'var(--danger)',
  errorDim:   'rgb(var(--danger-rgb) / 0.10)',
  amber:      'var(--warning)',
  amberDim:   'rgb(var(--warning-rgb) / 0.12)',

  /* Typography */
  text:       'var(--wasel-service-text)',
  textSub:    'var(--wasel-service-sub)',
  textMuted:  'var(--wasel-service-muted)',

  white:      'var(--bg-secondary)',
  black:      'var(--text-inverse)',
} as const;

export const WaselGradients = {
  primary: 'var(--wasel-app-button-primary)',
  cyan:    'var(--theme-gradient-primary)',
  teal:    'var(--theme-gradient-accent)',
  card:    'var(--wasel-service-card)',
  hero:    'var(--wasel-service-head-bg)',
  glow:    'radial-gradient(circle, rgb(var(--accent-secondary-rgb) / 0.20), transparent)',
  gold:    'var(--theme-gradient-primary)',
  green:   'var(--theme-gradient-accent)',
  navy:    'var(--wasel-service-bg)',
  signal:  'var(--wasel-app-button-primary)',
  hero2:   'var(--wasel-service-head-bg)',
} as const;

/* Backwards-compat aliases */
export const GRAD        = WaselGradients.primary;
export const GRAD_GOLD   = WaselGradients.gold;
export const GRAD_GREEN  = WaselGradients.green;
export const GRAD_NAVY   = WaselGradients.navy;
export const GRAD_SIGNAL = WaselGradients.signal;
export const GRAD_HERO   = WaselGradients.hero2;

export const WaselShadows = {
  sm:   'var(--wasel-shadow-sm)',
  md:   'var(--wasel-shadow-md)',
  lg:   'var(--wasel-shadow-lg)',
  xl:   'var(--wasel-shadow-xl)',
  glow: '0 18px 50px rgb(var(--accent-rgb) / 0.20)',
  blue: '0 18px 50px rgb(var(--accent-secondary-rgb) / 0.16)',
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
  background: `color-mix(in srgb, var(--surface-glass) ${Math.round(opacity * 100)}%, transparent)`,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: `1px solid ${WaselColors.border}`,
} as const);

/** Glow effect helper */
export const glowEffect = (color = WaselColors.cyan) => ({
  boxShadow: `0 18px 50px color-mix(in srgb, ${color} 22%, transparent)`,
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
