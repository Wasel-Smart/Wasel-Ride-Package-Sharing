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

/** Score ceiling. The component caps add up higher — see TRUST_SCORE_CAPPED_NOTE. */
export const TRUST_SCORE_MAX = 100;

export type TrustScoreFactorKey =
  | 'base'
  | 'email'
  | 'phone'
  | 'both'
  | 'trips'
  | 'rating';

export interface TrustScoreFactor {
  key: TrustScoreFactorKey;
  /** Points this factor actually contributed for the given account. */
  value: number;
  /** Points this factor can contribute at most. */
  max: number;
}

const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  // Allow +Infinity so that Math.min(trips, 50) can cap it correctly;
  // NaN and -Infinity both fall back to 0.
  if (Number.isNaN(parsed) || parsed === -Infinity) return fallback;
  return parsed;
};

/**
 * Per-factor breakdown of `deriveAccountTrustScore`, derived from the same
 * constants so the two can never disagree. The factors intentionally total 110
 * at full marks; the score itself is clamped to TRUST_SCORE_MAX.
 */
export function deriveAccountTrustScoreFactors(input: TrustScoreInput): TrustScoreFactor[] {
  const trips = Math.max(0, finiteNumber(input.trips));
  const rating = Math.max(0, Math.min(5, finiteNumber(input.rating)));
  const bothVerified = Boolean(input.emailVerified && input.phoneVerified);

  return [
    { key: 'base', value: 45, max: 45 },
    { key: 'email', value: input.emailVerified ? 10 : 0, max: 10 },
    { key: 'phone', value: input.phoneVerified ? 10 : 0, max: 10 },
    { key: 'both', value: bothVerified ? 15 : 0, max: 15 },
    { key: 'trips', value: Math.round(Math.min(trips, 50) * 0.4 * 10) / 10, max: 20 },
    { key: 'rating', value: Math.round(rating * 2 * 10) / 10, max: 10 },
  ];
}

export function deriveAccountTrustScore(input: TrustScoreInput): number {
  const score = deriveAccountTrustScoreFactors(input).reduce(
    (total, factor) => total + factor.value,
    0,
  );

  return Math.max(0, Math.min(TRUST_SCORE_MAX, Math.round(score)));
}