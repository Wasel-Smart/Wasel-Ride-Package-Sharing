/**
 * WASEL UNIFIED DESIGN SYSTEM v1.0
 * Single source of truth for all components across the application.
 * All values reference CSS variables from brand-theme.css for theme consistency.
 */

export const WASEL = {
  // ── Colors ──────────────────────────────────────────────────
  colors: {
    // Primary brand colors
    primary: 'var(--wasel-button-primary)', // #A9E3FF
    primaryRgb: 'var(--wasel-button-primary-rgb)', // 169 227 255
    accent: 'var(--accent)', // #19E7BB
    accentRgb: 'var(--accent-rgb)', // 25 231 187
    
    // Text colors
    text: 'var(--wasel-copy-primary)',
    textSecondary: 'var(--wasel-copy-muted)',
    textMuted: 'var(--wasel-copy-soft)',
    
    // Backgrounds
    bg: 'var(--wasel-shell-background)',
    bgPrimary: 'var(--bg-primary)',
    bgSecondary: 'var(--bg-secondary)',
    
    // Surfaces
    surface: 'var(--surface-soft)',
    surfaceStrong: 'var(--surface-strong)',
    surfaceMuted: 'var(--surface-muted)',
    card: 'var(--service-card)',
    
    // Borders
    border: 'var(--wasel-panel-border)',
    borderHover: 'var(--wasel-panel-border-hover)',
    borderStrong: 'var(--border-strong)',
    
    // Semantic colors
    success: 'var(--success)',
    successRgb: 'var(--success-rgb)',
    warning: 'var(--warning)',
    warningRgb: 'var(--warning-rgb)',
    danger: 'var(--danger)',
    dangerRgb: 'var(--danger-rgb)',
    
    // Brand palette
    cyan: 'var(--wasel-cyan)',
    cyanBright: 'var(--wasel-cyan-bright)',
    blue: 'var(--wasel-blue)',
    green: 'var(--wasel-green)',
    teal: 'var(--wasel-teal)',
  },
  
  // ── Gradients ───────────────────────────────────────────────
  gradients: {
    primary: 'var(--theme-gradient-primary)',
    accent: 'var(--theme-gradient-accent)',
    hero: 'var(--service-head-background)',
    button: 'var(--wasel-app-button-primary)',
    line: 'var(--theme-gradient-line)',
    
    // Custom gradients matching landing page
    panel: 'linear-gradient(180deg, rgba(220,255,248,0.055), rgba(220,255,248,0.018)), rgba(10,18,28,0.84)',
    panelLight: 'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(243,249,255,0.98) 48%, rgba(237,250,247,0.96) 100%)',
    glow: 'radial-gradient(circle, rgba(169,227,255,0.20), transparent)',
  },
  
  // ── Shadows ─────────────────────────────────────────────────
  shadows: {
    xs: 'var(--wasel-shadow-xs)',
    sm: 'var(--wasel-shadow-sm)',
    md: 'var(--wasel-shadow-md)',
    lg: 'var(--wasel-shadow-lg)',
    xl: 'var(--wasel-shadow-xl)',
    cyan: 'var(--wasel-shadow-blue)',
    teal: 'var(--wasel-shadow-teal)',
    card: 'var(--wasel-shadow-card)',
    
    // Button shadows
    buttonPrimary: 'var(--wasel-button-primary-shadow)',
    buttonPrimaryHover: 'var(--wasel-button-primary-shadow-hover)',
    buttonSecondary: 'var(--wasel-app-button-secondary-shadow)',
  },
  
  // ── Spacing (8px base grid) ─────────────────────────────────
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },
  
  // ── Border Radius ───────────────────────────────────────────
  radius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '32px',
    '4xl': '34px',
    full: '9999px',
  },
  
  // ── Typography ──────────────────────────────────────────────
  fonts: {
    sans: 'var(--wasel-font-sans)',
    display: 'var(--wasel-font-display)',
    arabic: 'var(--wasel-font-arabic)',
  },
  
  fontSize: {
    xs: '0.72rem',    // 11.52px
    sm: '0.84rem',    // 13.44px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.3125rem',  // 21px
    '2xl': '1.625rem',   // 26px
    '3xl': '2rem',       // 32px
    '4xl': '2.5rem',     // 40px
    '5xl': '3.25rem',    // 52px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  lineHeight: {
    tight: 0.96,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.74,
  },
  
  letterSpacing: {
    tighter: '-0.06em',
    tight: '-0.03em',
    normal: '0',
    wide: '0.08em',
    wider: '0.12em',
  },
  
  // ── Transitions ─────────────────────────────────────────────
  transition: {
    fast: '120ms cubic-bezier(0.2, 0.9, 0.2, 1)',
    base: '180ms cubic-bezier(0.2, 0.9, 0.2, 1)',
    slow: '280ms cubic-bezier(0.2, 0.9, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // ── Z-Index ─────────────────────────────────────────────────
  zIndex: {
    base: 0,
    raised: 10,
    dropdown: 50,
    overlay: 100,
    modal: 200,
    toast: 300,
    tooltip: 400,
  },
  
  // ── Breakpoints ─────────────────────────────────────────────
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// ── Helper Functions ────────────────────────────────────────────

/**
 * Creates a glassmorphism effect with backdrop blur
 */
export const glassmorphism = (opacity = 0.84) => ({
  background: `rgba(8, 15, 26, ${opacity})`,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: `1px solid ${WASEL.colors.border}`,
} as const);

/**
 * Creates a glow effect with specified color
 */
export const glowEffect = (color = WASEL.colors.cyan, intensity = 0.22) => ({
  boxShadow: `0 18px 50px color-mix(in srgb, ${color} ${Math.round(intensity * 100)}%, transparent)`,
} as const);

/**
 * Standard card style matching landing page
 */
export const cardStyle = (radius = WASEL.radius.xl) => ({
  background: WASEL.gradients.panel,
  border: `1px solid ${WASEL.colors.border}`,
  borderRadius: radius,
  boxShadow: WASEL.shadows.md,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
} as const);

/**
 * Panel style for service pages
 */
export const panelStyle = (radius = WASEL.radius['2xl']) => ({
  background: 'var(--wasel-panel-strong)',
  border: `1px solid ${WASEL.colors.border}`,
  borderRadius: radius,
  boxShadow: WASEL.shadows.lg,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
} as const);

/**
 * Pill/badge style
 */
export const pillStyle = (color = WASEL.colors.cyan) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: WASEL.spacing[2],
  padding: `${WASEL.spacing[2]} ${WASEL.spacing[3]}`,
  borderRadius: WASEL.radius.full,
  background: `color-mix(in srgb, ${color} 10%, transparent)`,
  border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
  color,
  fontSize: WASEL.fontSize.xs,
  fontWeight: WASEL.fontWeight.bold,
  letterSpacing: WASEL.letterSpacing.wide,
  textTransform: 'uppercase' as const,
} as const);

/**
 * Button radius helper (matches landing page r() function)
 */
export const r = (value: number) => `${value}px`;

/**
 * Responsive grid helper
 */
export const responsiveGrid = (columns: number, gap = WASEL.spacing[4]) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap,
} as const);

/**
 * Flex center helper
 */
export const flexCenter = () => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const);

// ── Export Aliases for Backwards Compatibility ──────────────────

export const DS = {
  // Colors
  text: WASEL.colors.text,
  sub: WASEL.colors.textSecondary,
  muted: WASEL.colors.textMuted,
  cyan: WASEL.colors.cyan,
  green: WASEL.colors.green,
  gold: WASEL.colors.warning,
  border: WASEL.colors.border,
  card: WASEL.colors.card,
  card2: WASEL.colors.surfaceMuted,
  
  // Gradients
  gradC: WASEL.gradients.primary,
  gradG: WASEL.gradients.accent,
  
  // Fonts
  F: WASEL.fonts.sans,
  FD: WASEL.fonts.display,
  FA: WASEL.fonts.arabic,
} as const;

export default WASEL;
