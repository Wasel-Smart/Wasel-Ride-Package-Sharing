/**
 * Extended branch coverage for src/shared/pricing/priceCalculator.ts.
 */
import { describe, it, expect } from 'vitest';
import { toNumber, calculateDirectPrice } from '../../src/shared/pricing/priceCalculator';

describe('calculateDirectPrice — passenger', () => {
  it('uses default base price (2.5) when none supplied', () => {
    const result = calculateDirectPrice('passenger');
    expect(result.price).toBeGreaterThan(0);
    expect(result.currency).toBe('JOD');
    expect(result.breakdown.base).toBe(2.5);
  });

  it('uses supplied base price', () => {
    const result = calculateDirectPrice('passenger', undefined, 10, 5);
    expect(result.breakdown.base).toBe(5);
  });

  it('computes distance charge at 0.18 per km for passengers', () => {
    const result = calculateDirectPrice('passenger', undefined, 10, 2.5);
    expect(result.breakdown.distance).toBeCloseTo(10 * 0.18, 3);
  });

  it('applies no package surcharge for passenger type', () => {
    const result = calculateDirectPrice('passenger', 5, 10, 2.5);
    expect(result.breakdown.package).toBe(0);
  });

  it('rounds to 3 decimal places for passengers', () => {
    const result = calculateDirectPrice('passenger', 0, 7, 2);
    const decimalPart = String(result.price).split('.')[1] ?? '';
    expect(decimalPart.length).toBeLessThanOrEqual(3);
  });

  it('minimum distance is 1km (clamped)', () => {
    const atZero = calculateDirectPrice('passenger', 0, 0, 2.5);
    const atOne = calculateDirectPrice('passenger', 0, 1, 2.5);
    expect(atZero.price).toBe(atOne.price);
  });

  it('minimum base price is 1 JOD (clamped)', () => {
    const atZero = calculateDirectPrice('passenger', 0, 5, 0);
    const atOne = calculateDirectPrice('passenger', 0, 5, 1);
    expect(atZero.price).toBe(atOne.price);
  });
});

describe('calculateDirectPrice — package', () => {
  it('uses default base price (3.5) when none supplied', () => {
    const result = calculateDirectPrice('package');
    expect(result.breakdown.base).toBe(3.5);
  });

  it('computes distance charge at 0.22 per km for packages', () => {
    const result = calculateDirectPrice('package', 1, 10, 3.5);
    expect(result.breakdown.distance).toBeCloseTo(10 * 0.22, 3);
  });

  it('applies surcharge for weight above 1 kg', () => {
    const at1kg = calculateDirectPrice('package', 1, 10, 3.5);
    const at3kg = calculateDirectPrice('package', 3, 10, 3.5);
    expect(at3kg.breakdown.package).toBeGreaterThan(0);
    expect(at3kg.price).toBeGreaterThan(at1kg.price);
  });

  it('no surcharge for weight at or below 1 kg', () => {
    const result = calculateDirectPrice('package', 0.5, 10, 3.5);
    expect(result.breakdown.package).toBe(0);
  });

  it('rounds to 2 decimal places for packages', () => {
    const result = calculateDirectPrice('package', 2, 7, 3);
    const decimalPart = String(result.price).split('.')[1] ?? '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });
});

describe('toNumber — edge cases', () => {
  it('handles negative numbers', () => {
    expect(toNumber(-5)).toBe(-5);
  });

  it('handles zero', () => {
    expect(toNumber(0)).toBe(0);
  });

  it('handles large numbers', () => {
    expect(toNumber(1_000_000)).toBe(1_000_000);
  });

  it('returns fallback for null', () => {
    expect(toNumber(null)).toBe(0);
  });

  it('returns fallback for objects', () => {
    expect(toNumber({})).toBe(0);
  });

  it('handles numeric strings', () => {
    expect(toNumber('3.14')).toBe(3.14);
  });
});
