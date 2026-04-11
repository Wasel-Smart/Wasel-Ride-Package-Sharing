/**
 * WaselPriceTag — fare display with discount, currency, and breakdown support.
 */

import type { CSSProperties } from 'react';
import { C, R, TYPE, F } from '../../utils/wasel-ds';

interface WaselPriceTagProps {
  price: number;
  currency?: string;
  originalPrice?: number;
  savingsPercent?: number;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  label?: string;
  style?: CSSProperties;
}

const sizeMap = {
  sm:   { main: TYPE.size.base, currency: TYPE.size.sm,  label: TYPE.size.xs  },
  md:   { main: TYPE.size.xl,   currency: TYPE.size.base, label: TYPE.size.sm  },
  lg:   { main: TYPE.size['2xl'], currency: TYPE.size.md, label: TYPE.size.base },
  hero: { main: TYPE.size['4xl'], currency: TYPE.size.xl, label: TYPE.size.md  },
};

export function WaselPriceTag({
  price,
  currency = 'JOD',
  originalPrice,
  savingsPercent,
  size = 'md',
  label,
  style,
}: WaselPriceTagProps) {
  const s = sizeMap[size];
  const hasDiscount = originalPrice !== undefined && originalPrice > price;
  const originalPriceValue = hasDiscount ? originalPrice : null;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', fontFamily: F, ...style }}>
      {label && (
        <span style={{ fontSize: s.label, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: s.main, fontWeight: 900, color: C.cyan, lineHeight: 1 }}>
          {price.toFixed(2)}
        </span>
        <span style={{ fontSize: s.currency, fontWeight: 600, color: C.textSub }}>
          {currency}
        </span>
      </div>
      {originalPriceValue !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: s.label, color: C.textMuted, textDecoration: 'line-through' }}>
            {originalPriceValue.toFixed(2)} {currency}
          </span>
          {savingsPercent !== undefined && (
            <span style={{
              fontSize: s.label, fontWeight: 800, color: '#4CAF82',
              background: 'rgba(76,175,130,0.14)', padding: '1px 7px', borderRadius: R.full,
            }}>
              -{savingsPercent}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
