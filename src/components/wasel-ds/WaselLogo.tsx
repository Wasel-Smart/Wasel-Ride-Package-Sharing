import { useId, type CSSProperties } from 'react';
import { C, F, SH } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  framed?: boolean;
}

interface LogoPalette {
  mark: string;
  nodeStroke: string;
  nodeFill: string;
  word: string;
  shadow: string;
}

function getLogoPalette(theme: 'dark' | 'light'): LogoPalette {
  if (theme === 'dark') {
    return {
      mark: '#1D667F',
      nodeStroke: '#2C7D98',
      nodeFill: '#14394B',
      word: '#121418',
      shadow: 'drop-shadow(0 6px 12px rgba(17, 24, 31, 0.14))',
    };
  }

  return {
    mark: '#9CEEFF',
    nodeStroke: '#ECFCFF',
    nodeFill: '#F9FFFF',
    word: C.text,
    shadow: SH.cyan,
  };
}

function sanitizeId(value: string) {
  return value.replace(/:/g, '');
}

function LogoGlyph({
  mark,
  nodeStroke,
  nodeFill,
}: {
  mark: string;
  nodeStroke: string;
  nodeFill: string;
}) {
  const nodes = [
    { cx: 8, cy: 10 },
    { cx: 24, cy: 10 },
    { cx: 40, cy: 10 },
    { cx: 56, cy: 10 },
  ];

  return (
    <>
      <g fill="none" stroke={mark} strokeWidth="4.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 10 Q16 41 24 10" />
        <path d="M24 10 Q32 49 40 10" />
        <path d="M40 10 Q48 41 56 10" />
      </g>
      <g fill="none" stroke={nodeStroke} strokeWidth="1.7">
        {nodes.map((node) => (
          <circle key={`${node.cx}-${node.cy}`} cx={node.cx} cy={node.cy} r="4.7" />
        ))}
      </g>
      <g fill={nodeFill}>
        {nodes.map((node) => (
          <circle key={`inner-${node.cx}-${node.cy}`} cx={node.cx} cy={node.cy} r="1.9" />
        ))}
      </g>
    </>
  );
}

function LogoMonogram({
  size,
  theme,
  framed = false,
}: {
  size: number;
  theme: 'dark' | 'light';
  framed?: boolean;
}) {
  const palette = getLogoPalette(theme);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 0,
        filter: framed ? palette.shadow : undefined,
      }}
    >
      <svg
        viewBox="0 0 64 56"
        width={size * (64 / 56)}
        height={size}
        role="img"
        aria-label="Wasel mark"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <LogoGlyph mark={palette.mark} nodeStroke={palette.nodeStroke} nodeFill={palette.nodeFill} />
      </svg>
    </span>
  );
}

function LogoWordmark({
  size,
  theme,
  framed = false,
}: {
  size: number;
  theme: 'dark' | 'light';
  framed?: boolean;
}) {
  const palette = getLogoPalette(theme);
  const svgId = sanitizeId(useId());

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 0,
        filter: framed ? palette.shadow : undefined,
      }}
    >
      <svg
        viewBox="0 0 224 64"
        width={size * 3.5}
        height={size}
        role="img"
        aria-label="Wasel"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <g transform="translate(2 4)">
          <LogoGlyph mark={palette.mark} nodeStroke={palette.nodeStroke} nodeFill={palette.nodeFill} />
        </g>
        <text
          x="76"
          y="45"
          fill={palette.word}
          fontFamily="'Arial Black', 'Plus Jakarta Sans', 'Inter', sans-serif"
          fontWeight="900"
          fontSize="46"
          letterSpacing="-3.6"
          textRendering="geometricPrecision"
        >
          asel
        </text>
        <title id={`${svgId}-title`}>Wasel</title>
      </svg>
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
}: WaselLogoProps) {
  const compact = variant === 'compact' || !showWordmark;
  const logoSize = compact ? size : Math.max(size, 34);
  const title = compact ? (
    <LogoMonogram size={logoSize} theme={theme} framed={framed} />
  ) : (
    <LogoWordmark size={logoSize} theme={theme} framed={framed} />
  );
  const tagline = variant === 'full' && showWordmark ? 'Move simply across Jordan' : null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...style }}>
      {title}
      {tagline && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: Math.max(11, size * 0.18),
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: theme === 'light' ? C.gold : '#6C5A48',
              whiteSpace: 'nowrap',
            }}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoMonogram size={size} theme="light" />
    </div>
  );
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 14px 28px rgba(4, 17, 28, 0.28))',
      }}
    >
      <LogoWordmark size={size * 0.44} theme="light" framed />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoMonogram size={size} theme="light" />;
}
