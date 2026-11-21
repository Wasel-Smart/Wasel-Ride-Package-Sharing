import type { CSSProperties } from 'react';
import { } from '@/utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  framed?: boolean;
  alt?: string;
}

// Full lockup (symbol + wordmark) is 512×185 → width = height × 512/185.
// Symbol-only "W" mark (apply-new-logo.mjs crops it with 4px padding) is 273×193.
const LOGO_W_RATIO = 512 / 185;
const SYMBOL_W_RATIO = 273 / 193;

// Theme-aware asset paths. 'dark' variant = ink wordmark for light backgrounds.
// 'light' variant = white wordmark for dark backgrounds. Both are generated from
// brand/assets/logos/primary/logo-light-512.webp by `node scripts/apply-new-logo.mjs`.
// Bump when the artwork changes. Brand files keep stable names, and browsers/CDNs that cached the
// previous logo would otherwise keep showing it.
const ASSET_V = '?v=20261109';

const LOGO_ASSETS: Record<'dark' | 'light', { webp: string; png: string }> = {
  dark:  { webp: `/brand/assets/logos/primary/logo-dark.webp${ASSET_V}`,  png: `/brand/assets/logos/primary/logo-dark.png${ASSET_V}`  },
  light: { webp: `/brand/assets/logos/primary/logo-light-512.webp${ASSET_V}`, png: `/brand/assets/logos/primary/logo-light-512.png${ASSET_V}` },
};

// Symbol-only mark (transparent background). Its colours read on light and dark surfaces,
// so one asset serves both themes.
const SYMBOL_ASSET = {
  webp: `/brand/assets/logos/symbols/symbol-default.webp${ASSET_V}`,
  png: `/brand/assets/logos/symbols/symbol-default.png${ASSET_V}`,
};

function BrandLockup({
  size,
  theme = 'light',
  framed = false,
  compact = false,
}: {
  size: number;
  theme?: 'dark' | 'light';
  framed?: boolean;
  compact?: boolean;
}) {
  const h = Math.round(size);
  const w = Math.round(size * (compact ? SYMBOL_W_RATIO : LOGO_W_RATIO));
  const { webp, png } = compact ? SYMBOL_ASSET : LOGO_ASSETS[theme];

  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img
        src={png}
        alt=""
        aria-hidden="true"
        width={w}
        height={h}
        decoding="async"
        loading="eager"
        draggable={false}
        style={{
          display: 'block',
          width: w,
          height: h,
          objectFit: 'contain',
          flexShrink: 0,
          // Soft, low-alpha halo (brand guide: no heavy glow).
          filter: framed
            ? `drop-shadow(0 6px 18px ${C.brandBlue}33) drop-shadow(0 2px 8px ${C.brandBlue}1A)`
            : undefined,
        }}
      />
    </picture>
  );
}

export function WaselLogo(props: WaselLogoProps) {
  const {
    size = 36,
    showWordmark = true,
    style,
    variant = 'full',
    framed,
    alt,
  } = props;
  const language =
    typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const compact = variant === 'compact' || !showWordmark || size < 22;
  const lockupH = Math.max(compact ? 18 : 28, size);
  // Default to 'light' (white mark) so it renders correctly on the dark app
  // shell. Pass theme="dark" explicitly when placing on a light background.
  const resolvedTheme = (props as WaselLogoProps).theme ?? 'light';

  return (
    <div
      aria-label={alt ?? (language === 'ar' ? 'واصل' : 'Wasel')}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: lockupH,
        ...style,
      }}
    >
      <BrandLockup size={lockupH} theme={resolvedTheme} framed={framed} compact={compact} />
    </div>
  );
}

/** Symbol-only mark, no wordmark */
export function WaselMark({ size = 36, style }: { size?: number; style?: CSSProperties }) {
  return <WaselLogo size={size} showWordmark={false} style={style} />;
}

/** Large hero mark for auth brand panel and splash screens */
export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return <WaselLogo size={Math.max(72, Math.round(size * 0.7))} theme="light" framed />;
}

/** Tiny inline icon, symbol only */
export function WaselIcon({ size = 20 }: { size?: number }) {
  return <WaselLogo size={size} showWordmark={false} />;
}

