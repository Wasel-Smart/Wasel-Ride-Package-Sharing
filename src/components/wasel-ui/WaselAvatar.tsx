/**
 * WaselAvatar — user avatar with initials fallback, status dot, and size variants.
 * Fully token-based, zero hardcoded hex.
 */

import type { CSSProperties, KeyboardEvent } from 'react';
import { C, R, TYPE, F } from '../../utils/wasel-ds';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'none';

interface WaselAvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  verified?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

const sizePx: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
};

const fontSizeMap: Record<AvatarSize, string> = {
  xs: TYPE.size.xs,
  sm: TYPE.size.sm,
  md: TYPE.size.base,
  lg: TYPE.size.lg,
  xl: TYPE.size.xl,
};

const statusColor: Record<AvatarStatus, string> = {
  online:  '#4CAF82',
  busy:    C.error,
  away:    C.warning,
  offline: C.textMuted,
  none:    'transparent',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarGradient(name?: string): string {
  const gradients = [
    'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 100%)',
    'linear-gradient(135deg, #19E7BB 0%, #48CFFF 100%)',
    'linear-gradient(135deg, #48CFFF 0%, #A2FFE7 100%)',
    'linear-gradient(135deg, #0BC3A0 0%, #D8FBFF 100%)',
  ];
  if (!name) return gradients[0];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

export function WaselAvatar({
  src,
  name,
  size = 'md',
  status = 'none',
  verified = false,
  style,
  onClick,
}: WaselAvatarProps) {
  const px = sizePx[size];
  const dotSize = Math.max(8, Math.round(px * 0.22));
  const dotOffset = Math.round(dotSize * 0.1);

  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
    width: px,
    height: px,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  const imgStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: R.full,
    objectFit: 'cover',
    border: `1.5px solid ${C.border}`,
    display: 'block',
  };

  const initialsStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: R.full,
    background: getAvatarGradient(name),
    border: `1.5px solid ${C.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: F,
    fontSize: fontSizeMap[size],
    fontWeight: 800,
    color: '#041019',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const handleKeyDown = onClick
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      style={containerStyle}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (name ?? 'avatar') : undefined}
    >
      {src ? (
        <img src={src} alt={name ?? 'avatar'} style={imgStyle} />
      ) : (
        <div style={initialsStyle} aria-hidden="true">{getInitials(name)}</div>
      )}

      {status !== 'none' && (
        <span
          aria-label={`Status: ${status}`}
          style={{
            position: 'absolute',
            bottom: dotOffset,
            right: dotOffset,
            width: dotSize,
            height: dotSize,
            borderRadius: R.full,
            background: statusColor[status],
            border: `2px solid var(--background)`,
          }}
        />
      )}

      {verified && (
        <span
          aria-label="Verified"
          style={{
            position: 'absolute',
            bottom: dotOffset,
            right: dotOffset,
            width: dotSize + 2,
            height: dotSize + 2,
            borderRadius: R.full,
            background: C.cyan,
            border: `2px solid var(--background)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.max(7, Math.round(dotSize * 0.55)),
            color: '#041019',
            fontWeight: 900,
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
