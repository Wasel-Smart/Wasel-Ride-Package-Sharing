import { describe, it, expect } from 'vitest';
// cliqReportedPayment is exported from the webhooks handler for testability
import { cliqReportedPayment } from '$deno/make-server-0b1f4071/_handlers/webhooks.ts';

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
});
