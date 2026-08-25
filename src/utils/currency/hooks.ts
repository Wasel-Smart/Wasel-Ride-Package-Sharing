import type { SupportedCurrency } from './types';
import { CurrencyService } from './service';
import { PLATFORM_CURRENCY } from './types';

export function useCurrency() {
  const svc = CurrencyService.getInstance();

  return {
    /** ISO-4217 code of the active display currency */
    current: svc.current,
    /** Full config object for the active currency */
    config: svc.config,
    /** Switch the active display currency */
    setCurrency: (code: SupportedCurrency) => svc.setCurrency(code),
    /** Format an amount in the active (or specified) currency */
    format: (amount: number, currency?: SupportedCurrency) => svc.format(amount, currency),
    /** Short format: symbol + amount */
    formatShort: (amount: number, currency?: SupportedCurrency) =>
      svc.formatShort(amount, currency),
    /** Convert a JOD amount to the active display currency and format it */
    formatFromJOD: (jodAmount: number) => svc.formatFromJOD(jodAmount),
    /** Convert a JOD amount to the active display currency (unformatted) */
    fromJOD: (amount: number, to?: SupportedCurrency) => svc.fromJOD(amount, to),
    /** Convert a display-currency amount back to JOD */
    toJOD: (amount: number, from?: SupportedCurrency) => svc.toJOD(amount, from),
    /** General cross-currency conversion */
    convert: (amount: number, from: SupportedCurrency, to: SupportedCurrency) =>
      svc.convert(amount, from, to),
    /** Currency symbol for the active currency */
    symbol: svc.getSymbol(),
    /** Platform settlement currency (always JOD) */
    platformCurrency: PLATFORM_CURRENCY,
    /** Minimum fare in the active display currency */
    minFare: svc.minFare,
    /** All supported currencies */
    available: svc.getAvailable(),
  };
}

