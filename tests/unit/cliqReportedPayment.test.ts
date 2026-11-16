import { describe, it, expect } from 'vitest';

/**
 * Pure unit tests for the CliQ amount conversion logic.
 *
 * The actual `cliqReportedPayment` function lives in a Deno edge function and
 * is already covered by the Deno test suite (supabase/functions/tests/webhooks.test.ts).
 * This file tests the same conversion rules in the Node/jsdom Vitest environment
 * by inlining the pure logic — no Deno globals required.
 */
function cliqReportedPayment(
  amount: unknown,
  currency: unknown,
  unit: string,
): { amountJod: number | null; currency: string | null } {
  const reportedCurrency = String(currency ?? '').trim().toLowerCase();
  const rawAmount = Number(amount);
  const normalizedUnit = unit.trim().toLowerCase();
  const amountJod =
    reportedCurrency === 'jod' && Number.isFinite(rawAmount) && rawAmount > 0
      ? normalizedUnit === 'jod'
        ? rawAmount
        : normalizedUnit === 'fils'
          ? rawAmount / 1000
          : null
      : null;

  return { amountJod, currency: reportedCurrency || null };
}

describe('cliqReportedPayment — unit conversion', () => {
  it('returns amount unchanged when unit is jod', () => {
    const result = cliqReportedPayment('5.500', 'jod', 'jod');
    expect(result.amountJod).toBeCloseTo(5.5);
    expect(result.currency).toBe('jod');
  });

  it('divides by 1000 when unit is fils', () => {
    const result = cliqReportedPayment('5500', 'jod', 'fils');
    expect(result.amountJod).toBeCloseTo(5.5);
    expect(result.currency).toBe('jod');
  });

  it('returns null amountJod for unknown unit', () => {
    const result = cliqReportedPayment('5500', 'jod', 'unknown');
    expect(result.amountJod).toBeNull();
    expect(result.currency).toBe('jod');
  });

  it('returns null amountJod when currency is not jod', () => {
    const result = cliqReportedPayment('5500', 'usd', 'fils');
    expect(result.amountJod).toBeNull();
    expect(result.currency).toBe('usd');
  });

  it('returns null amountJod for zero amount', () => {
    const result = cliqReportedPayment('0', 'jod', 'fils');
    expect(result.amountJod).toBeNull();
  });

  it('returns null amountJod for negative amount', () => {
    const result = cliqReportedPayment('-100', 'jod', 'fils');
    expect(result.amountJod).toBeNull();
  });

  it('returns null amountJod for non-numeric amount', () => {
    const result = cliqReportedPayment('abc', 'jod', 'fils');
    expect(result.amountJod).toBeNull();
  });

  it('returns null amountJod for null amount', () => {
    const result = cliqReportedPayment(null, 'jod', 'fils');
    expect(result.amountJod).toBeNull();
  });

  it('handles uppercase unit (case-insensitive)', () => {
    const result = cliqReportedPayment('1000', 'jod', 'FILS');
    expect(result.amountJod).toBeCloseTo(1.0);
  });

  it('handles uppercase currency (case-insensitive)', () => {
    const result = cliqReportedPayment('2.500', 'JOD', 'jod');
    expect(result.amountJod).toBeCloseTo(2.5);
  });

  it('returns null currency for empty currency', () => {
    const result = cliqReportedPayment('1000', '', 'fils');
    expect(result.amountJod).toBeNull();
    expect(result.currency).toBeNull();
  });

  it('handles the exact Deno test assertion: 12.345 jod unit', () => {
    const result = cliqReportedPayment('12.345', 'JOD', 'jod');
    expect(result.amountJod).toBeCloseTo(12.345);
    expect(result.currency).toBe('jod');
  });

  it('handles the exact Deno test assertion: 12345 fils unit', () => {
    const result = cliqReportedPayment('12345', 'JOD', 'fils');
    expect(result.amountJod).toBeCloseTo(12.345);
    expect(result.currency).toBe('jod');
  });

  it('handles the exact Deno test assertion: empty unit', () => {
    const result = cliqReportedPayment('12345', 'JOD', '');
    expect(result.amountJod).toBeNull();
    expect(result.currency).toBe('jod');
  });

  it('handles the exact Deno test assertion: USD currency', () => {
    const result = cliqReportedPayment('12.345', 'USD', 'jod');
    expect(result.amountJod).toBeNull();
    expect(result.currency).toBe('usd');
  });
});
