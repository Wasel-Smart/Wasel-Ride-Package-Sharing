// Canonical currency utilities.
// Source of truth for minor-unit conversion and currency formatting across web, mobile, and server.

// ISO-4217 currencies whose minor unit is 1/1000. Stripe additionally rejects
// amounts for these that are not a multiple of 10, so card amounts are rounded
// to 0.01 major units. Mirrors STRIPE_THREE_DECIMAL_CURRENCIES in the edge.
const THREE_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set(['jod', 'kwd', 'bhd', 'omr', 'tnd']);

export function minorUnitExponent(currency: string): number {
  return THREE_DECIMAL_CURRENCIES.has(String(currency ?? '').trim().toLowerCase()) ? 3 : 2;
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * (minorUnitExponent(currency) === 3 ? 1000 : 100));
}

// Stripe rejects a three-decimal currency whose amount is not a multiple of 10
// minor units (e.g. 5124 fils), so card amounts are rounded to the nearest 10.
export function toStripeMinorUnits(amount: number, currency: string): number {
  const minor = toMinorUnits(amount, currency);
  return minorUnitExponent(currency) === 3 ? Math.round(minor / 10) * 10 : minor;
}

export function fromMinorUnits(minorAmount: number, currency: string): number {
  const divisor = minorUnitExponent(currency) === 3 ? 1000 : 100;
  return Number((minorAmount / divisor).toFixed(3));
}

// Bounds are applied in minor units with the currency's own exponent, so the
// same window means 0.05 JOD but 0.50 USD instead of a fixed major amount that
// would be wrong for one of them. Mirrors the edge function's bounds.
export const MIN_PAYMENT_AMOUNT_MINOR = 50;
export const MAX_PAYMENT_AMOUNT_MINOR = 5_000_000;

export function normalizeAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {return null;}
  const amount = Math.round(value);
  if (amount < 50 || amount > 500_000) {return null;}
  return amount;
}