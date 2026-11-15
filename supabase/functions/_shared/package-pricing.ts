const PACKAGE_BASE_PRICE_JOD = 3.5;
const PACKAGE_DISTANCE_KM = 8;
const PACKAGE_DISTANCE_RATE_JOD = 0.22;
const PACKAGE_WEIGHT_RATE_JOD = 0.35;

/** Server-owned package quote matching the checkout calculation. */
export function calculatePackageDeliveryFee(weightKg: unknown): number {
  const parsedWeight = Number(weightKg);
  const weight = Number.isFinite(parsedWeight) ? Math.max(0, parsedWeight) : 0.5;
  const distanceCharge = Math.max(1, PACKAGE_DISTANCE_KM) * PACKAGE_DISTANCE_RATE_JOD;
  const weightCharge = Math.max(0, weight - 1) * PACKAGE_WEIGHT_RATE_JOD;
  return Number((PACKAGE_BASE_PRICE_JOD + distanceCharge + weightCharge).toFixed(2));
}
