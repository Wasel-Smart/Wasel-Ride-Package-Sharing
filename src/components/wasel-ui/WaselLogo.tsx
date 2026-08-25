import type { CSSProperties } from 'react';
import { C } from '@/utils/wasel-ds';
import { symbolPath } from '@/utils/brand-assets';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  _theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  framed?: boolean;
  alt?: string;
}

const SYMBOL_RATIO = 1536 / 1024;

function BrandSymbol({ size, _theme = 'dark', framed = false }: { size: number; _theme?: 'dark' | 'light'; framed?: boolean }) {
  const width = Math.round(size * SYMBOL_RATIO);
  const height = Math.round(size);
  const webpSrc = symbolPath('default', 'webp');
  const pngSrc = symbolPath('default', 'png');

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
  _theme,
  size,
  language,
}: {
  _theme: 'dark' | 'light';
  size: number;
  language: 'ar' | 'en';
}) {
  const foreground = _theme === 'light' ? C.text : C.brandInk;
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
        textShadow: _theme === 'light' ? `0 1px 12px ${C.brandInk}40` : undefined,
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
  _theme = 'dark',
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
      <BrandSymbol size={symbolSize} _theme={_theme} framed={framed} />
      {!compact && <BrandName _theme={_theme} size={size} language={language} />}
    </div>
  );
}

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return <WaselLogo size={size} showWordmark={false} style={style} />;
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return <WaselLogo size={Math.max(72, size * 0.66)} _theme="light" framed />;
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <WaselLogo size={size} showWordmark={false} />;
}
