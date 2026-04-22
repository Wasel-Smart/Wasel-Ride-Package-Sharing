/**
 * Canonical Wasel brand contract.
 *
 * The system centers on a premium utility route mark:
 * - a flatter, more ownable W symbol
 * - a custom-led wordmark with a secondary tagline
 * - amber, ivory, and graphite brand tones
 * - fixed spacing and logo sizing rules
 *
 * Keep new UI work aligned to these tokens instead of page-local values.
 */

const BRAND_ASSET_VERSION = '20260422-premium';

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
      gradientStart: '#FFD39A',
      gradientEnd: '#E59C36',
      solid: '#E59C36',
      hover: '#C97B1D',
      accentSoft: '#F8E5C1',
      graphite: '#17212B',
    },
    light: {
      bg: '#F7F0E6',
      surface: '#FFFDF9',
      textPrimary: '#17212B',
      textMuted: '#6F6659',
      border: 'rgba(23, 33, 43, 0.1)',
    },
    dark: {
      bg: '#0F141B',
      surface: '#151C24',
      textPrimary: '#F8F4ED',
      textMuted: 'rgba(248, 244, 237, 0.72)',
      border: 'rgba(255, 255, 255, 0.1)',
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
    wordmarkTaglineGap: 4,
    dividerGap: 16,
    dividerWidth: 1,
    taglineTracking: '0.18em',
  },
  shadows: {
    soft: '0 18px 36px rgba(15, 23, 42, 0.12)',
    softDark: '0 18px 36px rgba(0, 0, 0, 0.22)',
    brandGlowDark:
      '0 0 18px rgba(229, 156, 54, 0.16), 0 0 32px rgba(229, 156, 54, 0.08)',
  },
  logoAssets: {
    symbol: `/brand/wasel-route-w-symbol.svg?v=${BRAND_ASSET_VERSION}`,
    badge: `/brand/wasel-route-w-badge.svg?v=${BRAND_ASSET_VERSION}`,
    primaryLockup: `/brand/wasel-main-network-logo.svg?v=${BRAND_ASSET_VERSION}`,
    monochrome: `/brand/wasel-mark-monochrome.svg?v=${BRAND_ASSET_VERSION}`,
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
