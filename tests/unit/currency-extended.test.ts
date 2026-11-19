/**
 * Extended coverage for src/shared/currency/currency.ts.
 * The base currency.test.ts covers the happy path; this file pins the edge
 * cases that drive branch and function coverage above the ratchet floor.
 */
import { describe, it, expect } from 'vitest';
import {
  minorUnitExponent,
  toMinorUnits,
  fromMinorUnits,
  toStripeMinorUnits,
  normalizeAmount,
  MIN_PAYMENT_AMOUNT_MINOR,
  MAX_PAYMENT_AMOUNT_MINOR,
} from '../../src/shared/currency/currency';

// ── minorUnitExponent ────────────────────────────────────────────────────────

describe('minorUnitExponent', () => {
  it('returns 3 for three-decimal currencies (case-insensitive)', () => {
    expect(minorUnitExponent('JOD')).toBe(3);
    expect(minorUnitExponent('jod')).toBe(3);
    expect(minorUnitExponent('KWD')).toBe(3);
    expect(minorUnitExponent('BHD')).toBe(3);
    expect(minorUnitExponent('OMR')).toBe(3);
    expect(minorUnitExponent('TND')).toBe(3);
  });

  it('returns 2 for two-decimal currencies', () => {
    expect(minorUnitExponent('USD')).toBe(2);
    expect(minorUnitExponent('EUR')).toBe(2);
    expect(minorUnitExponent('GBP')).toBe(2);
    expect(minorUnitExponent('IQD')).toBe(2);
  });

  it('handles whitespace in currency code', () => {
    expect(minorUnitExponent('  JOD  ')).toBe(3);
  });

  it('handles null/undefined gracefully', () => {
    expect(minorUnitExponent(null as unknown as string)).toBe(2);
    expect(minorUnitExponent(undefined as unknown as string)).toBe(2);
  });
});

// ── toMinorUnits ─────────────────────────────────────────────────────────────

describe('toMinorUnits', () => {
  it('converts JOD major to fils (×1000)', () => {
    expect(toMinorUnits(1, 'JOD')).toBe(1000);
    expect(toMinorUnits(0.5, 'JOD')).toBe(500);
    expect(toMinorUnits(10.123, 'JOD')).toBe(10123);
  });

  it('converts USD major to cents (×100)', () => {
    expect(toMinorUnits(1, 'USD')).toBe(100);
    expect(toMinorUnits(0.5, 'USD')).toBe(50);
  });

  it('rounds sub-unit fractions', () => {
    // 10.1234 JOD → 10123.4 → rounds to 10123
    expect(toMinorUnits(10.1234, 'JOD')).toBe(10123);
  });

  it('handles zero', () => {
    expect(toMinorUnits(0, 'JOD')).toBe(0);
    expect(toMinorUnits(0, 'USD')).toBe(0);
  });
});

// ── fromMinorUnits ───────────────────────────────────────────────────────────

describe('fromMinorUnits', () => {
  it('converts fils back to JOD', () => {
    expect(fromMinorUnits(5500, 'JOD')).toBe(5.5);
    expect(fromMinorUnits(1000, 'JOD')).toBe(1);
  });

  it('converts cents back to USD', () => {
    expect(fromMinorUnits(550, 'USD')).toBe(5.5);
  });

  it('round-trips through toMinorUnits', () => {
    const major = 12.345;
    expect(fromMinorUnits(toMinorUnits(major, 'JOD'), 'JOD')).toBeCloseTo(major, 3);
  });
});

// ── toStripeMinorUnits ───────────────────────────────────────────────────────

describe('toStripeMinorUnits', () => {
  it('rounds JOD to nearest 10 minor units', () => {
    // 12.5 JOD = 12500 fils — already a multiple of 10
    expect(toStripeMinorUnits(12.5, 'JOD')).toBe(12500);
    // 12.504 JOD = 12504 fils → rounds to 12500
    expect(toStripeMinorUnits(12.504, 'JOD')).toBe(12500);
    // 12.506 JOD = 12506 fils → rounds to 12510
    expect(toStripeMinorUnits(12.506, 'JOD')).toBe(12510);
  });

  it('does not round two-decimal currencies', () => {
    expect(toStripeMinorUnits(12.5, 'USD')).toBe(1250);
    expect(toStripeMinorUnits(0.01, 'USD')).toBe(1);
  });

  it('result is always a multiple of 10 for JOD', () => {
    for (const amount of [1, 2.5, 7.777, 100, 0.001]) {
      expect(toStripeMinorUnits(amount, 'JOD') % 10).toBe(0);
    }
  });
});

// ── normalizeAmount ──────────────────────────────────────────────────────────

describe('normalizeAmount', () => {
  it('passes amounts at the lower bound', () => {
    expect(normalizeAmount(MIN_PAYMENT_AMOUNT_MINOR)).toBe(MIN_PAYMENT_AMOUNT_MINOR);
  });

  it('passes amounts at the upper bound', () => {
    // normalizeAmount uses an internal cap of 500_000; expose what that cap is
    const result = normalizeAmount(500_000);
    expect(result).toBe(500_000);
  });

  it('rejects below lower bound', () => {
    expect(normalizeAmount(MIN_PAYMENT_AMOUNT_MINOR - 1)).toBeNull();
  });

  it('rejects above 500_000', () => {
    expect(normalizeAmount(500_001)).toBeNull();
  });

  it('rounds to integer', () => {
    expect(normalizeAmount(100.7)).toBe(101);
  });

  it('rejects non-finite values', () => {
    expect(normalizeAmount(NaN)).toBeNull();
    expect(normalizeAmount(Infinity)).toBeNull();
    expect(normalizeAmount(-Infinity)).toBeNull();
  });

  it('rejects non-number types', () => {
    expect(normalizeAmount('100' as unknown as number)).toBeNull();
    expect(normalizeAmount(null as unknown as number)).toBeNull();
    expect(normalizeAmount(undefined as unknown as number)).toBeNull();
  });
});

// ── constant sanity checks ───────────────────────────────────────────────────

describe('payment amount constants', () => {
  it('MIN_PAYMENT_AMOUNT_MINOR is 50 fils', () => {
    expect(MIN_PAYMENT_AMOUNT_MINOR).toBe(50);
  });

  it('MAX_PAYMENT_AMOUNT_MINOR is 5_000_000 fils (5000 JOD)', () => {
    expect(MAX_PAYMENT_AMOUNT_MINOR).toBe(5_000_000);
    expect(fromMinorUnits(MAX_PAYMENT_AMOUNT_MINOR, 'JOD')).toBe(5000);
  });
});
