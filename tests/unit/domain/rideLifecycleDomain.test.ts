import { describe, expect, it } from 'vitest';
import {
  mapBookingStatusToRideLifecycleState,
  projectRideLifecycleState,
} from '../../../src/domain/rides/lifecycle';

describe('ride lifecycle domain', () => {
  it('maps legacy booking statuses into canonical ride lifecycle states', () => {
    expect(mapBookingStatusToRideLifecycleState('pending_driver')).toBe('requested');
    expect(mapBookingStatusToRideLifecycleState('confirmed')).toBe('accepted');
    expect(mapBookingStatusToRideLifecycleState('completed')).toBe('completed');
  });

  it('allows forward progression through the canonical ride state machine', () => {
    expect(projectRideLifecycleState('requested', 'matched')).toBe('matched');
    expect(projectRideLifecycleState('matched', 'accepted')).toBe('accepted');
    expect(projectRideLifecycleState('accepted', 'in_progress')).toBe('in_progress');
    expect(projectRideLifecycleState('in_progress', 'completed')).toBe('completed');
  });

  it('rejects invalid backwards transitions', () => {
    expect(() => projectRideLifecycleState('accepted', 'requested')).toThrow();
    expect(() => projectRideLifecycleState('completed', 'accepted')).toThrow();
  });
});
