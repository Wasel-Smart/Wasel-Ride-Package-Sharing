/**
 * Currency unit tests — JOD/fils verification
 *
 * Proves the full conversion chain is correct for Jordanian Dinar (JOD):
 *   1 JOD = 1000 fils  (3-decimal ISO-4217 currency)
 *
 * Stripe additionally requires three-decimal amounts to be a multiple of 10
 * minor units (10 fils = 0.010 JOD) so the minimum billable unit is 0.01 JOD.
 */

import { describe, it, expect } from 'vitest';
import {
  minorUnitExponent,
  toMinorUnits,
  toStripeMinorUnits,
  fromMinorUnits,
  MIN_PAYMENT_AMOUNT_MINOR,
  MAX_PAYMENT_AMOUNT_MINOR,
} from '../currency';

// ─── JOD is a 3-decimal currency ────────────────────────────────────────────

describe('minorUnitExponent', () => {
  it('JOD uses 3 decimal places (1 JOD = 1000 fils)', () => {
    expect(minorUnitExponent('jod')).toBe(3);
    expect(minorUnitExponent('JOD')).toBe(3);
  });

  it('USD uses 2 decimal places', () => {
    expect(minorUnitExponent('usd')).toBe(2);
  });

  it('KWD, BHD, OMR, TND also use 3 decimal places', () => {
    for (const c of ['kwd', 'bhd', 'omr', 'tnd']) {
      expect(minorUnitExponent(c)).toBe(3);
    }
  });
});

// ─── toMinorUnits: JOD → fils ────────────────────────────────────────────────

describe('toMinorUnits (JOD)', () => {
  it('1.000 JOD = 1000 fils', () => {
    expect(toMinorUnits(1.0, 'jod')).toBe(1000);
  });

  it('1.500 JOD = 1500 fils', () => {
    expect(toMinorUnits(1.5, 'jod')).toBe(1500);
  });

  it('0.050 JOD = 50 fils (minimum payment amount)', () => {
    expect(toMinorUnits(0.05, 'jod')).toBe(50);
  });

  it('0.001 JOD = 1 fil (smallest unit)', () => {
    expect(toMinorUnits(0.001, 'jod')).toBe(1);
  });

  it('5000.000 JOD = 5000000 fils (maximum payment amount)', () => {
    expect(toMinorUnits(5000.0, 'jod')).toBe(5_000_000);
  });

  it('rounds correctly for floating-point amounts', () => {
    // 1.234 JOD = 1234 fils (not 1233.9999... due to float rounding)
    expect(toMinorUnits(1.234, 'jod')).toBe(1234);
  });
});

// ─── toStripeMinorUnits: rounds to nearest 10 fils for Stripe ───────────────

describe('toStripeMinorUnits (JOD)', () => {
  it('1.000 JOD → 1000 fils (already a multiple of 10)', () => {
    expect(toStripeMinorUnits(1.0, 'jod')).toBe(1000);
  });

  it('1.505 JOD → 1510 fils (rounds up to nearest 10)', () => {
    expect(toStripeMinorUnits(1.505, 'jod')).toBe(1510);
  });

  it('1.504 JOD → 1500 fils (rounds down to nearest 10)', () => {
    expect(toStripeMinorUnits(1.504, 'jod')).toBe(1500);
  });

  it('0.050 JOD → 50 fils (already a multiple of 10)', () => {
    expect(toStripeMinorUnits(0.05, 'jod')).toBe(50);
  });

  it('result is always a multiple of 10', () => {
    const amounts = [1.001, 1.234, 2.567, 10.999, 0.055];
    for (const a of amounts) {
      expect(toStripeMinorUnits(a, 'jod') % 10).toBe(0);
    }
  });

  it('USD is NOT rounded to 10 (only 3-decimal currencies are)', () => {
    expect(toStripeMinorUnits(1.55, 'usd')).toBe(155);
  });
});

// ─── fromMinorUnits: fils → JOD ─────────────────────────────────────────────

describe('fromMinorUnits (JOD)', () => {
  it('1000 fils = 1.000 JOD', () => {
    expect(fromMinorUnits(1000, 'jod')).toBe(1.0);
  });

  it('1500 fils = 1.500 JOD', () => {
    expect(fromMinorUnits(1500, 'jod')).toBe(1.5);
  });

  it('50 fils = 0.050 JOD', () => {
    expect(fromMinorUnits(50, 'jod')).toBe(0.05);
  });

  it('round-trips: toMinorUnits → fromMinorUnits returns original amount', () => {
    const amounts = [0.05, 0.1, 1.0, 1.5, 100.0, 5000.0];
    for (const a of amounts) {
      expect(fromMinorUnits(toMinorUnits(a, 'jod'), 'jod')).toBe(a);
    }
  });
});

// ─── Boundary constants ───────────────────────────────────────────────────────

describe('payment amount bounds', () => {
  it('MIN_PAYMENT_AMOUNT_MINOR is 50 fils (0.05 JOD)', () => {
    expect(MIN_PAYMENT_AMOUNT_MINOR).toBe(50);
    expect(fromMinorUnits(MIN_PAYMENT_AMOUNT_MINOR, 'jod')).toBe(0.05);
  });

  it('MAX_PAYMENT_AMOUNT_MINOR is 5,000,000 fils (5000 JOD)', () => {
    expect(MAX_PAYMENT_AMOUNT_MINOR).toBe(5_000_000);
    expect(fromMinorUnits(MAX_PAYMENT_AMOUNT_MINOR, 'jod')).toBe(5000);
  });
});

// ─── CliQ QR payload uses .toFixed(3) = JOD major units ─────────────────────

describe('CliQ amount formatting (JOD major units)', () => {
  it('1500 fils → "1.500" in QR payload (not "1500")', () => {
    const major = fromMinorUnits(1500, 'jod');
    expect(major.toFixed(3)).toBe('1.500');
  });

  it('50 fils → "0.050" in QR payload', () => {
    const major = fromMinorUnits(50, 'jod');
    expect(major.toFixed(3)).toBe('0.050');
  });

  it('1000 fils → "1.000" in QR payload', () => {
    const major = fromMinorUnits(1000, 'jod');
    expect(major.toFixed(3)).toBe('1.000');
  });
});
