/**
 * utils/currency.ts — Multi-currency support for Wasel | واصل
 *
 * Design principles:
 *  - JOD is the platform's primary / settlement currency
 *  - All amounts stored in the backend are in JOD
 *  - Display currency is user-configurable but converted client-side
 *  - Every monetary value must carry an explicit ISO-4217 currency code
 *  - No hardcoded currency symbols anywhere in business logic
 */

// ─── Supported currencies ─────────────────────────────────────────────────────

export const SUPPORTED_CURRENCY_CODES = [
  'JOD',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'EGP',
  'KWD',
  'BHD',
  'QAR',
  'OMR',
  'MAD',
  'TND',
  'IQD',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCY_CODES)[number];

/** Platform settlement currency — never change without a migration. */
export const PLATFORM_CURRENCY: SupportedCurrency = 'JOD';

export interface CurrencyConfig {
  /** ISO-4217 code */
  code: SupportedCurrency;
  /** Localised symbol */
  symbol: string;
  /** Full English name */
  name: string;
  /** Arabic name */
  nameAr: string;
  /** BCP-47 locale for Intl.NumberFormat */
  locale: string;
  /** Decimal places to display */
  decimals: number;
  /** Approximate minimum meaningful fare on the Wasel platform */
  minFare: number;
}

