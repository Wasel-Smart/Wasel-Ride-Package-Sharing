import { describe, expect, it } from 'vitest';
import {
  buildCorridorBetaPlan,
  evaluateCorridorExpansion,
} from '../../../src/services/corridorBeta';

describe('corridor beta planning', () => {
  it('narrows the beta to three Jordan tier-1 corridors with proof gates', () => {
    const plan = buildCorridorBetaPlan();

    expect(plan.regionCode).toBe('JO');
    expect(plan.focusCorridors).toHaveLength(3);
    expect(plan.focusCorridors.every(corridor => corridor.stage)).toBe(true);
    expect(plan.focusCorridors.every(corridor => corridor.weeklyRideGoal)).toBe(true);
    expect(plan.nextExperiment.metrics).toEqual([
      '120 weekly rides per corridor',
      '34% repeat ride rate',
      '72% supply reliability',
    ]);
  });

  it('expands only when all corridor gates are proven', () => {
    const gate = evaluateCorridorExpansion({
      weeklyRides: 130,
      weeklyRideGoal: 120,
      repeatRideRate: 0.38,
      repeatRideGoal: 0.34,
      supplyReliability: 0.78,
      weeksAtTarget: 3,
    });

    expect(gate.stage).toBe('expand');
    expect(gate.decision).toBe('expand');
    expect(gate.blockers).toEqual([]);
  });

  it('keeps a corridor narrowed when repeat rides are not proven', () => {
    const gate = evaluateCorridorExpansion({
      weeklyRides: 126,
      weeklyRideGoal: 120,
      repeatRideRate: 0.27,
      repeatRideGoal: 0.34,
      supplyReliability: 0.76,
      weeksAtTarget: 1,
    });

    expect(gate.stage).toBe('narrow');
    expect(gate.blockers).toEqual(['repeat ride rate', 'three-week consistency']);
  });
});
