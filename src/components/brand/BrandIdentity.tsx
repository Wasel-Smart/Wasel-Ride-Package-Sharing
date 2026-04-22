import type { CSSProperties } from 'react';
import {
  BRAND,
  getBrandSurfaceColors,
  resolveBrandLogoSize,
  type BrandLogoSize,
  type BrandSurface,
} from '../../design-system/brand';
import { ExactLogoMark } from '../wasel-ds/ExactLogoMark';

export type ApprovedBrandLogoVariant =
  | 'BrandLogoPrimaryDark'
  | 'BrandLogoStandardLight'
  | 'BrandLogoMicro';

type BrandLogoProps = {
  size?: BrandLogoSize | number;
  style?: CSSProperties;
  variant?: ApprovedBrandLogoVariant;
};

type BrandWordmarkProps = {
  showTagline?: boolean;
  size?: BrandLogoSize | number;
  style?: CSSProperties;
  surface?: BrandSurface;
  tagline?: string;
};

type BrandLockupProps = {
  dense?: boolean;
  showTagline?: boolean;
  showWordmark?: boolean;
  size?: BrandLogoSize | number;
  style?: CSSProperties;
  surface?: BrandSurface;
  tagline?: string;
  variant?: 'default' | 'compact' | 'micro';
};

const WORDMARK_SCALE: Record<BrandLogoSize, number> = {
  xs: 16,
  sm: 18,
  md: 24,
  lg: 30,
  xl: 42,
};

const TAGLINE_SCALE: Record<BrandLogoSize, number> = {
  xs: 9,
  sm: 9,
  md: 10,
  lg: 12,
  xl: 14,
};

const LOCKUP_GAP: Record<BrandLogoSize, number> = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
};

const DIVIDER_HEIGHT: Record<BrandLogoSize, number> = {
  xs: 22,
  sm: 24,
  md: 28,
  lg: 36,
  xl: 48,
};

function getLockupTone(surface: BrandSurface) {
  const colors = getBrandSurfaceColors(surface);
  return {
    divider: surface === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.12)',
    tag: surface === 'dark' ? BRAND.colors.brand.gradientStart : colors.textMuted,
    text: colors.textPrimary,
  };
}

function resolveLogoVariant(
  surface: BrandSurface,
  variant: BrandLockupProps['variant'],
): ApprovedBrandLogoVariant {
  if (variant === 'micro') {
    return 'BrandLogoMicro';
  }

  return surface === 'dark' ? 'BrandLogoPrimaryDark' : 'BrandLogoStandardLight';
}

export function BrandLogo({
  size = 'md',
  style,
  variant = 'BrandLogoStandardLight',
}: BrandLogoProps) {
  const { token, value } = resolveBrandLogoSize(size);
  const isDark = variant === 'BrandLogoPrimaryDark';
  const isMicro = variant === 'BrandLogoMicro';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'fit-content',
        minWidth: value,
        ...style,
      }}
    >
      <ExactLogoMark
        size={isMicro ? BRAND.logo.sizes[token] : value}
        framed={false}
        glow={isDark}
      />
    </span>
  );
}

export function BrandLogoPrimaryDark(props: Omit<BrandLogoProps, 'variant'>) {
  return <BrandLogo {...props} variant="BrandLogoPrimaryDark" />;
}

export function BrandLogoStandardLight(props: Omit<BrandLogoProps, 'variant'>) {
  return <BrandLogo {...props} variant="BrandLogoStandardLight" />;
}

export function BrandLogoMicro(props: Omit<BrandLogoProps, 'variant'>) {
  return <BrandLogo {...props} variant="BrandLogoMicro" />;
}

export function BrandWordmark({
  showTagline = true,
  size = 'md',
  style,
  surface = 'light',
  tagline = BRAND.tagline,
}: BrandWordmarkProps) {
  const { token } = resolveBrandLogoSize(size);
  const tone = getLockupTone(surface);

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: BRAND.logo.wordmarkTaglineGap,
        minWidth: 0,
        ...style,
      }}
    >
      <span
        style={{
          color: tone.text,
          fontFamily: BRAND.fonts.display,
          fontSize: WORDMARK_SCALE[token],
          fontWeight: 700,
          letterSpacing: '-0.045em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {BRAND.name}
      </span>
      {showTagline ? (
        <span
          style={{
            color: tone.tag,
            fontFamily: BRAND.fonts.sans,
            fontSize: TAGLINE_SCALE[token],
            fontWeight: 500,
            letterSpacing: BRAND.logo.taglineTracking,
            lineHeight: 1.15,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {tagline}
        </span>
      ) : null}
    </span>
  );
}

export function BrandLockup({
  dense = false,
  showTagline = true,
  showWordmark = true,
  size = 'md',
  style,
  surface = 'light',
  tagline = BRAND.tagline,
  variant = 'default',
}: BrandLockupProps) {
  const { token, value } = resolveBrandLogoSize(size);
  const tone = getLockupTone(surface);
  const approvedVariant = resolveLogoVariant(surface, variant);
  const effectiveTagline = variant === 'compact' || variant === 'micro' || dense ? false : showTagline;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: LOCKUP_GAP[token],
        minWidth: 0,
        maxWidth: '100%',
        ...style,
      }}
    >
      <BrandLogo size={value} variant={approvedVariant} />
      {showWordmark ? (
        <>
          <span
            aria-hidden="true"
            style={{
              alignSelf: effectiveTagline ? 'stretch' : 'center',
              width: BRAND.logo.dividerWidth,
              minHeight: DIVIDER_HEIGHT[token],
              background: tone.divider,
              borderRadius: 999,
              flexShrink: 0,
            }}
          />
          <BrandWordmark
            showTagline={effectiveTagline}
            size={token}
            surface={surface}
            tagline={tagline}
          />
        </>
      ) : null}
    </span>
  );
}
