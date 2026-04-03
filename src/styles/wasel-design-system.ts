/**
 * Wasel Design System - Unified Brand Identity
 * 
 * Single source of truth for:
 * - Colors
 * - Typography
 * - Spacing
 * - Shadows
 * - Animations
 * - Images
 * 
 * Used across entire application for consistency
 */

// ══════════════════════════════════════════════════════════════════════════════
// COLORS - Brand Palette
// ══════════════════════════════════════════════════════════════════════════════

export const WaselColors = {
  // Backgrounds
  bg:        '#040C18',
  surface:   '#060E1C',
  card:      '#091525',
  card2:     '#0C1E30',
  
  // Borders
  border:    'rgba(0,200,232,0.10)',
  border2:   'rgba(0,200,232,0.22)',
  borderGlow: 'rgba(0,200,232,0.35)',
  borderDark: 'rgba(30,58,95,0.65)',
  
  // Primary (Cyan)
  cyan:      '#00C8E8',
  cyanDark:  '#0095b8',
  cyanDim:   'rgba(0,200,232,0.12)',
  cyanGlow:  'rgba(0,200,232,0.25)',
  teal:      '#00C8E8',
  
  // Accent Colors
  gold:      '#F0A830',
  goldDim:   'rgba(240,168,48,0.12)',
  orange:    '#F0A830',
  bronze:    '#C97F4B',
  green:     '#00C875',
  greenDim:  'rgba(0,200,117,0.12)',
  purple:    '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.12)',
  red:       '#FF4757',
  redDim:    'rgba(255,71,87,0.12)',
  
  // Text
  text:      '#B8CDE0',
  textDim:   '#3D5470',
  muted:     '#4D6A8A',
  
  // Utility
  white:     '#FFFFFF',
  black:     '#000000',
};

// ══════════════════════════════════════════════════════════════════════════════
// GRADIENTS
// ══════════════════════════════════════════════════════════════════════════════

export const WaselGradients = {
  primary: `linear-gradient(135deg, ${WaselColors.cyan}, ${WaselColors.cyanDark})`,
  cyan: `linear-gradient(135deg, ${WaselColors.cyan}, ${WaselColors.cyanDark})`,
  card: `linear-gradient(135deg, rgba(9,21,37,0.8), rgba(6,14,28,0.9))`,
  hero: `linear-gradient(to bottom, transparent, ${WaselColors.bg})`,
  glow: `radial-gradient(circle, ${WaselColors.cyanGlow}, transparent)`,
  gold: `linear-gradient(135deg, ${WaselColors.gold}, #D89420)`,
  orange: `linear-gradient(135deg, ${WaselColors.orange}, ${WaselColors.bronze})`,
  green: `linear-gradient(135deg, ${WaselColors.green}, #00A860)`,
  purple: `linear-gradient(135deg, ${WaselColors.purple}, #8B5CF6)`,
};

// ══════════════════════════════════════════════════════════════════════════════
// SHADOWS
// ══════════════════════════════════════════════════════════════════════════════

export const WaselShadows = {
  sm: `0 2px 8px ${WaselColors.cyanDim}`,
  md: `0 4px 16px ${WaselColors.cyanGlow}`,
  lg: `0 8px 24px ${WaselColors.cyanGlow}`,
  xl: `0 16px 48px ${WaselColors.cyanGlow}`,
  glow: `0 0 40px ${WaselColors.cyanGlow}`,
};

// ══════════════════════════════════════════════════════════════════════════════
// IMAGES - Jordan Destinations
// ══════════════════════════════════════════════════════════════════════════════

export const WaselImages = {
  // Hero
  hero:      'https://images.unsplash.com/photo-1589500254849-ded0651e35f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  
  // Destinations
  aqaba:     'https://images.unsplash.com/photo-1649195309743-b0b19c102c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  irbid:     'https://images.unsplash.com/photo-1638367915999-8d559b61bd43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  deadSea:   'https://images.unsplash.com/photo-1726001739725-cfd1902b2a2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  petra:     'https://images.unsplash.com/photo-1771692639394-f3c63ff63ea1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  wadiRum:   'https://images.unsplash.com/photo-1762255047146-a62d5426d6b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  
  // Features
  carpool:   'https://images.unsplash.com/photo-1748882585283-1b71bbbec96b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  package:   'https://images.unsplash.com/photo-1606295835125-2338079fdfc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  mosque:    'https://images.unsplash.com/photo-1733063166469-d77a93d7266e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
};

// ══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ══════════════════════════════════════════════════════════════════════════════

export const WaselTypography = {
  // Font Families
  sans: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  arabic: "var(--wasel-font-arabic, 'Cairo', 'Tajawal', 'Almarai', sans-serif)",
  
  // Sizes
  h1: 'clamp(2.5rem, 5vw, 4rem)',
  h2: 'clamp(2rem, 4vw, 3rem)',
  h3: 'clamp(1.5rem, 3vw, 2rem)',
  h4: 'clamp(1.25rem, 2vw, 1.5rem)',
  body: '1rem',
  small: '0.875rem',
  tiny: '0.75rem',
};

// ══════════════════════════════════════════════════════════════════════════════
// SPACING
// ══════════════════════════════════════════════════════════════════════════════

export const WaselSpacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

export const WaselAnimations = {
  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  // Slide up
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  
  // Scale
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  
  // Transitions
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  smooth: { duration: 0.3, ease: 'easeInOut' },
};

// ══════════════════════════════════════════════════════════════════════════════
// BORDER RADIUS
// ══════════════════════════════════════════════════════════════════════════════

export const WaselRadius = {
  sm: '0.5rem',   // 8px
  md: '0.75rem',  // 12px
  lg: '1rem',     // 16px
  xl: '1.5rem',   // 24px
  '2xl': '2rem',  // 32px
  full: '9999px',
};

// ══════════════════════════════════════════════════════════════════════════════
// BREAKPOINTS
// ══════════════════════════════════════════════════════════════════════════════

export const WaselBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export const glassmorphism = (opacity = 0.8) => ({
  background: `rgba(9,21,37,${opacity})`,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${WaselColors.border}`,
});

export const glowEffect = (color = WaselColors.cyan) => ({
  boxShadow: `0 0 40px ${color}40`,
});

export const cardStyle = () => ({
  background: WaselGradients.card,
  border: `1px solid ${WaselColors.border}`,
  borderRadius: WaselRadius.xl,
});
