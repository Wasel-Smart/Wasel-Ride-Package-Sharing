/**
 * Unit tests — src/utils/currency.ts
 * Covers currency config lookups and formatting.
 */
import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_CURRENCY_CODES,
  PLATFORM_CURRENCY,
  CurrencyService,
} from '@/utils/currency';

describe('currency constants', () => {
  it('defines JOD as the platform settlement currency', () => {
    expect(PLATFORM_CURRENCY).toBe('JOD');
  });

  it('includes all major MENA currencies', () => {
    const required = ['JOD', 'USD', 'EUR', 'AED', 'SAR', 'EGP'];
    for (const code of required) {
      expect(SUPPORTED_CURRENCY_CODES).toContain(code);
    }
  });
});

describe('CurrencyService', () => {
  it('getCurrencyConfig returns correct config for JOD', () => {
    const config = CurrencyService.getCurrencyConfig('JOD');
    expect(config).toBeDefined();
    expect(config.code).toBe('JOD');
    expect(config.decimals).toBeGreaterThanOrEqual(2);
  });

  it('getCurrencyConfig returns a config for every supported currency', () => {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      const config = CurrencyService.getCurrencyConfig(code);
      expect(config).toBeDefined();
      expect(config.code).toBe(code);
    }
  });

  it('formatAmount returns a non-empty string for valid inputs', () => {
    const formatted = CurrencyService.formatAmount(12.5, 'JOD');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('formatAmount handles zero correctly', () => {
    const formatted = CurrencyService.formatAmount(0, 'JOD');
    expect(formatted).toBeTruthy();
  });
});
