/**
 * Wasel Design System - Unified Service Layer
 * Matches landing page aesthetic with warm amber/gold accents
 */

export const DesignSystem = {
  colors: {
    // Deep space backgrounds (matching landing page)
    bg: {
      primary: 'var(--background, #0f1113)',
      secondary: 'var(--wasel-surface-0, #15181c)',
      tertiary: 'var(--wasel-panel-muted, #1a1d22)',
      elevated: 'var(--wasel-panel-strong, #20242a)',
      card: 'linear-gradient(165deg, rgba(7,24,39,0.96) 0%, rgba(7,27,43,0.9) 42%, rgba(4,19,31,0.96) 100%)',
    },
    
    // Amber/Gold accent system (primary brand - matching landing)
    accent: {
      base: 'var(--ds-accent, #f59a2c)',
      strong: 'var(--ds-accent-strong, #ffb357)',
      soft: 'var(--ds-accent-soft, #3f2a15)',
      dim: 'rgba(245, 154, 44, 0.12)',
      glow: 'rgba(245, 154, 44, 0.24)',
      border: 'rgba(245, 154, 44, 0.18)',
    },
    
    // Secondary accents (matching landing palette)
    cyan: {
      base: '#47b7e6',
      dim: 'rgba(71, 183, 230, 0.12)',
      glow: 'rgba(71, 183, 230, 0.20)',
    },
    
    gold: {
      base: '#efb45d',
      dim: 'rgba(239, 180, 93, 0.12)',
    },
    
    green: {
      base: '#79c67d',
      dim: 'rgba(121, 198, 125, 0.12)',
    },
    
    purple: {
      base: '#a78bfa',
      dim: 'rgba(167, 139, 250, 0.12)',
    },
    
    // Text hierarchy (matching landing)
    text: {
      primary: 'var(--wasel-copy-primary, rgba(255, 255, 255, 0.96))',
      secondary: 'var(--wasel-copy-muted, rgba(255, 255, 255, 0.76))',
      muted: 'var(--wasel-copy-soft, rgba(185, 174, 160, 0.72))',
      dim: 'rgba(185, 174, 160, 0.48)',
    },
    
    // Borders (matching landing)
    border: {
      base: 'var(--ds-border, #313841)',
      strong: 'rgba(245, 154, 44, 0.30)',
      faint: 'rgba(255, 255, 255, 0.06)',
    },
    
    // States
    state: {
      success: '#79c67d',
      warning: '#efb45d',
      error: '#ee705d',
      info: '#6bb9df',
    },
  },
  
  gradients: {
    aurora: 'radial-gradient(circle at 18% 12%, rgba(245,154,44,0.08), transparent 32%), radial-gradient(circle at 82% 88%, rgba(255,179,87,0.06), transparent 28%)',
    card: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))',
    button: 'linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)',
    text: 'linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)',
  },
  
  shadows: {
    sm: '0 4px 12px rgba(0, 0, 0, 0.24)',
    md: '0 8px 24px rgba(0, 0, 0, 0.32)',
    lg: 'var(--wasel-shadow-lg, 0 18px 36px rgba(1,10,18,0.18))',
    glow: '0 0 24px rgba(245, 154, 44, 0.18)',
    glowBlue: '0 0 24px rgba(71, 183, 230, 0.16)',
  },
  
  radius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    full: '9999px',
  },
  
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "'Space Grotesk', 'Inter', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: '0.72rem',
      sm: '0.84rem',
      base: '0.94rem',
      lg: '1.06rem',
      xl: '1.24rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.75rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
  },
  
  animation: {
    duration: {
      fast: '150ms',
      base: '250ms',
      slow: '400ms',
    },
    easing: {
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
} as const;

// Component builders
export const panel = (borderRadius = 24) => ({
  position: 'relative' as const,
  background: 'var(--wasel-panel-strong)',
  border: `1px solid ${DesignSystem.colors.border.base}`,
  borderRadius,
  boxShadow: DesignSystem.shadows.lg,
  backdropFilter: 'blur(22px)',
  overflow: 'hidden' as const,
});

export const glassPanel = (borderRadius = 20) => ({
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))',
  backdropFilter: 'blur(18px) saturate(160%)',
  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  border: `1px solid ${DesignSystem.colors.border.base}`,
  borderRadius,
  boxShadow: DesignSystem.shadows.lg,
});

export const button = {
  primary: {
    background: 'linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)',
    color: '#F8FBFF',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: DesignSystem.radius.lg,
    padding: '12px 24px',
    fontWeight: DesignSystem.typography.fontWeight.black,
    boxShadow: '0 18px 40px rgba(30,124,255,0.28)',
    cursor: 'pointer' as const,
    transition: 'all 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  outline: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: DesignSystem.colors.text.primary,
    border: `1px solid ${DesignSystem.colors.border.strong}`,
    borderRadius: DesignSystem.radius.lg,
    padding: '12px 24px',
    fontWeight: DesignSystem.typography.fontWeight.bold,
    cursor: 'pointer' as const,
    transition: 'all 0.20s ease',
  },
  ghost: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: DesignSystem.colors.text.secondary,
    border: `1px solid ${DesignSystem.colors.border.base}`,
    borderRadius: DesignSystem.radius.lg,
    padding: '12px 24px',
    fontWeight: DesignSystem.typography.fontWeight.semibold,
    cursor: 'pointer' as const,
    transition: 'all 0.18s ease',
  },
};

export const statCard = (accent: string) => ({
  ...panel(22),
  padding: '18px',
  border: `1px solid ${accent}30`,
  boxShadow: `0 18px 42px ${accent}18`,
  background: 'linear-gradient(180deg, rgba(9,20,36,0.95), rgba(6,14,28,0.96))',
});

export const pill = (color: string, bgOpacity = 0.11, borderOpacity = 0.21) => ({
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: '4px',
  padding: '3px 10px',
  borderRadius: DesignSystem.radius.full,
  fontSize: DesignSystem.typography.fontSize.xs,
  fontWeight: DesignSystem.typography.fontWeight.semibold,
  background: `${color}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`,
  color,
  border: `1px solid ${color}${Math.round(borderOpacity * 255).toString(16).padStart(2, '0')}`,
});

export const input = {
  background: 'rgba(0, 0, 0, 0.22)',
  border: `1px solid ${DesignSystem.colors.border.base}`,
  borderRadius: DesignSystem.radius.md,
  color: DesignSystem.colors.text.primary,
  fontSize: DesignSystem.typography.fontSize.base,
  padding: '10px 14px',
  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  outline: 'none' as const,
  width: '100%',
};

export const backdrop = {
  background: 'var(--wasel-shell-background)',
  minHeight: '100vh',
  color: DesignSystem.colors.text.primary,
  fontFamily: DesignSystem.typography.fontFamily.sans,
  position: 'relative' as const,
  overflow: 'hidden' as const,
};
