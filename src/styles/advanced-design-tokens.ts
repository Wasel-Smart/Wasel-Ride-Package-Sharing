/**
 * Advanced Design System - Neural-inspired color psychology & spacing
 * Based on cognitive load theory and visual perception research
 */

// Perceptual color system based on human visual processing
export const NEURAL_COLORS = {
  // Primary action colors - optimized for conversion
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1', 
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Main CTA color - highest contrast ratio
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  
  // Semantic colors with psychological impact
  success: {
    base: '#10b981',
    light: '#d1fae5',
    dark: '#047857',
  },
  
  warning: {
    base: '#f59e0b',
    light: '#fef3c7',
    dark: '#d97706',
  },
  
  danger: {
    base: '#ef4444',
    light: '#fee2e2',
    dark: '#dc2626',
  },
  
  // Neutral system with perfect contrast ratios
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
};

// Advanced spacing system based on 8px grid + golden ratio
export const SPACING = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
};

// Typography scale based on modular scale (1.25 ratio)
export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
  },
  
  fontSize: {
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
    sm: ['14px', { lineHeight: '20px', letterSpacing: '0.025em' }],
    base: ['16px', { lineHeight: '24px', letterSpacing: '0' }],
    lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
    xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
    '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.05em' }],
    '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.05em' }],
    '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.05em' }],
    '5xl': ['48px', { lineHeight: '1', letterSpacing: '-0.05em' }],
    '6xl': ['60px', { lineHeight: '1', letterSpacing: '-0.05em' }],
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
};

// Advanced shadow system for depth perception
export const SHADOWS = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Colored shadows for interactive elements
  primary: '0 10px 15px -3px rgb(20 184 166 / 0.4), 0 4px 6px -4px rgb(20 184 166 / 0.4)',
  success: '0 10px 15px -3px rgb(16 185 129 / 0.4), 0 4px 6px -4px rgb(16 185 129 / 0.4)',
  warning: '0 10px 15px -3px rgb(245 158 11 / 0.4), 0 4px 6px -4px rgb(245 158 11 / 0.4)',
  danger: '0 10px 15px -3px rgb(239 68 68 / 0.4), 0 4px 6px -4px rgb(239 68 68 / 0.4)',
};

// Border radius system for consistent visual rhythm
export const RADIUS = {
  none: '0',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
};

// Animation system based on natural motion
export const MOTION = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  
  ease: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Advanced easing for micro-interactions
    'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'elastic-in': 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    'elastic-out': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  },
};

// Breakpoint system for responsive design
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Z-index system for proper layering
export const Z_INDEX = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};