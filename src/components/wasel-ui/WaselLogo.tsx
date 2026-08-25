import type { CSSProperties } from 'react';
import { C } from '@/utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  framed?: boolean;
  alt?: string;
}

const SYMBOL_RATIO = 1536 / 1024;

function getSymbolSrc(theme: 'dark' | 'light', format: 'webp' | 'png'): string {
  const variant = theme === 'light' ? 'symbol-default' : 'symbol-default';
  return `/brand/assets/logos/symbols/${variant}.${format}`;
}

function getWordmarkSrc(theme: 'dark' | 'light'): string {
  const variant = theme === 'light' ? 'logo-light' : 'logo-dark';
  return `/brand/assets/logos/primary/${variant}.svg`;
}

function BrandSymbol({ size, theme = 'dark', framed = false }: { size: number; theme?: 'dark' | 'light'; framed?: boolean }) {
  const width = Math.round(size * SYMBOL_RATIO);
  const height = Math.round(size);
  const webpSrc = getSymbolSrc(theme, 'webp');
  const pngSrc = getSymbolSrc(theme, 'png');

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={pngSrc}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        decoding="async"
        loading="eager"
        draggable={false}
        style={{
          display: 'block',
          width: size * SYMBOL_RATIO,
          height: size,
          objectFit: 'contain',
          flexShrink: 0,
          filter: framed ? `drop-shadow(0 8px 18px ${C.brandBlue}40)` : undefined,
        }}
      />
    </picture>
  );
}

function BrandName({
  theme,
  size,
  language,
}: {
  theme: 'dark' | 'light';
  size: number;
  language: 'ar' | 'en';
}) {
  const foreground = theme === 'light' ? C.text : C.brandInk;
  const fontSize = Math.max(15, Math.min(26, size * 0.5));
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: Math.max(5, fontSize * 0.28),
        color: foreground,
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        letterSpacing: '-0.035em',
        whiteSpace: 'nowrap',
        textShadow: theme === 'light' ? `0 1px 12px ${C.brandInk}40` : undefined,
      }}
    >
      {language === 'ar' ? (
        <span
          lang="ar"
          dir="rtl"
          style={{ fontFamily: "'Cairo', 'Tajawal', Tahoma, Arial, sans-serif", letterSpacing: 0 }}
        >
          واصل
        </span>
      ) : (
        <span>Wasel</span>
      )}
    </span>
  );
}

export function WaselLogo({
  size = 38,
  showWordmark = true,
  theme = 'dark',
  style,
  variant = 'full',
  framed,
  alt,
}: WaselLogoProps) {
  const language =
    typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const compact = variant === 'compact' || !showWordmark || size < 24;
  const symbolSize = compact ? Math.max(18, size) : Math.max(32, size);

  return (
    <div
      aria-label={alt ?? (language === 'ar' ? 'واصل' : 'Wasel')}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 0 : Math.max(8, size * 0.22),
        minHeight: symbolSize,
        padding: compact ? 0 : '2px 0',
        ...style,
      }}
    >
      <BrandSymbol size={symbolSize} theme={theme} framed={framed} />
      {!compact && <BrandName theme={theme} size={size} language={language} />}
    </div>
  );
}

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return <WaselLogo size={size} showWordmark={false} style={style} />;
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return <WaselLogo size={Math.max(72, size * 0.66)} theme="light" framed />;
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <WaselLogo size={size} showWordmark={false} />;
}
