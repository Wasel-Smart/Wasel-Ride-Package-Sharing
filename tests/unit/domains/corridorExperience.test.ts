import { describe, expect, it } from 'vitest';
import { buildCorridorExperienceSnapshot } from '@/domains/corridors/corridorExperience';
import { getCorridorTruth } from '@/services/corridorTruth';

describe('corridorExperience', () => {
  it('builds a stable cross-surface corridor snapshot from corridor truth', () => {
    const truth = getCorridorTruth({ from: 'Amman', to: 'Irbid' });
    const snapshot = buildCorridorExperienceSnapshot(truth);

    expect(snapshot.corridorId).toBeTruthy();
    expect(snapshot.corridorLabel).toBeTruthy();
    expect(snapshot.demandSource).not.toBe('none');
    expect(snapshot.quotedPriceJod).toBeTypeOf('number');
    expect(snapshot.matchingRideCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.packageReadyRideCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.liveProofSummary === null || snapshot.liveProofSummary.includes('alerts')).toBe(
      true,
    );
  });

  it('returns an empty snapshot when the corridor is unknown', () => {
    const truth = getCorridorTruth({ from: 'Nowhere', to: 'Elsewhere' });
    const snapshot = buildCorridorExperienceSnapshot(truth);

    expect(snapshot.demandSource).toBe('none');
    expect(snapshot.corridorId).toBeNull();
    expect(snapshot.quotedPriceJod).toBeNull();
    expect(snapshot.pickupSummary).toBeNull();
  });
});
