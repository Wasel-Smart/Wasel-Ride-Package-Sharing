export type BrandAssetType = 'logo' | 'symbol' | 'icon' | 'og' | 'social';
export type BrandVariant = 'default' | 'dark' | 'light' | 'white' | 'black' | 'monochrome';
export type BrandFormat = 'svg' | 'png' | 'webp' | 'avif';

export interface BrandAssetRef {
  type: BrandAssetType;
  variant: BrandVariant;
  format: BrandFormat;
  size?: number;
  path: string;
}

const BASE = '/brand/assets';

export function logoPath(variant: BrandVariant = 'default', format: BrandFormat = 'svg', size?: number): string {
  if (size) {
    return `${BASE}/logos/primary/logo-${variant}-${size}.${format}`;
  }
  return `${BASE}/logos/primary/logo-${variant}.${format}`;
}

export function symbolPath(variant: BrandVariant = 'default', format: BrandFormat = 'svg'): string {
  if (variant === 'white') {
    return `${BASE}/logos/symbols/symbol-white.svg`;
  }
  return `${BASE}/logos/symbols/symbol-${variant}.${format}`;
}

export function wMarkPath(format: BrandFormat = 'png', size?: number): string {
  if (size) {
    return `${BASE}/logos/symbols/w-mark-${size}.${format}`;
  }
  return `${BASE}/logos/symbols/w-mark.${format}`;
}

export function iconPath(name: 'app-icon' | 'favicon', variant?: BrandVariant, format: BrandFormat = 'svg'): string {
  if (name === 'favicon') {
    return `${BASE}/icons/favicon.svg`;
  }
  if (variant && variant !== 'default') {
    return `${BASE}/icons/${name}-${variant}.${format}`;
  }
  return `${BASE}/icons/${name}.${format}`;
}

export function ogPath(format: BrandFormat = 'png'): string {
  return `${BASE}/og/og-default.${format}`;
}

export function socialPath(variant: BrandVariant = 'dark', format: BrandFormat = 'png'): string {
  return `${BASE}/social/social-${variant}.${format}`;
}

export const brandAssets = {
  logo: logoPath,
  symbol: symbolPath,
  wMark: wMarkPath,
  icon: iconPath,
  og: ogPath,
  social: socialPath,
} as const;
