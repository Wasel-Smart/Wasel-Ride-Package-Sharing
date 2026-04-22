import type { CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BRAND, resolveBrandLogoSize, type BrandSurface } from '../../design-system/brand';
import {
  BrandLockup,
  BrandLogoMicro,
  BrandLogoPrimaryDark,
  BrandLogoStandardLight,
} from '../brand';
import { ExactLogoMark } from './ExactLogoMark';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  subtitle?: string;
  framed?: boolean;
  markAsset?: 'default' | 'attached-primary';
  animated?: boolean;
}

function resolveSurface(theme: WaselLogoProps['theme'], resolvedTheme: 'light' | 'dark'): BrandSurface {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  return resolvedTheme;
}

export function WaselLogo({
  size = BRAND.logo.sizes.md,
  showWordmark = true,
  theme = 'auto',
  style,
  variant = 'full',
  framed = false,
  animated = false,
}: WaselLogoProps) {
  const { resolvedTheme } = useTheme();
  const surface = resolveSurface(theme, resolvedTheme);
  const { value } = resolveBrandLogoSize(size);

  if (!showWordmark) {
    return (
      <span style={{ display: 'inline-flex', ...style }}>
        <ExactLogoMark
          animated={animated}
          framed={framed}
          glow={!framed && surface === 'dark'}
          size={value}
        />
      </span>
    );
  }

  return (
    <BrandLockup
      dense={variant === 'compact'}
      showTagline={variant === 'full'}
      size={value}
      style={style}
      surface={surface}
      tagline={BRAND.tagline}
      variant={variant === 'compact' ? 'compact' : 'default'}
    />
  );
}

export function WaselMark({
  size = BRAND.logo.sizes.md,
  style,
  animated = false,
  framed = false,
}: {
  size?: number;
  style?: CSSProperties;
  markAsset?: 'default' | 'attached-primary';
  animated?: boolean;
  framed?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const { value } = resolveBrandLogoSize(size);

  return (
    <span style={{ display: 'inline-flex', ...style }}>
      <ExactLogoMark
        animated={animated}
        framed={framed}
        glow={!framed && resolvedTheme === 'dark'}
        size={value}
      />
    </span>
  );
}

export function WaselHeroMark({
  size = BRAND.logo.sizes.xl,
}: {
  size?: number;
  markAsset?: 'default' | 'attached-primary';
}) {
  const { value } = resolveBrandLogoSize(size);
  return <ExactLogoMark animated glow size={value} />;
}

export function WaselIcon({
  size = BRAND.logo.sizes.sm,
  framed = true,
}: {
  size?: number;
  markAsset?: 'default' | 'attached-primary';
  framed?: boolean;
}) {
  const { value } = resolveBrandLogoSize(size);

  if (framed) {
    return <ExactLogoMark framed size={value} />;
  }

  return <BrandLogoMicro size={value} />;
}

export {
  BrandLockup,
  BrandLogoMicro,
  BrandLogoPrimaryDark,
  BrandLogoStandardLight,
};
