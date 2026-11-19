/**
 * Extended coverage for domain lifecycle modules.
 * Pins every transition edge-case in the ride, package, and driver availability
 * state machines so a regression shows up immediately in CI.
 */
import { describe, it, expect } from 'vitest';

import {
  RIDE_LIFECYCLE_TRANSITIONS,
  mapBookingStatusToRideLifecycleState,
  mapRideLifecycleStateToBookingStatus,
  projectRideLifecycleState,
  type RideLifecycleState,
  type LegacyRideBookingStatus,
} from '../../src/domain/rides/lifecycle';

import {
  PACKAGE_LIFECYCLE_TRANSITIONS,
  canProjectPackageLifecycle,
  mapLegacyPackageStatusToLifecycle,
  type PackageLifecycleState,
} from '../../src/domain/packages/lifecycle';

import { canTransition } from '../../src/domain/shared/stateMachine';

// ── Ride lifecycle ────────────────────────────────────────────────────────────

describe('Ride lifecycle — RIDE_LIFECYCLE_TRANSITIONS', () => {
  it('allows the happy path in order', () => {
    const path: RideLifecycleState[] = ['requested', 'matched', 'accepted', 'in_progress', 'completed'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!, RIDE_LIFECYCLE_TRANSITIONS)).toBe(true);
    }
  });

  it('allows cancellation from every non-terminal state', () => {
    const cancellable: RideLifecycleState[] = ['requested', 'matched', 'accepted', 'in_progress'];
    for (const state of cancellable) {
      expect(canTransition(state, 'cancelled', RIDE_LIFECYCLE_TRANSITIONS)).toBe(true);
    }
  });

  it('blocks reverse transitions', () => {
    expect(canTransition('matched', 'requested', RIDE_LIFECYCLE_TRANSITIONS)).toBe(false);
    expect(canTransition('completed', 'in_progress', RIDE_LIFECYCLE_TRANSITIONS)).toBe(false);
  });

  it('blocks transitions from terminal states', () => {
    expect(canTransition('completed', 'cancelled', RIDE_LIFECYCLE_TRANSITIONS)).toBe(false);
    expect(canTransition('cancelled', 'requested', RIDE_LIFECYCLE_TRANSITIONS)).toBe(false);
  });
});

describe('mapBookingStatusToRideLifecycleState', () => {
  const cases: [LegacyRideBookingStatus, RideLifecycleState][] = [
    ['pending_driver', 'requested'],
    ['confirmed', 'accepted'],
    ['completed', 'completed'],
    ['cancelled', 'cancelled'],
    ['rejected', 'cancelled'],
    ['unknown', 'requested'],
  ];

  for (const [input, expected] of cases) {
    it(`maps "${input}" → "${expected}"`, () => {
      expect(mapBookingStatusToRideLifecycleState(input)).toBe(expected);
    });
  }
});

describe('mapRideLifecycleStateToBookingStatus', () => {
  const cases: [RideLifecycleState, LegacyRideBookingStatus][] = [
    ['requested', 'pending_driver'],
    ['matched', 'pending_driver'],
    ['accepted', 'confirmed'],
    ['in_progress', 'confirmed'],
    ['completed', 'completed'],
    ['cancelled', 'cancelled'],
  ];

  for (const [input, expected] of cases) {
    it(`maps "${input}" → "${expected}"`, () => {
      expect(mapRideLifecycleStateToBookingStatus(input)).toBe(expected);
    });
  }
});

describe('projectRideLifecycleState', () => {
  it('returns same state when current === target', () => {
    expect(projectRideLifecycleState('requested', 'requested')).toBe('requested');
  });

  it('cancels from any non-terminal state', () => {
    expect(projectRideLifecycleState('matched', 'cancelled')).toBe('cancelled');
    expect(projectRideLifecycleState('in_progress', 'cancelled')).toBe('cancelled');
  });

  it('throws when trying to advance from a terminal state', () => {
    expect(() => projectRideLifecycleState('completed', 'requested')).toThrow();
    expect(() => projectRideLifecycleState('cancelled', 'requested')).toThrow();
  });

  it('allows forward projection', () => {
    expect(projectRideLifecycleState('requested', 'in_progress')).toBe('in_progress');
  });

  it('throws for backward projection', () => {
    expect(() => projectRideLifecycleState('in_progress', 'matched')).toThrow();
  });
});

// ── Package lifecycle ─────────────────────────────────────────────────────────

describe('Package lifecycle — PACKAGE_LIFECYCLE_TRANSITIONS', () => {
  it('allows the happy path in order', () => {
    const path: PackageLifecycleState[] = ['created', 'assigned', 'picked_up', 'in_transit', 'delivered'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!, PACKAGE_LIFECYCLE_TRANSITIONS)).toBe(true);
    }
  });

  it('blocks cancellation from delivered', () => {
    expect(canTransition('delivered', 'cancelled', PACKAGE_LIFECYCLE_TRANSITIONS)).toBe(false);
  });

  it('blocks reverse transitions', () => {
    expect(canTransition('in_transit', 'created', PACKAGE_LIFECYCLE_TRANSITIONS)).toBe(false);
  });
});

describe('canProjectPackageLifecycle', () => {
  it('returns true for same-state', () => {
    expect(canProjectPackageLifecycle('created', 'created')).toBe(true);
  });

  it('allows cancellation from any non-delivered state', () => {
    const states: PackageLifecycleState[] = ['created', 'assigned', 'picked_up', 'in_transit'];
    for (const s of states) {
      expect(canProjectPackageLifecycle(s, 'cancelled')).toBe(true);
    }
  });

  it('blocks cancellation from delivered', () => {
    expect(canProjectPackageLifecycle('delivered', 'cancelled')).toBe(false);
  });

  it('blocks reverse valid-transition check', () => {
    expect(canProjectPackageLifecycle('in_transit', 'created')).toBe(false);
  });
});

describe('mapLegacyPackageStatusToLifecycle', () => {
  const cases = [
    ['created', 'created'],
    ['matched', 'assigned'],
    ['pickup_scheduled', 'assigned'],
    ['picked_up', 'picked_up'],
    ['in_transit', 'in_transit'],
    ['near_destination', 'in_transit'],
    ['delivered', 'delivered'],
    ['cancelled', 'cancelled'],
    ['disputed', 'cancelled'],
    ['unknown', 'created'],
  ] as const;

  for (const [input, expected] of cases) {
    it(`maps "${input}" → "${expected}"`, () => {
      expect(mapLegacyPackageStatusToLifecycle(input)).toBe(expected);
    });
  }
});
