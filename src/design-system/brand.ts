/**
 * Canonical Wasel brand contract.
 *
 * The attached brand board is the source of truth for:
 * - approved logo variants
 * - approved brand colors
 * - Montserrat typography
 * - fixed spacing and logo sizing
 * - dark/light behavior
 *
 * Keep new UI work aligned to these tokens instead of page-local values.
 */

export const BRAND = {
  name: 'Wasel',
  tagline: 'LIVE MOBILITY NETWORK',
  fonts: {
    sans: "'Montserrat', 'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
    display: "'Montserrat', 'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  colors: {
    brand: {
      gradientStart: '#F5B041',
      gradientEnd: '#E67E22',
      solid: '#E67E22',
      hover: '#D35400',
    },
    light: {
      bg: '#F5EFE6',
      surface: '#FFFDF9',
      textPrimary: '#0F172A',
      textMuted: '#6B7280',
      border: 'rgba(15, 23, 42, 0.08)',
    },
    dark: {
      bg: '#0B0F14',
      surface: '#111827',
      textPrimary: '#F8FAFC',
      textMuted: 'rgba(248, 250, 252, 0.72)',
      border: 'rgba(255, 255, 255, 0.08)',
    },
  },
  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    20: 20,
    24: 24,
    32: 32,
    40: 40,
    48: 48,
    64: 64,
  },
  typography: {
    display: { size: 56, lineHeight: 1, letterSpacing: '-0.05em', weight: 700 },
    h1: { size: 44, lineHeight: 1.04, letterSpacing: '-0.045em', weight: 700 },
    h2: { size: 32, lineHeight: 1.08, letterSpacing: '-0.04em', weight: 700 },
    h3: { size: 24, lineHeight: 1.12, letterSpacing: '-0.03em', weight: 700 },
    h4: { size: 20, lineHeight: 1.18, letterSpacing: '-0.02em', weight: 700 },
    bodyLg: { size: 18, lineHeight: 1.68, letterSpacing: '-0.01em', weight: 500 },
    body: { size: 16, lineHeight: 1.62, letterSpacing: '0', weight: 500 },
    bodySm: { size: 14, lineHeight: 1.58, letterSpacing: '0', weight: 500 },
    caption: { size: 12, lineHeight: 1.45, letterSpacing: '0.12em', weight: 600 },
    label: { size: 13, lineHeight: 1.2, letterSpacing: '0.06em', weight: 600 },
  },
  logo: {
    sizes: {
      xs: 20,
      sm: 24,
      md: 32,
      lg: 40,
      xl: 56,
    },
    clearSpaceUnit: 58 / 340,
    clearSpaceMinMultiplier: 1,
    clearSpacePreferredMultiplier: 1.5,
    iconWordmarkGap: 16,
    wordmarkTaglineGap: 6,
    dividerGap: 16,
    dividerWidth: 1,
    taglineTracking: '0.24em',
  },
  shadows: {
    soft: '0 18px 36px rgba(15, 23, 42, 0.12)',
    softDark: '0 18px 36px rgba(0, 0, 0, 0.22)',
    brandGlowDark:
      '0 0 18px rgba(245, 176, 65, 0.28), 0 0 34px rgba(230, 126, 34, 0.18)',
  },
  logoAssets: {
    badge: '/brand/wasel-route-w-badge.svg?v=20260422-routew',
  },
} as const;

export type BrandSurface = 'light' | 'dark';
export type BrandLogoSize = keyof typeof BRAND.logo.sizes;
export type BrandTypographyToken = keyof typeof BRAND.typography;

export function resolveBrandLogoSize(
  size: BrandLogoSize | number | undefined,
): { token: BrandLogoSize; value: number } {
  if (size === undefined) {
    return { token: 'md', value: BRAND.logo.sizes.md };
  }

  if (typeof size === 'string') {
    return { token: size, value: BRAND.logo.sizes[size] };
  }

  const sizes = Object.entries(BRAND.logo.sizes) as Array<[BrandLogoSize, number]>;
  const [token, value] = sizes.reduce((closest, entry) => {
    const [, px] = entry;
    return Math.abs(px - size) < Math.abs(closest[1] - size) ? entry : closest;
  }, sizes[2]);

  return { token, value };
}

export function getBrandTypography(token: BrandTypographyToken) {
  return BRAND.typography[token];
}

export function getBrandSurfaceColors(surface: BrandSurface) {
  return BRAND.colors[surface];
}
