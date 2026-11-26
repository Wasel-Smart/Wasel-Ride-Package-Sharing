// Default platform commission rate (must match commission_config seed).
// The authoritative value lives in the DB; this constant is used only
// for client-side fare previews before a booking is confirmed.
export const DEFAULT_COMMISSION_RATE_PCT = 12.0;

/**
 * Split a booking amount into platform fee and driver earning.
 * Mirrors the SQL calculate_commission() function in 20261126030000.
 * Values are rounded to 3 decimal places (fils-level precision for JOD).
 */
export function calculateCommission(
  amount: number,
  ratePct: number = DEFAULT_COMMISSION_RATE_PCT,
): { platformFee: number; driverEarning: number; ratePct: number } {
  const platformFee  = Math.round(amount * ratePct / 100 * 1000) / 1000;
  const driverEarning = Math.round((amount - platformFee) * 1000) / 1000;
  return { platformFee, driverEarning, ratePct };
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateDirectPrice(
  type: 'passenger' | 'package',
  weight?: number,
  distanceKm?: number,
  basePrice?: number,
): {
  price: number;
  currency: string;
  breakdown: { base: number; distance: number; package: number };
} {
  const resolvedDistance = Math.max(1, toNumber(distanceKm, 8));
  const resolvedBase = Math.max(1, toNumber(basePrice, type === 'package' ? 3.5 : 2.5));
  const packageSurcharge = type === 'package' ? Math.max(0, toNumber(weight, 0.5) - 1) * 0.35 : 0;
  const distanceCharge = resolvedDistance * (type === 'package' ? 0.22 : 0.18);
  const price = Number((resolvedBase + distanceCharge + packageSurcharge).toFixed(3));
  return {
    price,
    currency: 'JOD',
    breakdown: {
      base: resolvedBase,
      distance: Number(distanceCharge.toFixed(3)),
      package: Number(packageSurcharge.toFixed(3)),
    },
  };
}
