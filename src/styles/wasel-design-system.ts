/**
 * WASEL | واصل — Design System v7.0  "Investor Edition"
 * Presentation-layer tokens. All values aligned to brand-theme.css v7.
 * Used by wallet, notifications, older UI modules and inline-style components.
 */

export const WaselColors = {
  /* ── Backgrounds ─────────────────────────────────────── */
  bg:        '#040c1a',
  surface0:  '#040c1a',
  surface1:  '#081422',
  surface2:  '#0d1b2f',
  surface3:  '#13223a',
  surface4:  '#1a2d47',
  surface5:  '#223755',
  card:      '#09132a',
  card2:     '#0d1b2f',

  /* ── Borders ─────────────────────────────────────────── */
  border:      'rgba(25,231,187,0.14)',
  borderStrong:'rgba(25,231,187,0.28)',
  borderGlow:  'rgba(25,231,187,0.44)',
  borderDark:  'rgba(4,10,22,0.80)',

  /* ── Brand palette ───────────────────────────────────── */
  cyan:        '#19e7bb',
  cyanDark:    '#0bc3a0',
  cyanDim:     'rgba(25,231,187,0.13)',
  cyanGlow:    'rgba(25,231,187,0.20)',

  sky:         '#48cfff',
  skyDim:      'rgba(72,207,255,0.13)',

  mint:        '#a2ffe7',
  mintDim:     'rgba(162,255,231,0.11)',

  cream:       '#dcfff8',

  lime:        '#65e1ff',
  limeDim:     'rgba(101,225,255,0.11)',

  teal:        '#44f2d0',
  bronze:      '#0bc3a0',
  green:       '#a2ffe7',

  /* ── Semantic status ─────────────────────────────────── */
  success:     '#19e7bb',
  successDim:  'rgba(25,231,187,0.13)',
  warning:     '#f5b840',
  warningDim:  'rgba(245,184,64,0.13)',
  error:       '#ff5a61',
  errorDim:    'rgba(255,90,97,0.13)',
  info:        '#48cfff',
  infoDim:     'rgba(72,207,255,0.13)',

  /* ── Text ────────────────────────────────────────────── */
  text:        '#eaf6f8',
  textMuted:   'rgba(185,215,220,0.72)',
  textSoft:    'rgba(145,180,190,0.52)',
  textDim:     'rgba(185,215,220,0.48)',

  /* ── UI primitives ───────────────────────────────────── */
  white: '#ffffff',
  black: '#000000',

  /* ── Legacy aliases ──────────────────────────────────── */
  gold:        '#48cfff',
  orange:      '#65e1ff',
  purple:      '#96b7c6',
  purpleDim:   'rgba(150,183,198,0.13)',
  red:         '#ff5a61',
  redDim:      'rgba(255,90,97,0.12)',
  muted:       'rgba(185,215,220,0.76)',
} as const;

export const WaselGradients = {
  primary:  'linear-gradient(135deg, #dcfff8 0%, #19e7bb 44%, #48cfff 100%)',
  hero:     'linear-gradient(135deg, #19e7bb 0%, #48cfff 50%, #a2ffe7 100%)',
  subtle:   'linear-gradient(135deg, rgba(25,231,187,0.16) 0%, rgba(72,207,255,0.10) 100%)',
  card:     'linear-gradient(145deg, rgba(13,24,46,0.97) 0%, rgba(9,16,32,0.98) 100%)',
  overlay:  'linear-gradient(180deg, transparent 0%, rgba(4,8,20,0.96) 100%)',
  cyan:     'linear-gradient(135deg, #19e7bb, #48cfff)',
  sky:      'linear-gradient(135deg, #48cfff, #65e1ff)',
  gold:     'linear-gradient(135deg, #f5b840, #ffd060)',
  orange:   'linear-gradient(135deg, #65e1ff, #48cfff)',
  green:    'linear-gradient(135deg, #19e7bb, #a2ffe7)',
  glow:     'radial-gradient(circle, rgba(25,231,187,0.20), transparent)',
  hero2:    'radial-gradient(ellipse at 50% 0%, rgba(25,231,187,0.22) 0%, transparent 52%)',
} as const;

export const WaselShadows = {
  xs:       '0 2px 8px rgba(1,4,10,0.28)',
  sm:       '0 6px 18px rgba(1,4,10,0.34)',
  md:       '0 14px 42px rgba(1,4,10,0.44)',
  lg:       '0 26px 70px rgba(1,4,10,0.54)',
  xl:       '0 40px 100px rgba(1,4,10,0.60)',
  brand:    '0 16px 48px rgba(25,231,187,0.18)',
  brandLg:  '0 28px 72px rgba(25,231,187,0.24)',
  sky:      '0 16px 48px rgba(72,207,255,0.16)',
  inset:    'inset 0 1px 0 rgba(220,255,248,0.06)',
} as const;

export const WaselImages = {
  hero:     'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  aqaba:    'https://images.unsplash.com/photo-1649195309743-b0b19c102c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  irbid:    'https://images.unsplash.com/photo-1638367915999-8d559b61bd43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  deadSea:  'https://images.unsplash.com/photo-1726001739725-cfd1902b2a2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  petra:    'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  wadiRum:  'https://images.unsplash.com/photo-1762255047146-a62d5426d6b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  carpool:  'https://images.unsplash.com/photo-1748882585283-1b71bbbec96b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  package:  'https://images.unsplash.com/photo-1606295835125-2338079fdfc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  mosque:   'https://images.unsplash.com/photo-1733063166469-d77a93d7266e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
} as const;

export const WaselTypography = {
  sans:    "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  display: "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', sans-serif)",
  arabic:  "var(--wasel-font-arabic, 'Cairo', 'Tajawal', 'Almarai', sans-serif)",
  mono:    "var(--wasel-font-mono, 'JetBrains Mono', 'Fira Code', 'Consolas', monospace)",
  display_scale: 'clamp(2.6rem, 5.8vw, 4.8rem)',
  h1:      'clamp(1.9rem, 3.8vw, 2.9rem)',
  h2:      'clamp(1.4rem, 2.6vw, 2.0rem)',
  h3:      '1.3rem',
  h4:      '1.08rem',
  body:    '0.945rem',
  small:   '0.820rem',
  tiny:    '0.755rem',
} as const;

export const WaselSpacing = {
  xs:   '0.25rem',
  sm:   '0.5rem',
  md:   '1rem',
  lg:   '1.5rem',
  xl:   '2rem',
  '2xl':'3rem',
  '3xl':'4rem',
} as const;

export const WaselRadius = {
  xs:   '6px',
  sm:   '10px',
  md:   '14px',
  lg:   '18px',
  xl:   '22px',
  '2xl':'28px',
  '3xl':'36px',
  full: '9999px',
} as const;

export const WaselAnimations = {
  fadeIn:  { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slideUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
  scale:   { initial: { opacity: 0, scale: 0.93 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.93 } },
  spring:  { type: 'spring', stiffness: 320, damping: 28 },
  smooth:  { duration: 0.26, ease: 'easeInOut' },
  snappy:  { type: 'spring', stiffness: 480, damping: 34 },
} as const;

export const WaselBreakpoints = {
  sm:   '640px',
  md:   '768px',
  lg:   '1024px',
  xl:   '1280px',
  '2xl':'1536px',
} as const;


/* ── Helper functions ──────────────────────────────────── */

/** Returns glassmorphism style object */
export const glassmorphism = (opacity = 0.84) => ({
  background:     `rgba(6,12,24,${opacity})`,
  backdropFilter: 'blur(22px) saturate(180%)',
  border:         `1px solid ${WaselColors.border}`,
} as const);

/** Returns teal glow box-shadow */
export const glowEffect = (color = WaselColors.cyan, spread = '3A') => ({
  boxShadow: `0 18px 50px ${color}${spread}`,
} as const);

/** Returns standard card inline style */
export const cardStyle = () => ({
  background:   WaselGradients.card,
  border:       `1px solid ${WaselColors.border}`,
  borderRadius: WaselRadius.xl,
  boxShadow:    `${WaselShadows.md}, ${WaselShadows.inset}`,
} as const);

/** Returns brand primary button inline style */
export const primaryButtonStyle = () => ({
  background:   WaselGradients.primary,
  color:        '#020d10',
  border:       '1px solid rgba(255,255,255,0.10)',
  borderRadius: WaselRadius.md,
  fontWeight:   900,
  boxShadow:    WaselShadows.brand,
} as const);
