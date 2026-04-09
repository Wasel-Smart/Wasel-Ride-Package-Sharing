/**
 * Presentation-oriented tokens used by wallet, notifications, and older UI modules.
 */

export const WaselColors = {
  bg: '#081C36',
  surface: '#0B2341',
  card: '#0D284B',
  card2: '#16385D',

  border: 'rgba(93,150,210,0.16)',
  border2: 'rgba(93,150,210,0.28)',
  borderGlow: 'rgba(93,150,210,0.36)',
  borderDark: 'rgba(8,28,54,0.72)',

  cyan: '#47B7E6',
  cyanDark: '#1E5FAE',
  cyanDim: 'rgba(71,183,230,0.14)',
  cyanGlow: 'rgba(71,183,230,0.24)',
  teal: '#72D0EF',

  gold: '#A8D614',
  goldDim: 'rgba(168,214,20,0.14)',
  orange: '#C9E96B',
  bronze: '#84C51A',
  green: '#6BB515',
  greenDim: 'rgba(107,181,21,0.14)',
  purple: '#72D0EF',
  purpleDim: 'rgba(114,208,239,0.14)',
  red: '#FF646A',
  redDim: 'rgba(255,100,106,0.12)',

  text: '#EEF5FF',
  textDim: 'rgba(171,194,221,0.66)',
  muted: 'rgba(145,173,202,0.82)',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const WaselGradients = {
  primary: `linear-gradient(135deg, ${WaselColors.teal} 0%, ${WaselColors.cyanDark} 42%, ${WaselColors.gold} 100%)`,
  cyan: `linear-gradient(135deg, ${WaselColors.cyan}, ${WaselColors.cyanDark})`,
  card: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), rgba(13,40,75,0.92)',
  hero: 'linear-gradient(180deg, rgba(4,18,30,0) 0%, #081C36 100%)',
  glow: `radial-gradient(circle, ${WaselColors.cyanGlow}, transparent)`,
  gold: `linear-gradient(135deg, ${WaselColors.green}, ${WaselColors.gold})`,
  orange: `linear-gradient(135deg, ${WaselColors.orange}, ${WaselColors.gold})`,
  green: `linear-gradient(135deg, ${WaselColors.green}, ${WaselColors.gold})`,
  purple: `linear-gradient(135deg, ${WaselColors.cyanDark}, ${WaselColors.teal})`,
};

export const WaselShadows = {
  sm: '0 10px 24px rgba(4,16,32,0.22)',
  md: '0 18px 44px rgba(4,16,32,0.3)',
  lg: '0 30px 72px rgba(4,16,32,0.38)',
  xl: '0 40px 96px rgba(4,16,32,0.44)',
  glow: `0 18px 50px ${WaselColors.cyanGlow}`,
};

export const WaselImages = {
  hero:
    'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  aqaba:
    'https://images.unsplash.com/photo-1649195309743-b0b19c102c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  irbid:
    'https://images.unsplash.com/photo-1638367915999-8d559b61bd43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  deadSea:
    'https://images.unsplash.com/photo-1726001739725-cfd1902b2a2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  petra:
    'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  wadiRum:
    'https://images.unsplash.com/photo-1762255047146-a62d5426d6b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  carpool:
    'https://images.unsplash.com/photo-1748882585283-1b71bbbec96b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  package:
    'https://images.unsplash.com/photo-1606295835125-2338079fdfc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  mosque:
    'https://images.unsplash.com/photo-1733063166469-d77a93d7266e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
};

export const WaselTypography = {
  sans:
    "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  arabic:
    "var(--wasel-font-arabic, 'Cairo', 'Tajawal', 'Almarai', sans-serif)",
  h1: 'clamp(2.4rem, 5vw, 4rem)',
  h2: 'clamp(1.9rem, 4vw, 3rem)',
  h3: 'clamp(1.45rem, 3vw, 2rem)',
  h4: 'clamp(1.15rem, 2vw, 1.5rem)',
  body: '1rem',
  small: '0.875rem',
  tiny: '0.75rem',
};

export const WaselSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

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
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.92 },
  },
  spring: { type: 'spring', stiffness: 320, damping: 28 },
  smooth: { duration: 0.28, ease: 'easeInOut' },
};

export const WaselRadius = {
  sm: '0.625rem',
  md: '0.875rem',
  lg: '1.125rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px',
};

export const WaselBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const glassmorphism = (opacity = 0.84) => ({
  background: `rgba(13,40,75,${opacity})`,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${WaselColors.border}`,
});

export const glowEffect = (color = WaselColors.cyan) => ({
  boxShadow: `0 18px 50px ${color}3A`,
});

export const cardStyle = () => ({
  background: WaselGradients.card,
  border: `1px solid ${WaselColors.border}`,
  borderRadius: WaselRadius.xl,
  boxShadow: WaselShadows.md,
});
