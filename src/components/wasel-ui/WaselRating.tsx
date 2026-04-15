/**
 * WaselRating — star rating display and interactive input.
 * Uses token colours; zero hardcoded hex.
 */

import { useState, type CSSProperties } from 'react';
import { C, TYPE, F } from '../../utils/wasel-ds';

interface WaselRatingProps {
  value?: number;           // 0–5, supports half stars (0.5, 1.5 …)
  max?: number;
  size?: number;            // px
  interactive?: boolean;
  onChange?: (value: number) => void;
  showValue?: boolean;
  reviewCount?: number;
  style?: CSSProperties;
}

function StarIcon({ fill, size }: { fill: 'full' | 'half' | 'empty'; size: number }) {
  const gold = C.cyan;   // canonical primary (gold in current brand)
  const dim  = 'rgba(244,198,81,0.18)';

  if (fill === 'full') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 1.5l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.77l-4.78 2.43.91-5.32-3.86-3.76 5.34-.78L10 1.5z" fill={gold} />
      </svg>
    );
  }
  if (fill === 'half') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 1.5l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.77l-4.78 2.43.91-5.32-3.86-3.76 5.34-.78L10 1.5z" fill={dim} />
        <clipPath id="half-clip"><rect x="0" y="0" width="10" height="20" /></clipPath>
        <path d="M10 1.5l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.77l-4.78 2.43.91-5.32-3.86-3.76 5.34-.78L10 1.5z" fill={gold} clipPath="url(#half-clip)" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 1.5l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.77l-4.78 2.43.91-5.32-3.86-3.76 5.34-.78L10 1.5z" fill={dim} />
    </svg>
  );
}

export function WaselRating({
  value = 0,
  max = 5,
  size = 16,
  interactive = false,
  onChange,
  showValue = false,
  reviewCount,
  style,
}: WaselRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;

  const stars = Array.from({ length: max }, (_, i) => {
    const starNum = i + 1;
    const fill =
      display >= starNum ? 'full' :
      display >= starNum - 0.5 ? 'half' : 'empty';
    return fill as 'full' | 'half' | 'empty';
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: F,
        ...style,
      }}
    >
      <div
        style={{ display: 'flex', gap: '2px' }}
        role={interactive ? 'slider' : 'img'}
        aria-label={`Rating: ${value} out of ${max}`}
        aria-valuenow={interactive ? value : undefined}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? max : undefined}
      >
        {stars.map((fill, i) => (
          <span
            key={i}
            style={{ cursor: interactive ? 'pointer' : 'default', display: 'inline-flex' }}
            onMouseEnter={() => interactive && setHovered(i + 1)}
            onMouseLeave={() => interactive && setHovered(null)}
            onClick={() => interactive && onChange?.(i + 1)}
            onKeyDown={(e) => {
              if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onChange?.(i + 1);
              }
            }}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `Rate ${i + 1} out of ${max}` : undefined}
          >
            <StarIcon fill={fill} size={size} />
          </span>
        ))}
      </div>

      {showValue && (
        <span style={{ fontSize: TYPE.size.sm, fontWeight: 700, color: C.cyan, lineHeight: 1 }}>
          {value.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && (
        <span style={{ fontSize: TYPE.size.xs, color: C.textMuted, lineHeight: 1 }}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}
