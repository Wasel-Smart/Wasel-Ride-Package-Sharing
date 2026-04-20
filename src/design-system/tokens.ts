/**
 * Wasel Design System - Single Source of Truth
 * 
 * This file defines ALL design tokens used across the application.
 * DO NOT define colors, spacing, or typography anywhere else.
 * 
 * Usage:
 * import { tokens } from '@/design-system';
 * style={{ color: tokens.colors.primary }}
 */

// ============================================================================
// SPACING SYSTEM (8px grid)
// ============================================================================

export const spacing = {
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
} as const;

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // Brand colors
  primary: '#20D8FF',      // Cyan
  secondary: '#B7FF2B',    // Gold/Lime
  accent: '#47B7E6',       // Blue
  
  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutral colors (dark theme)
  background: '#040C18',
  surface: '#0B2135',
  card: 'rgba(11, 33, 53, 0.88)',
  border: 'rgba(71, 183, 230, 0.14)',
  
  // Text colors
  text: {
    primary: '#EFF6FF',
    secondary: 'rgba(239, 246, 255, 0.75)',
    muted: 'rgba(239, 246, 255, 0.55)',
    disabled: 'rgba(239, 246, 255, 0.35)',
  },
  
  // Interactive states
  hover: 'rgba(32, 216, 255, 0.12)',
  active: 'rgba(32, 216, 255, 0.24)',
  focus: 'rgba(32, 216, 255, 0.32)',
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #20D8FF 0%, #B7FF2B 100%)',
    secondary: 'linear-gradient(135deg, #47B7E6 0%, #1E5FAE 100%)',
    card: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.03) 100%)',
  },
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: "'Plus Jakarta Sans', 'Cairo', 'Tajawal', system-ui, sans-serif",
    display: "'Plus Jakarta Sans', 'Cairo', 'Tajawal', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },
  
  // Font sizes (type scale)
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.375rem',   // 6px
  base: '0.5rem',   // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  glow: '0 24px 60px rgba(32, 216, 255, 0.28)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ============================================================================
// Z-INDEX SYSTEM
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

export const components = {
  button: {
    height: {
      sm: '2rem',      // 32px
      base: '2.5rem',  // 40px
      lg: '3rem',      // 48px
    },
    padding: {
      sm: '0 0.75rem',
      base: '0 1rem',
      lg: '0 1.5rem',
    },
  },
  
  input: {
    height: {
      sm: '2rem',      // 32px
      base: '2.5rem',  // 40px
      lg: '3rem',      // 48px
    },
    padding: {
      sm: '0 0.75rem',
      base: '0 1rem',
      lg: '0 1.25rem',
    },
  },
  
  card: {
    padding: {
      sm: '1rem',      // 16px
      base: '1.5rem',  // 24px
      lg: '2rem',      // 32px
    },
  },
} as const;

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const tokens = {
  spacing,
  colors,
  typography,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  transitions,
  components,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get spacing value
 * @example getSpacing(4) // '1rem'
 */
export function getSpacing(value: keyof typeof spacing): string {
  return spacing[value];
}

/**
 * Get color with opacity
 * @example getColorWithOpacity(colors.primary, 0.5) // 'rgba(32, 216, 255, 0.5)'
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get responsive value based on breakpoint
 * @example getResponsiveValue({ base: '1rem', md: '1.5rem', lg: '2rem' })
 */
export function getResponsiveValue(values: {
  base: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string {
  return `clamp(${values.base}, ${values.md ?? values.base}, ${values.lg ?? values.md ?? values.base})`;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Spacing = keyof typeof spacing;
export type Color = keyof typeof colors;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type ZIndex = keyof typeof zIndex;
export type Breakpoint = keyof typeof breakpoints;
export type Transition = keyof typeof transitions;

// ============================================================================
// CSS CUSTOM PROPERTIES (for use in CSS files)
// ============================================================================

export const cssVariables = `
:root {
  /* Colors */
  --wasel-primary: ${colors.primary};
  --wasel-secondary: ${colors.secondary};
  --wasel-accent: ${colors.accent};
  --wasel-success: ${colors.success};
  --wasel-warning: ${colors.warning};
  --wasel-error: ${colors.error};
  --wasel-info: ${colors.info};
  
  /* Background */
  --wasel-background: ${colors.background};
  --wasel-surface: ${colors.surface};
  --wasel-card: ${colors.card};
  --wasel-border: ${colors.border};
  
  /* Text */
  --wasel-text-primary: ${colors.text.primary};
  --wasel-text-secondary: ${colors.text.secondary};
  --wasel-text-muted: ${colors.text.muted};
  --wasel-text-disabled: ${colors.text.disabled};
  
  /* Spacing */
  --wasel-spacing-1: ${spacing[1]};
  --wasel-spacing-2: ${spacing[2]};
  --wasel-spacing-3: ${spacing[3]};
  --wasel-spacing-4: ${spacing[4]};
  --wasel-spacing-5: ${spacing[5]};
  --wasel-spacing-6: ${spacing[6]};
  --wasel-spacing-8: ${spacing[8]};
  --wasel-spacing-10: ${spacing[10]};
  --wasel-spacing-12: ${spacing[12]};
  
  /* Typography */
  --wasel-font-sans: ${typography.fontFamily.sans};
  --wasel-font-display: ${typography.fontFamily.display};
  
  /* Border Radius */
  --wasel-radius-sm: ${borderRadius.sm};
  --wasel-radius-base: ${borderRadius.base};
  --wasel-radius-md: ${borderRadius.md};
  --wasel-radius-lg: ${borderRadius.lg};
  --wasel-radius-xl: ${borderRadius.xl};
  --wasel-radius-2xl: ${borderRadius['2xl']};
  --wasel-radius-3xl: ${borderRadius['3xl']};
  
  /* Shadows */
  --wasel-shadow-sm: ${shadows.sm};
  --wasel-shadow-base: ${shadows.base};
  --wasel-shadow-md: ${shadows.md};
  --wasel-shadow-lg: ${shadows.lg};
  --wasel-shadow-xl: ${shadows.xl};
  --wasel-shadow-glow: ${shadows.glow};
  
  /* Transitions */
  --wasel-transition-fast: ${transitions.fast};
  --wasel-transition-base: ${transitions.base};
  --wasel-transition-slow: ${transitions.slow};
}
`;

// Default export
export default tokens;
