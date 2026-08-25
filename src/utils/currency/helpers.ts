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
