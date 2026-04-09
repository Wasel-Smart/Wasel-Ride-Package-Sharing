import { beforeEach, describe, expect, it } from 'vitest';
import {
  activateWaselPlus,
  getMovementMembershipSnapshot,
  startCommuterPass,
} from '../../../src/services/movementMembership';

const MEMBERSHIP_KEY = 'wasel-movement-membership';

describe('movementMembership', () => {
  beforeEach(() => {
    window.localStorage.removeItem(MEMBERSHIP_KEY);
  });

  it('activates Wasel Plus with renewal metadata', () => {
    activateWaselPlus();

    const snapshot = getMovementMembershipSnapshot();

    expect(snapshot.plusActive).toBe(true);
    expect(snapshot.plusRenewalDate).toBeTruthy();
    expect(snapshot.activeSubscription?.type).toBe('plus');
    expect(snapshot.activeSubscription?.planName).toBe('Wasel Plus');
  });

  it('starts a commuter pass tied to a corridor', () => {
    startCommuterPass('amman-irbid');

    const snapshot = getMovementMembershipSnapshot();

    expect(snapshot.commuterPassRouteId).toBe('amman-irbid');
    expect(snapshot.commuterPassRenewalDate).toBeTruthy();
    expect(snapshot.activeSubscription?.type).toBe('commuter-pass');
    expect(snapshot.activeSubscription?.corridorId).toBe('amman-irbid');
  });
});
