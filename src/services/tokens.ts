/**
 * Wasel Design System Tokens
 *
 * This file consolidates all design tokens (colors, spacing, typography)
 * based on the BRAND_GUIDELINES.md to ensure a single source of truth.
 * These tokens should be used across all UI components.
 */

// Colors (from BRAND_GUIDELINES.md)
export const colors = {
    brandInk: '#081D39',
    connectionBlue: '#147FE4',
    movementGreen: '#72C70D',
    journeyOrange: '#FF8A0B',
    pearl: '#F8FBFF', // Used for light text/surfaces
    appBackground: '#06111F', // Dark background for app
    black: '#000000',
    // Semantic colors (add as needed, e.g., primary, secondary, success, error)
    primary: '#147FE4', // Connection blue as primary interactive
    success: '#72C70D', // Movement green for success
    warning: '#FF8A0B', // Journey orange for warnings
    text: '#081D39', // Brand ink for text
    textLight: '#F8FBFF', // Pearl for light text
    background: '#F8FBFF', // Default light background
    backgroundDark: '#081D39', // Default dark background
};

// Spacing (example scale, to be documented and expanded)
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    // ... expand as needed
};

// Typography (example, to be expanded with font families, weights, line heights)
export const typography = {
    fontFamilyArabic: 'Cairo, Tajawal, sans-serif',
    fontFamilyEnglish: 'sans-serif', // Specify actual font
    fontSizeBase: 16,
    lineHeightBase: 1.5,
    // ... define heading sizes, weights, etc.
};