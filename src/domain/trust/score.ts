/**
 * The one client-side trust-score formula.  All account surfaces must use this
 * mapper so a profile change is reflected consistently in Profile, Home and
 * Trust Center.
 */
export interface TrustScoreInput {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  trips?: number;
  rating?: number;
}

const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function deriveAccountTrustScore(input: TrustScoreInput): number {
  const trips = Math.max(0, finiteNumber(input.trips));
  const rating = Math.max(0, Math.min(5, finiteNumber(input.rating)));
  const score =
    45 +
    (input.emailVerified ? 10 : 0) +
    (input.phoneVerified ? 10 : 0) +
    (input.emailVerified && input.phoneVerified ? 15 : 0) +
    Math.min(trips, 50) * 0.4 +
    rating * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}
