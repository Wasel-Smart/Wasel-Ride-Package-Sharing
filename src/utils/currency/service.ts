export interface Money {
  amount: number;
  currency: SupportedCurrency;
}

/** Create a Money object with explicit currency. */
export function money(amount: number, currency: SupportedCurrency = PLATFORM_CURRENCY): Money {
  return { amount, currency };
}

// ─── Currency service ─────────────────────────────────────────────────────────

const STORAGE_KEY = import.meta.env.VITE_CURRENCY_STORAGE_KEY || 'wasel-preferred-currency';

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
    if (lang.startsWith('ar-jo') || lang.startsWith('ar')) return 'JOD';
    if (lang.startsWith('en-gb')) return 'GBP';
    if (lang.startsWith('ar-ae')) return 'AED';
    if (lang.startsWith('ar-sa')) return 'SAR';
    if (lang.startsWith('ar-eg')) return 'EGP';
    if (lang.startsWith('ar-kw')) return 'KWD';
    if (lang.startsWith('ar-bh')) return 'BHD';
    if (lang.startsWith('ar-qa')) return 'QAR';
    if (lang.startsWith('ar-om')) return 'OMR';
    if (lang.startsWith('ar-ma')) return 'MAD';
    if (lang.startsWith('ar-tn')) return 'TND';
    if (lang.startsWith('ar-iq')) return 'IQD';
    if (lang.startsWith('de') || lang.startsWith('fr')) return 'EUR';
    if (lang.startsWith('en')) return 'USD';

    return PLATFORM_CURRENCY;
  }

  // ── Getters / setters ─────────────────────────────────────────────────────

  get current(): SupportedCurrency {
    return this._current;
  }
  get config(): CurrencyConfig {
    return CURRENCIES[this._current];
  }
  get minFare(): number {
    return CURRENCIES[this._current].minFare;
  }

  setCurrency(code: SupportedCurrency): void {
    this._current = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* noop */
    }
  }

  // ── Conversion ────────────────────────────────────────────────────────────

  /**
   * Convert a JOD amount to the display currency.
   * All backend amounts are stored in JOD.
   */
  fromJOD(jodAmount: number, to: SupportedCurrency = this._current): number {
    if (to === 'JOD') return jodAmount;
    const rate = EXCHANGE_RATES_FROM_JOD[to];
    return Math.round(jodAmount * rate * 1_000) / 1_000;
  }

  /**
   * Convert a display-currency amount back to JOD for storage / API calls.
   */
  toJOD(amount: number, from: SupportedCurrency = this._current): number {
    if (from === 'JOD') return amount;
    const rate = EXCHANGE_RATES_FROM_JOD[from];
    return Math.round((amount / rate) * 1_000) / 1_000;
  }

  /**
   * Convert between any two supported currencies via JOD as the pivot.
   */
  convert(amount: number, from: SupportedCurrency, to: SupportedCurrency): number {
    if (from === to) return amount;
    const inJOD = this.toJOD(amount, from);
    return this.fromJOD(inJOD, to);
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  /**
   * Format an amount in the given (or current) currency using Intl.NumberFormat.
   * @example format(3.5, 'JOD') → "3.500 د.أ"
   */
  format(amount: number, currency?: SupportedCurrency): string {
    const curr = currency ?? this._current;
    const config = CURRENCIES[curr];
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
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
    const curr = currency ?? this._current;
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
    return SUPPORTED_CURRENCY_CODES.map(c => CURRENCIES[c]);
  }
}

