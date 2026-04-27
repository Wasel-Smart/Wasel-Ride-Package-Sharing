/**
 * Wasel Design System - Unified Service Layer
 * Matches landing page aesthetic with warm amber/gold accents
 */

export const DesignSystem = {
  colors: {
    bg: {
      primary: 'var(--wasel-shell-background, var(--background, #0f1113))',
      secondary: 'var(--ds-page-muted, #15181c)',
      tertiary: 'var(--wasel-panel-muted, #1a1d22)',
      elevated: 'var(--wasel-panel-strong, #20242a)',
      card: 'var(--wasel-service-card, linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024)))',
    },

    accent: {
      base: 'var(--ds-accent, #f59a2c)',
      strong: 'var(--ds-accent-strong, #ffb357)',
      soft: 'var(--ds-accent-soft, #3f2a15)',
      dim: 'color-mix(in srgb, var(--ds-accent, #f59a2c) 12%, transparent)',
      glow: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 24%, transparent)',
      border: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 28%, var(--ds-border, #313841))',
    },

    cyan: {
      base: 'var(--ds-info, #6bb9df)',
      dim: 'color-mix(in srgb, var(--ds-info, #6bb9df) 12%, transparent)',
      glow: 'color-mix(in srgb, var(--ds-info, #6bb9df) 20%, transparent)',
    },

    gold: {
      base: 'var(--ds-warning, #efb45d)',
      dim: 'color-mix(in srgb, var(--ds-warning, #efb45d) 12%, transparent)',
    },

    green: {
      base: 'var(--ds-success, #79c67d)',
      dim: 'color-mix(in srgb, var(--ds-success, #79c67d) 12%, transparent)',
    },

    purple: {
      base: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 72%, var(--ds-info, #6bb9df))',
      dim: 'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 14%, transparent)',
    },

    text: {
      primary: 'var(--wasel-service-text, var(--ds-text, rgba(255, 255, 255, 0.96)))',
      secondary: 'var(--wasel-service-sub, var(--ds-text-muted, rgba(255, 255, 255, 0.76)))',
      muted: 'var(--wasel-service-muted, var(--ds-text-soft, rgba(185, 174, 160, 0.72)))',
      dim: 'color-mix(in srgb, var(--ds-text-soft, #8b8277) 56%, transparent)',
    },

    border: {
      base: 'var(--wasel-service-border, var(--ds-border, #313841))',
      strong: 'var(--wasel-service-border-strong, color-mix(in srgb, var(--ds-accent-strong, #ffb357) 34%, var(--ds-border, #313841)))',
      faint: 'color-mix(in srgb, var(--ds-border, #313841) 30%, transparent)',
    },

    state: {
      success: 'var(--ds-success, #79c67d)',
      warning: 'var(--ds-warning, #efb45d)',
      error: 'var(--ds-danger, #ee705d)',
      info: 'var(--ds-info, #6bb9df)',
    },
  },

  gradients: {
    aurora:
      'radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--ds-accent-strong, #ffb357) 12%, transparent), transparent 32%), radial-gradient(circle at 82% 88%, color-mix(in srgb, var(--ds-warning, #efb45d) 10%, transparent), transparent 28%)',
    card:
      'linear-gradient(180deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.024))',
    button:
      'var(--theme-gradient-primary, linear-gradient(135deg, var(--ds-accent-strong, #ffb357) 0%, var(--ds-accent, #f59a2c) 100%))',
    text:
      'linear-gradient(135deg, var(--ds-accent-strong, #ffb357) 0%, var(--ds-accent, #f59a2c) 100%)',
  },

  shadows: {
    sm: '0 4px 12px rgba(0, 0, 0, 0.24)',
    md: '0 8px 24px rgba(0, 0, 0, 0.32)',
    lg: 'var(--wasel-shadow-lg, var(--ds-shadow-lg, 0 18px 36px rgba(1,10,18,0.18)))',
    glow: '0 0 24px color-mix(in srgb, var(--ds-accent, #f59a2c) 18%, transparent)',
    glowBlue: '0 0 24px color-mix(in srgb, var(--ds-info, #6bb9df) 16%, transparent)',
  },

  radius: {
    sm: 'var(--ds-radius-sm)',
    md: 'var(--ds-radius-md)',
    lg: 'var(--ds-radius-lg)',
    xl: '24px',
    '2xl': '28px',
    full: 'var(--ds-radius-pill)',
  },

  spacing: {
    xs: 'var(--ds-space-2)',
    sm: 'var(--ds-space-3)',
    md: 'var(--ds-space-4)',
    lg: 'var(--ds-space-5)',
    xl: 'var(--ds-space-6)',
    '2xl': 'var(--ds-space-8)',
  },

  typography: {
    fontFamily: {
      sans: 'var(--ds-font-body)',
      display: 'var(--ds-font-display)',
      mono: 'var(--ds-font-mono)',
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
  background: 'var(--wasel-service-card)',
  border: `1px solid ${DesignSystem.colors.border.base}`,
  borderRadius,
  boxShadow: DesignSystem.shadows.lg,
  backdropFilter: 'blur(22px)',
  overflow: 'hidden' as const,
});

export const glassPanel = (borderRadius = 20) => ({
  background:
    'linear-gradient(180deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.024)), var(--wasel-panel-muted)',
  backdropFilter: 'blur(18px) saturate(160%)',
  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  border: `1px solid ${DesignSystem.colors.border.base}`,
  borderRadius,
  boxShadow: DesignSystem.shadows.lg,
});

export const button = {
  primary: {
    background: 'var(--theme-gradient-primary)',
    color: 'var(--wasel-button-primary-foreground, #20160a)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: DesignSystem.radius.lg,
    padding: '12px 24px',
    fontWeight: DesignSystem.typography.fontWeight.black,
    boxShadow: 'var(--wasel-button-primary-shadow)',
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
  background: 'var(--wasel-service-card)',
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
  background: 'var(--surface-field)',
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
  background: 'var(--wasel-shell-background, var(--background, #0f1113))',
  minHeight: '100vh',
  color: DesignSystem.colors.text.primary,
  fontFamily: DesignSystem.typography.fontFamily.sans,
  position: 'relative' as const,
  overflow: 'hidden' as const,
};
