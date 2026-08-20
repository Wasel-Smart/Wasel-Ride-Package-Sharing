/**
 * tests/utils/currency.test.ts
 *
 * Unit tests for src/utils/currency.ts
 * Covers: money(), CurrencyService conversions, formatting, exchange rates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  money,
  PLATFORM_CURRENCY,
  SUPPORTED_CURRENCY_CODES,
  CURRENCIES,
  EXCHANGE_RATES_FROM_JOD,
  CurrencyService,
  formatCurrency,
  getCurrencySymbol,
} from '@/utils/currency';

describe('currency utils', () => {
  // Reset the CurrencyService singleton between tests
  beforeEach(() => {
    CurrencyService['_instance'] = null;
  });

  // ── money() factory ───────────────────────────────────────────────────────────

  describe('money()', () => {
    it('creates a Money object with the given currency', () => {
      const m = money(3.5, 'JOD');
      expect(m).toEqual({ amount: 3.5, currency: 'JOD' });
    });

    it('defaults to the platform currency (JOD)', () => {
      const m = money(10);
      expect(m.currency).toBe(PLATFORM_CURRENCY);
      expect(m.currency).toBe('JOD');
    });

    it('supports every supported currency code', () => {
      for (const code of SUPPORTED_CURRENCY_CODES) {
        expect(() => money(1, code)).not.toThrow();
      }
    });
  });

  // ── CURRENCIES config ─────────────────────────────────────────────────────────

  describe('CURRENCIES config', () => {
    it('defines a config for every supported currency code', () => {
      for (const code of SUPPORTED_CURRENCY_CODES) {
        expect(CURRENCIES[code]).toBeDefined();
        expect(CURRENCIES[code].code).toBe(code);
      }
    });

    it('JOD has 3 decimal places (fils precision)', () => {
      expect(CURRENCIES['JOD'].decimals).toBe(3);
    });

    it('USD has 2 decimal places', () => {
      expect(CURRENCIES['USD'].decimals).toBe(2);
    });

    it('IQD has 0 decimal places', () => {
      expect(CURRENCIES['IQD'].decimals).toBe(0);
    });

    it('all currencies have a non-empty symbol', () => {
      for (const code of SUPPORTED_CURRENCY_CODES) {
        expect(CURRENCIES[code].symbol.length).toBeGreaterThan(0);
      }
    });

    it('all min fares are positive', () => {
      for (const code of SUPPORTED_CURRENCY_CODES) {
        expect(CURRENCIES[code].minFare).toBeGreaterThan(0);
      }
    });
  });

  // ── EXCHANGE_RATES_FROM_JOD ───────────────────────────────────────────────────

  describe('EXCHANGE_RATES_FROM_JOD', () => {
    it('JOD → JOD rate is exactly 1', () => {
      expect(EXCHANGE_RATES_FROM_JOD['JOD']).toBe(1);
    });

    it('all rates are positive numbers', () => {
      for (const code of SUPPORTED_CURRENCY_CODES) {
        expect(EXCHANGE_RATES_FROM_JOD[code]).toBeGreaterThan(0);
      }
    });

    it('covers every supported currency', () => {
      for (const code of SUPPORTED_CURRENCY_CODES) {
        expect(EXCHANGE_RATES_FROM_JOD[code]).toBeDefined();
      }
    });
  });

  // ── CurrencyService.fromJOD ───────────────────────────────────────────────────

  describe('CurrencyService.fromJOD()', () => {
    it('returns the same amount when converting JOD → JOD', () => {
      const svc = CurrencyService.getInstance();
      expect(svc.fromJOD(5, 'JOD')).toBe(5);
    });

    it('converts JOD → USD using the correct exchange rate', () => {
      const svc = CurrencyService.getInstance();
      const rate = EXCHANGE_RATES_FROM_JOD['USD'];
      const expected = Math.round(10 * rate * 1_000) / 1_000;
      expect(svc.fromJOD(10, 'USD')).toBeCloseTo(expected, 3);
    });

    it('converts JOD → EGP producing a larger number (EGP is weaker)', () => {
      const svc = CurrencyService.getInstance();
      const result = svc.fromJOD(1, 'EGP');
      expect(result).toBeGreaterThan(1);
    });

    it('converts JOD → KWD producing a smaller number (KWD is stronger)', () => {
      const svc = CurrencyService.getInstance();
      const result = svc.fromJOD(1, 'KWD');
      expect(result).toBeLessThan(1);
    });
  });

  // ── CurrencyService.toJOD ─────────────────────────────────────────────────────

  describe('CurrencyService.toJOD()', () => {
    it('returns the same amount when converting JOD → JOD', () => {
      const svc = CurrencyService.getInstance();
      expect(svc.toJOD(5, 'JOD')).toBe(5);
    });

    it('round-trips USD → JOD → USD within floating point tolerance', () => {
      const svc = CurrencyService.getInstance();
      const original = 10;
      const inJOD = svc.toJOD(original, 'USD');
      const backToUSD = svc.fromJOD(inJOD, 'USD');
      expect(backToUSD).toBeCloseTo(original, 2);
    });
  });

  // ── CurrencyService.convert ───────────────────────────────────────────────────

  describe('CurrencyService.convert()', () => {
    it('returns the same amount when from === to', () => {
      const svc = CurrencyService.getInstance();
      expect(svc.convert(100, 'USD', 'USD')).toBe(100);
    });

    it('converts USD → EGP via JOD pivot', () => {
      const svc = CurrencyService.getInstance();
      const result = svc.convert(1, 'USD', 'EGP');
      expect(result).toBeGreaterThan(10);
    });
  });

  // ── CurrencyService.formatShort ───────────────────────────────────────────────

  describe('CurrencyService.formatShort()', () => {
    it('includes the currency symbol', () => {
      const svc = CurrencyService.getInstance();
      const result = svc.formatShort(3.5, 'JOD');
      expect(result).toContain(CURRENCIES['JOD'].symbol);
    });

    it('respects decimal places for JOD (3 decimals)', () => {
      const svc = CurrencyService.getInstance();
      const result = svc.formatShort(3.5, 'JOD');
      expect(result).toContain('3.500');
    });

    it('respects decimal places for IQD (0 decimals)', () => {
      const svc = CurrencyService.getInstance();
      const result = svc.formatShort(1500, 'IQD');
      expect(result).toBe('ع.د 1500');
    });
  });

  // ── CurrencyService.setCurrency + localStorage ────────────────────────────────

  describe('CurrencyService.setCurrency()', () => {
    it('changes the current currency', () => {
      const svc = CurrencyService.getInstance();
      svc.setCurrency('USD');
      expect(svc.current).toBe('USD');
    });

    it('persists the preference in localStorage', () => {
      const svc = CurrencyService.getInstance();
      svc.setCurrency('EUR');
      expect(localStorage.getItem('wasel-preferred-currency')).toBe('EUR');
    });
  });

  // ── Standalone helpers ────────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('returns a non-empty string', () => {
      const result = formatCurrency(5.5, 'JOD');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrencySymbol()', () => {
    it('returns the JOD symbol when passed JOD', () => {
      expect(getCurrencySymbol('JOD')).toBe(CURRENCIES['JOD'].symbol);
    });

    it('returns the USD symbol when passed USD', () => {
      expect(getCurrencySymbol('USD')).toBe(CURRENCIES['USD'].symbol);
    });
  });
});
