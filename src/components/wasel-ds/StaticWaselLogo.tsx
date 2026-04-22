import type { CSSProperties } from 'react';
import { BRAND, resolveBrandLogoSize } from '../../design-system/brand';
import { BrandLockup } from '../brand';
import { ExactLogoMark } from './ExactLogoMark';

type StaticWaselLogoProps = {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  variant?: 'full' | 'compact';
  subtitle?: string;
  style?: CSSProperties;
  framed?: boolean;
};

export function StaticWaselLogo({
  size = BRAND.logo.sizes.md,
  showWordmark = true,
  theme = 'light',
  variant = 'full',
  style,
  framed = false,
}: StaticWaselLogoProps) {
  const { value } = resolveBrandLogoSize(size);

  if (!showWordmark) {
    return (
      <span style={{ display: 'inline-flex', ...style }}>
        <ExactLogoMark framed={framed} glow={!framed && theme === 'dark'} size={value} />
      </span>
    );
  }

  return (
    <BrandLockup
      dense={variant === 'compact'}
      showTagline={variant === 'full'}
      size={value}
      style={style}
      surface={theme}
      tagline={BRAND.tagline}
      variant={variant === 'compact' ? 'compact' : 'default'}
    />
  );
}
