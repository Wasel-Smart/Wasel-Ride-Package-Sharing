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

import { useSyncExternalStore } from 'react';
import { DEFAULT_TIMEZONE, LANGUAGE_STORAGE_KEY, sanitizeLanguage } from './locale';

export const SUPPORTED_CURRENCY_CODES = [
  'JOD', 'USD', 'EUR', 'GBP',
  'AED', 'SAR', 'EGP', 'KWD', 'BHD',
  'QAR', 'OMR', 'MAD', 'TND', 'IQD',
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

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  JOD: {
    code:    'JOD',
    symbol:  'د.أ',
    name:    'Jordanian Dinar',
    nameAr:  'الدينار الأردني',
    locale:  'ar-JO',
    decimals: 3,
    minFare: 0.5,
  },
  USD: {
    code:    'USD',
    symbol:  '$',
    name:    'US Dollar',
    nameAr:  'دولار أمريكي',
    locale:  'en-US',
    decimals: 2,
    minFare: 0.7,
  },
  EUR: {
    code:    'EUR',
    symbol:  '€',
    name:    'Euro',
    nameAr:  'يورو',
    locale:  'de-DE',
    decimals: 2,
    minFare: 0.65,
  },
  GBP: {
    code:    'GBP',
    symbol:  '£',
    name:    'British Pound',
    nameAr:  'جنيه إسترليني',
    locale:  'en-GB',
    decimals: 2,
    minFare: 0.55,
  },
  AED: {
    code:    'AED',
    symbol:  'د.إ',
    name:    'UAE Dirham',
    nameAr:  'درهم إماراتي',
    locale:  'ar-AE',
    decimals: 2,
    minFare: 2.5,
  },
  SAR: {
    code:    'SAR',
    symbol:  'ر.س',
    name:    'Saudi Riyal',
    nameAr:  'ريال سعودي',
    locale:  'ar-SA',
    decimals: 2,
    minFare: 2.5,
  },
  EGP: {
    code:    'EGP',
    symbol:  'ج.م',
    name:    'Egyptian Pound',
    nameAr:  'جنيه مصري',
    locale:  'ar-EG',
    decimals: 2,
    minFare: 20,
  },
  KWD: {
    code:    'KWD',
    symbol:  'د.ك',
    name:    'Kuwaiti Dinar',
    nameAr:  'دينار كويتي',
    locale:  'ar-KW',
    decimals: 3,
    minFare: 0.15,
  },
  BHD: {
    code:    'BHD',
    symbol:  'د.ب',
    name:    'Bahraini Dinar',
    nameAr:  'دينار بحريني',
    locale:  'ar-BH',
    decimals: 3,
    minFare: 0.18,
  },
  QAR: {
    code:    'QAR',
    symbol:  'ر.ق',
    name:    'Qatari Riyal',
    nameAr:  'ريال قطري',
    locale:  'ar-QA',
    decimals: 2,
    minFare: 2.5,
  },
  OMR: {
    code:    'OMR',
    symbol:  'ر.ع',
    name:    'Omani Rial',
    nameAr:  'ريال عُماني',
    locale:  'ar-OM',
    decimals: 3,
    minFare: 0.20,
  },
  MAD: {
    code:    'MAD',
    symbol:  'د.م',
    name:    'Moroccan Dirham',
    nameAr:  'درهم مغربي',
    locale:  'ar-MA',
    decimals: 2,
    minFare: 8,
  },
  TND: {
    code:    'TND',
    symbol:  'د.ت',
    name:    'Tunisian Dinar',
    nameAr:  'دينار تونسي',
    locale:  'ar-TN',
    decimals: 3,
    minFare: 1.5,
  },
  IQD: {
    code:    'IQD',
    symbol:  'ع.د',
    name:    'Iraqi Dinar',
    nameAr:  'دينار عراقي',
    locale:  'ar-IQ',
    decimals: 0,
    minFare: 1000,
  },
};

// Exchange rates (base: JOD)
// In production, these should be refreshed from a live exchange-rate API
// (e.g., exchangerate-api.com) at least once per hour.

export const EXCHANGE_RATES_FROM_JOD: Record<SupportedCurrency, number> = {
  JOD: 1.000,
  USD: 1.410,
  EUR: 1.300,
  GBP: 1.115,
  AED: 5.180,
  SAR: 5.290,
  EGP: 68.50,
  KWD: 0.435,
  BHD: 0.531,
  QAR: 5.150,
  OMR: 0.545,
  MAD: 14.10,
  TND: 4.35,
  IQD: 1850,
};

// ─── Typed monetary value ─────────────────────────────────────────────────────

/** A monetary value that always carries its currency. */
export interface Money {
  amount: number;
  currency: SupportedCurrency;
}

/** Create a Money object with explicit currency. */
export function money(amount: number, currency: SupportedCurrency = PLATFORM_CURRENCY): Money {
  return { amount, currency };
}

// ─── Currency service ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'wasel-preferred-currency';
const CURRENCY_CHANGE_EVENT = 'wasel-currency-change';

function emitCurrencyChange(code: SupportedCurrency): void {
  if (typeof window === 'undefined') {return;}

  window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT));

  try {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: code }));
  } catch {
    // Synthetic StorageEvent is not available in every runtime.
  }
}

export class CurrencyService {
  private static _instance: CurrencyService | null = null;
  private _current: SupportedCurrency;

  private constructor() {
    this._current = this._detectPreference();
  }

  static getInstance(): CurrencyService {
    if (!CurrencyService._instance) {
      CurrencyService._instance = new CurrencyService();
    }
    return CurrencyService._instance;
  }

  static getCurrencyConfig(code: SupportedCurrency): CurrencyConfig {
    return CURRENCIES[code];
  }

  static formatAmount(amount: number, currency: SupportedCurrency = PLATFORM_CURRENCY): string {
    return CurrencyService.getInstance().format(amount, currency);
  }

  // ── Preference detection ──────────────────────────────────────────────────

  private _detectPreference(): SupportedCurrency {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(saved)) {
        return saved as SupportedCurrency;
      }
    } catch {
      // localStorage unavailable (SSR / private mode)
    }

    // Infer from browser locale — Jordan is primary, so JOD first.
    const lang = typeof navigator === 'undefined' ? 'ar-jo' : navigator.language.toLowerCase();
    const timezone =
      typeof Intl === 'undefined'
        ? DEFAULT_TIMEZONE
        : Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    if (lang.includes('-jo') || timezone === DEFAULT_TIMEZONE) {return 'JOD';}
    if (lang.startsWith('ar'))                                  {return 'JOD';}
    if (lang.startsWith('en-gb'))                            {return 'GBP';}
    if (lang.startsWith('ar-ae'))                            {return 'AED';}
    if (lang.startsWith('ar-sa'))                            {return 'SAR';}
    if (lang.startsWith('ar-eg'))                            {return 'EGP';}
    if (lang.startsWith('ar-kw'))                            {return 'KWD';}
    if (lang.startsWith('ar-bh'))                            {return 'BHD';}
    if (lang.startsWith('ar-qa'))                            {return 'QAR';}
    if (lang.startsWith('ar-om'))                            {return 'OMR';}
    if (lang.startsWith('ar-ma'))                            {return 'MAD';}
    if (lang.startsWith('ar-tn'))                            {return 'TND';}
    if (lang.startsWith('ar-iq'))                            {return 'IQD';}
    if (lang.startsWith('de') || lang.startsWith('fr'))      {return 'EUR';}
    if (lang.startsWith('en'))                               {return 'USD';}

    return PLATFORM_CURRENCY;
  }

  private getRuntimeLocale(defaultLocale: string): string {
    if (typeof window === 'undefined') {
      return defaultLocale;
    }

    try {
      const storedLanguage = sanitizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
      return storedLanguage === 'ar' ? 'ar-JO' : 'en-JO';
    } catch {
      return defaultLocale;
    }
  }

  // ── Getters / setters ─────────────────────────────────────────────────────

  get current(): SupportedCurrency   { return this._current; }
  get config():  CurrencyConfig      { return CURRENCIES[this._current]; }
  get minFare(): number              { return CURRENCIES[this._current].minFare; }

  setCurrency(code: SupportedCurrency): void {
    this._current = code;
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* noop */ }
    emitCurrencyChange(code);
  }

  // ── Conversion ────────────────────────────────────────────────────────────

  /**
   * Convert a JOD amount to the display currency.
   * All backend amounts are stored in JOD.
   */
  fromJOD(jodAmount: number, to: SupportedCurrency = this._current): number {
    if (to === 'JOD') {return jodAmount;}
    const rate = EXCHANGE_RATES_FROM_JOD[to];
    return Math.round(jodAmount * rate * 1_000) / 1_000;
  }

  /**
   * Convert a display-currency amount back to JOD for storage / API calls.
   */
  toJOD(amount: number, from: SupportedCurrency = this._current): number {
    if (from === 'JOD') {return amount;}
    const rate = EXCHANGE_RATES_FROM_JOD[from];
    return Math.round((amount / rate) * 1_000) / 1_000;
  }

  /**
   * Convert between any two supported currencies via JOD as the pivot.
   */
  convert(amount: number, from: SupportedCurrency, to: SupportedCurrency): number {
    if (from === to) {return amount;}
    const inJOD  = this.toJOD(amount, from);
    return this.fromJOD(inJOD, to);
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  /**
   * Format an amount in the given (or current) currency using Intl.NumberFormat.
   * @example format(3.5, 'JOD') → "3.500 د.أ"
   */
  format(amount: number, currency?: SupportedCurrency): string {
    const curr   = currency ?? this._current;
    const config = CURRENCIES[curr];
    const locale = this.getRuntimeLocale(config.locale);
    try {
      return new Intl.NumberFormat(locale, {
        style:                 'currency',
        currency:              config.code,
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals,
      }).format(amount);
    } catch {
      // Fallback if Intl doesn't recognise the currency (rare)
      return `${amount.toFixed(config.decimals)} ${config.symbol}`;
    }
  }

  /**
   * Short format: symbol + amount, no Intl (useful for compact UI).
   * @example formatShort(3.5, 'JOD') → "د.أ 3.500"
   */
  formatShort(amount: number, currency?: SupportedCurrency): string {
    const curr   = currency ?? this._current;
    const config = CURRENCIES[curr];
    return `${config.symbol} ${amount.toFixed(config.decimals)}`;
  }

  /**
   * Format a JOD amount for display in the user's preferred currency.
   * Convenience wrapper for fromJOD + format.
   */
  formatFromJOD(jodAmount: number): string {
    const displayAmount = this.fromJOD(jodAmount);
    return this.format(displayAmount);
  }

  getSymbol(currency?: SupportedCurrency): string {
    return CURRENCIES[currency ?? this._current].symbol;
  }

  getAvailable(): CurrencyConfig[] {
    return SUPPORTED_CURRENCY_CODES.map((c) => CURRENCIES[c]);
  }
}

// ─── Standalone helper functions ──────────────────────────────────────────────

/**
 * Standalone formatCurrency helper for use outside React components.
 * Uses the CurrencyService singleton.
 * @example formatCurrency(8.5) → "8.500 د.أ"
 */
export function formatCurrency(amount: number, currency?: SupportedCurrency): string {
  const svc = CurrencyService.getInstance();
  return svc.format(amount, currency);
}

/**
 * Format a JOD amount in the user's preferred currency.
 * @example formatCurrencyFromJOD(8.5) → converts to display currency then formats
 */
export function formatCurrencyFromJOD(jodAmount: number): string {
  const svc = CurrencyService.getInstance();
  return svc.formatFromJOD(jodAmount);
}

/**
 * Get the current currency symbol.
 * @example getCurrencySymbol() → "د.أ"
 */
export function getCurrencySymbol(currency?: SupportedCurrency): string {
  const svc = CurrencyService.getInstance();
  return svc.getSymbol(currency);
}

// ─── React hook ───────────────────────────────────────────────────────────────

/**
 * useCurrency — React hook that exposes the CurrencyService singleton.
 *
 * @example
 * const { format, fromJOD, setCurrency, current } = useCurrency();
 * <span>{format(fromJOD(trip.price_jod))}</span>
 */
export function useCurrency() {
  const svc = CurrencyService.getInstance();
  const current = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {return () => {};}

      const handleCurrencyChange = () => onStoreChange();
      const handleStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) {onStoreChange();}
      };

      window.addEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
      window.addEventListener('storage', handleStorage);

      return () => {
        window.removeEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
        window.removeEventListener('storage', handleStorage);
      };
    },
    () => svc.current,
    () => PLATFORM_CURRENCY,
  );

  return {
    /** ISO-4217 code of the active display currency */
    current,
    /** Full config object for the active currency */
    config: CURRENCIES[current],
    /** Switch the active display currency */
    setCurrency: (code: SupportedCurrency) => svc.setCurrency(code),
    /** Format an amount in the active (or specified) currency */
    format:      (amount: number, currency?: SupportedCurrency) => svc.format(amount, currency),
    /** Short format: symbol + amount */
    formatShort: (amount: number, currency?: SupportedCurrency) => svc.formatShort(amount, currency),
    /** Convert a JOD amount to the active display currency and format it */
    formatFromJOD: (jodAmount: number) => svc.formatFromJOD(jodAmount),
    /** Convert a JOD amount to the active display currency (unformatted) */
    fromJOD:     (amount: number, to?: SupportedCurrency) => svc.fromJOD(amount, to),
    /** Convert a display-currency amount back to JOD */
    toJOD:       (amount: number, from?: SupportedCurrency) => svc.toJOD(amount, from),
    /** General cross-currency conversion */
    convert:     (amount: number, from: SupportedCurrency, to: SupportedCurrency) =>
                   svc.convert(amount, from, to),
    /** Currency symbol for any supported currency, defaulting to the active one */
    getSymbol:   (currency?: SupportedCurrency) => svc.getSymbol(currency ?? current),
    /** Currency symbol for the active currency */
    symbol:      svc.getSymbol(current),
    /** Platform settlement currency (always JOD) */
    platformCurrency: PLATFORM_CURRENCY,
    /** Minimum fare in the active display currency */
    minFare:     CURRENCIES[current].minFare,
    /** All supported currencies */
    available:   svc.getAvailable(),
  };
}
