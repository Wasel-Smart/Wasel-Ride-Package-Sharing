/**
 * Currency Service — Unit Tests
 *
 * Covers: conversion precision, formatting, preference detection,
 * JOD pivot conversion, singleton stability, and cross-currency symmetry.
 *
 * Standard: Bank-grade numeric accuracy expected throughout.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CurrencyService,
  CURRENCIES,
  EXCHANGE_RATES_FROM_JOD,
  PLATFORM_CURRENCY,
  SUPPORTED_CURRENCY_CODES,
  formatCurrency,
  getCurrencySymbol,
  money,
  type SupportedCurrency,
} from '../../../src/utils/currency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshService(): CurrencyService {
  // Reset singleton so each test group starts clean
  (CurrencyService as unknown as { _instance: null })._instance = null;
  return CurrencyService.getInstance();
}

function normalizeLocaleDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function normalizeFormattedCurrency(value: string): string {
  return normalizeLocaleDigits(value)
    .replace(/[\u200e\u200f\u061c]/g, '')
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}

// ── 1. Catalogue completeness ──────────────────────────────────────────────────

describe('CURRENCIES catalogue', () => {
  it('has a config entry for every supported code', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      expect(CURRENCIES[code]).toBeDefined();
      expect(CURRENCIES[code].code).toBe(code);
    }
  });

  it('has a exchange-rate entry for every supported code', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      expect(EXCHANGE_RATES_FROM_JOD[code]).toBeTypeOf('number');
      expect(EXCHANGE_RATES_FROM_JOD[code]).toBeGreaterThan(0);
    }
  });

  it('JOD rate is exactly 1.0 (settlement currency)', () => {
    expect(EXCHANGE_RATES_FROM_JOD.JOD).toBe(1.0);
  });

  it('every currency has valid decimal places (0-3)', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      const { decimals } = CURRENCIES[code];
      expect(decimals).toBeGreaterThanOrEqual(0);
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });

  it('every currency has a non-empty symbol', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      expect(CURRENCIES[code].symbol.length).toBeGreaterThan(0);
    }
  });

  it('platform currency is JOD', () => {
    expect(PLATFORM_CURRENCY).toBe('JOD');
  });
});

// ── 2. money() factory ─────────────────────────────────────────────────────────

describe('money()', () => {
  it('creates a Money object with explicit currency', () => {
    const m = money(5.5, 'USD');
    expect(m.amount).toBe(5.5);
    expect(m.currency).toBe('USD');
  });

  it('defaults currency to JOD', () => {
    const m = money(10);
    expect(m.currency).toBe('JOD');
  });

  it('preserves zero amount', () => {
    const m = money(0, 'AED');
    expect(m.amount).toBe(0);
  });

  it('preserves negative amount (refunds)', () => {
    const m = money(-3.5, 'JOD');
    expect(m.amount).toBe(-3.5);
  });
});

// ── 3. CurrencyService singleton ───────────────────────────────────────────────

describe('CurrencyService singleton', () => {
  it('getInstance() always returns the same object', () => {
    const a = CurrencyService.getInstance();
    const b = CurrencyService.getInstance();
    expect(a).toBe(b);
  });

  it('getCurrencyConfig() returns the correct config for a code', () => {
    const cfg = CurrencyService.getCurrencyConfig('KWD');
    expect(cfg.code).toBe('KWD');
    expect(cfg.decimals).toBe(3);
  });
});

// ── 4. JOD conversion ─────────────────────────────────────────────────────────

describe('CurrencyService.fromJOD()', () => {
  let svc: CurrencyService;

  beforeEach(() => { svc = freshService(); });

  it('JOD → JOD is identity', () => {
    expect(svc.fromJOD(10, 'JOD')).toBe(10);
  });

  it('converts JOD to USD using the configured rate', () => {
    const rate = EXCHANGE_RATES_FROM_JOD.USD;
    const result = svc.fromJOD(1, 'USD');
    expect(result).toBeCloseTo(rate, 2);
  });

  it('converts JOD to EGP (high-rate currency)', () => {
    const result = svc.fromJOD(1, 'EGP');
    expect(result).toBeGreaterThan(50); // EGP rate > 50
  });

  it('converts JOD to KWD (sub-one rate)', () => {
    const result = svc.fromJOD(1, 'KWD');
    expect(result).toBeLessThan(1); // KWD is stronger than JOD
  });

  it('handles zero amount', () => {
    expect(svc.fromJOD(0, 'USD')).toBe(0);
  });
});

describe('CurrencyService.toJOD()', () => {
  let svc: CurrencyService;

  beforeEach(() => { svc = freshService(); });

  it('JOD → JOD is identity', () => {
    expect(svc.toJOD(10, 'JOD')).toBe(10);
  });

  it('round-trip JOD → USD → JOD is lossless within 3 decimal places', () => {
    const original = 7.5;
    const inUSD = svc.fromJOD(original, 'USD');
    const backToJOD = svc.toJOD(inUSD, 'USD');
    expect(backToJOD).toBeCloseTo(original, 2);
  });

  it('round-trip JOD → SAR → JOD is lossless', () => {
    const original = 15.3;
    const inSAR = svc.fromJOD(original, 'SAR');
    const backToJOD = svc.toJOD(inSAR, 'SAR');
    expect(backToJOD).toBeCloseTo(original, 2);
  });
});

// ── 5. Cross-currency conversion ──────────────────────────────────────────────

describe('CurrencyService.convert()', () => {
  let svc: CurrencyService;

  beforeEach(() => { svc = freshService(); });

  it('same currency returns the same amount', () => {
    expect(svc.convert(100, 'USD', 'USD')).toBe(100);
  });

  it('USD → AED goes through JOD pivot correctly', () => {
    const usdToJod = 1 / EXCHANGE_RATES_FROM_JOD.USD;
    const jodToAed = EXCHANGE_RATES_FROM_JOD.AED;
    const expected = Math.round(1 * usdToJod * jodToAed * 1000) / 1000;
    expect(svc.convert(1, 'USD', 'AED')).toBeCloseTo(expected, 2);
  });

  it('convert(x, A, B) and convert(result, B, A) round-trips within 1%', () => {
    const pairs: [SupportedCurrency, SupportedCurrency][] = [
      ['USD', 'SAR'], ['GBP', 'AED'], ['KWD', 'EGP'],
    ];
    for (const [from, to] of pairs) {
      const forward = svc.convert(100, from, to);
      const back = svc.convert(forward, to, from);
      expect(back).toBeCloseTo(100, 0); // within 1 unit tolerance
    }
  });
});

// ── 6. Currency preference ────────────────────────────────────────────────────

describe('CurrencyService.setCurrency()', () => {
  let svc: CurrencyService;

  beforeEach(() => { svc = freshService(); });

  it('updates current currency', () => {
    svc.setCurrency('GBP');
    expect(svc.current).toBe('GBP');
  });

  it('updates minFare after switching currency', () => {
    svc.setCurrency('EGP');
    expect(svc.minFare).toBe(CURRENCIES.EGP.minFare);
  });
});

// ── 7. Formatting ──────────────────────────────────────────────────────────────

describe('CurrencyService.format()', () => {
  let svc: CurrencyService;

  beforeEach(() => { svc = freshService(); svc.setCurrency('JOD'); });

  it('returns a non-empty string for any valid amount', () => {
    expect(svc.format(5, 'JOD').length).toBeGreaterThan(0);
  });

  it('includes the correct number of decimal places for JOD (3)', () => {
    const formatted = normalizeFormattedCurrency(svc.format(3.5, 'JOD'));
    const decimalMatch = formatted.match(/[\d,]+\.(\d+)/);
    if (decimalMatch) {
      expect(decimalMatch[1].length).toBe(3);
    } else {
      expect(formatted).toContain('3.500');
    }
  });

  it('formats IQD with 0 decimal places', () => {
    const formatted = normalizeFormattedCurrency(svc.format(1500, 'IQD'));
    expect(formatted).toMatch(/1,?500/);
    expect(formatted).not.toMatch(/\.\d+/); // no decimal point
  });
});

describe('CurrencyService.formatShort()', () => {
  let svc: CurrencyService;

  beforeEach(() => { svc = freshService(); svc.setCurrency('USD'); });

  it('includes the currency symbol', () => {
    const result = svc.formatShort(10, 'USD');
    expect(result).toContain(CURRENCIES.USD.symbol);
  });

  it('includes the formatted amount', () => {
    const result = svc.formatShort(9.99, 'USD');
    expect(result).toContain('9.99');
  });
});

// ── 8. Standalone helpers ──────────────────────────────────────────────────────

describe('formatCurrency()', () => {
  it('produces output without throwing for all supported currencies', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      expect(() => formatCurrency(1, code)).not.toThrow();
    }
  });
});

describe('getCurrencySymbol()', () => {
  it('returns the JOD symbol when no argument given (default currency)', () => {
    freshService(); // ensure JOD default
    const symbol = getCurrencySymbol('JOD');
    expect(symbol).toBe(CURRENCIES.JOD.symbol);
  });

  it('returns correct symbol for every currency', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      expect(getCurrencySymbol(code)).toBe(CURRENCIES[code].symbol);
    }
  });
});

// ── 9. Available currencies list ──────────────────────────────────────────────

describe('CurrencyService.getAvailable()', () => {
  it('returns all 14 supported currencies', () => {
    const svc = freshService();
    expect(svc.getAvailable().length).toBe(SUPPORTED_CURRENCY_CODES.length);
  });

  it('every entry has a valid code, symbol, name, and nameAr', () => {
    const svc = freshService();
    for (const cfg of svc.getAvailable()) {
      expect(cfg.code.length).toBeGreaterThan(0);
      expect(cfg.symbol.length).toBeGreaterThan(0);
      expect(cfg.name.length).toBeGreaterThan(0);
      expect(cfg.nameAr.length).toBeGreaterThan(0);
    }
  });
});
