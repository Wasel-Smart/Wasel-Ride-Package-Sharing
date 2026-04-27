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
  xs: 15,
  sm: 17,
  md: 22,
  lg: 28,
  xl: 40,
};

const TAGLINE_SCALE: Record<BrandLogoSize, number> = {
  xs: 8,
  sm: 8,
  md: 9,
  lg: 11,
  xl: 13,
};

const LOCKUP_GAP: Record<BrandLogoSize, number> = {
  xs: 7,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
};

function getLockupTone(surface: BrandSurface) {
  const colors = getBrandSurfaceColors(surface);
  return {
    tag: surface === 'dark' ? 'rgba(248, 213, 157, 0.92)' : colors.textMuted,
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

function WordmarkInitial({
  color,
  fontSize,
}: {
  color: string;
  fontSize: number;
}) {
  const width = Math.max(12, Math.round(fontSize * 0.94));
  const height = Math.max(12, Math.round(fontSize * 0.82));

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 72"
      width={width}
      height={height}
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M10 11C14 24 19 46 28 58C32 63 38 61 42 52L48 30L54 52C58 61 64 63 68 58C77 46 82 24 86 11"
        stroke={color}
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  size = 'md',
  style,
  variant = 'BrandLogoStandardLight',
}: BrandLogoProps) {
  const { token, value } = resolveBrandLogoSize(size);
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
      <ExactLogoMark size={isMicro ? BRAND.logo.sizes[token] : value} framed={false} />
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
  showTagline = false,
  size = 'md',
  style,
  surface = 'light',
  tagline = BRAND.tagline,
}: BrandWordmarkProps) {
  const { token } = resolveBrandLogoSize(size);
  const tone = getLockupTone(surface);
  const wordmarkSize = WORDMARK_SCALE[token];

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: showTagline ? BRAND.logo.wordmarkTaglineGap : 0,
        minWidth: 0,
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'flex-end',
          gap: Math.max(2, Math.round(wordmarkSize * 0.05)),
          whiteSpace: 'nowrap',
        }}
      >
        <WordmarkInitial color={tone.text} fontSize={wordmarkSize} />
        <span
          style={{
            color: tone.text,
            fontFamily: BRAND.fonts.display,
            fontSize: wordmarkSize,
            fontWeight: 780,
            letterSpacing: '-0.055em',
            lineHeight: 0.88,
            whiteSpace: 'nowrap',
            transform: 'translateY(1px)',
          }}
        >
          asel
        </span>
      </span>
      {showTagline ? (
        <span
          style={{
            color: tone.tag,
            fontFamily: BRAND.fonts.sans,
            fontSize: TAGLINE_SCALE[token],
            fontWeight: 650,
            letterSpacing: BRAND.logo.taglineTracking,
            lineHeight: 1.1,
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
  showTagline = false,
  showWordmark = true,
  size = 'md',
  style,
  surface = 'light',
  tagline = BRAND.tagline,
  variant = 'default',
}: BrandLockupProps) {
  const { token, value } = resolveBrandLogoSize(size);
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
        <BrandWordmark
          showTagline={effectiveTagline}
          size={token}
          surface={surface}
          tagline={tagline}
        />
      ) : null}
    </span>
  );
}
