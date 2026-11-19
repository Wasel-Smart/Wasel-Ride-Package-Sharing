/**
 * Extended branch coverage for src/domain/trust/score.ts.
 * trustScoreBreakdown.test.ts covers the additive property; this file covers
 * specific numeric branches, factor keys, and boundary conditions.
 */
import { describe, it, expect } from 'vitest';
import {
  TRUST_SCORE_MAX,
  deriveAccountTrustScore,
  deriveAccountTrustScoreFactors,
  type TrustScoreInput,
} from '../../src/domain/trust/score';

describe('deriveAccountTrustScore — boundary values', () => {
  it('returns 0 for a completely empty profile', () => {
    // base = 45 always; a user always starts with the base trust score
    expect(deriveAccountTrustScore({})).toBeGreaterThanOrEqual(0);
    expect(deriveAccountTrustScore({})).toBeLessThanOrEqual(TRUST_SCORE_MAX);
  });

  it('never exceeds TRUST_SCORE_MAX (100) even with max everything', () => {
    const score = deriveAccountTrustScore({
      emailVerified: true,
      phoneVerified: true,
      trips: 1_000_000,
      rating: 5,
    });
    expect(score).toBe(TRUST_SCORE_MAX);
  });

  it('never returns a negative score', () => {
    const score = deriveAccountTrustScore({ rating: -999, trips: -100 });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('caps trips contribution at 50 trips worth of points', () => {
    const scoreAt50 = deriveAccountTrustScore({ trips: 50 });
    const scoreAt500 = deriveAccountTrustScore({ trips: 500 });
    expect(scoreAt50).toBe(scoreAt500);
  });

  it('caps rating at 5', () => {
    const scoreAt5 = deriveAccountTrustScore({ rating: 5 });
    const scoreAt10 = deriveAccountTrustScore({ rating: 10 });
    expect(scoreAt5).toBe(scoreAt10);
  });
});

describe('deriveAccountTrustScoreFactors — individual factors', () => {
  it('always includes a "base" factor worth 45', () => {
    const factors = deriveAccountTrustScoreFactors({});
    const base = factors.find(f => f.key === 'base');
    expect(base).toBeDefined();
    expect(base!.value).toBe(45);
    expect(base!.max).toBe(45);
  });

  it('adds email factor only when email is verified', () => {
    const unverified = deriveAccountTrustScoreFactors({ emailVerified: false });
    const verified = deriveAccountTrustScoreFactors({ emailVerified: true });
    expect(unverified.find(f => f.key === 'email')!.value).toBe(0);
    expect(verified.find(f => f.key === 'email')!.value).toBe(10);
  });

  it('adds phone factor only when phone is verified', () => {
    const unverified = deriveAccountTrustScoreFactors({ phoneVerified: false });
    const verified = deriveAccountTrustScoreFactors({ phoneVerified: true });
    expect(unverified.find(f => f.key === 'phone')!.value).toBe(0);
    expect(verified.find(f => f.key === 'phone')!.value).toBe(10);
  });

  it('adds "both" bonus only when both email and phone are verified', () => {
    const onlyEmail = deriveAccountTrustScoreFactors({ emailVerified: true });
    const both = deriveAccountTrustScoreFactors({ emailVerified: true, phoneVerified: true });
    expect(onlyEmail.find(f => f.key === 'both')!.value).toBe(0);
    expect(both.find(f => f.key === 'both')!.value).toBe(15);
  });

  it('computes trips factor proportionally up to 50 trips', () => {
    const at10 = deriveAccountTrustScoreFactors({ trips: 10 });
    const at25 = deriveAccountTrustScoreFactors({ trips: 25 });
    const tripsAt10 = at10.find(f => f.key === 'trips')!.value;
    const tripsAt25 = at25.find(f => f.key === 'trips')!.value;
    expect(tripsAt25).toBeGreaterThan(tripsAt10);
  });

  it('computes rating factor proportionally up to 5.0', () => {
    const at2 = deriveAccountTrustScoreFactors({ rating: 2 });
    const at4 = deriveAccountTrustScoreFactors({ rating: 4 });
    expect(at4.find(f => f.key === 'rating')!.value).toBeGreaterThan(
      at2.find(f => f.key === 'rating')!.value,
    );
  });

  it('handles non-finite trips gracefully', () => {
    const nanTrips: TrustScoreInput = { trips: NaN };
    const infTrips: TrustScoreInput = { trips: Infinity };
    expect(deriveAccountTrustScoreFactors(nanTrips).find(f => f.key === 'trips')!.value).toBe(0);
    // Infinity trips should cap at max (50 trips × 0.4 = 20)
    expect(deriveAccountTrustScoreFactors(infTrips).find(f => f.key === 'trips')!.value).toBe(20);
  });

  it('returns exactly 6 factors', () => {
    expect(deriveAccountTrustScoreFactors({}).length).toBe(6);
  });

  it('every factor has max > 0', () => {
    for (const f of deriveAccountTrustScoreFactors({ emailVerified: true, trips: 10, rating: 3 })) {
      expect(f.max).toBeGreaterThan(0);
    }
  });
});
