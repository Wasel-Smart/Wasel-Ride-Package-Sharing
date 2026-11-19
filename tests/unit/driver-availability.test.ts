/**
 * Tests for src/domain/drivers/availability.ts — currently zero coverage.
 */
import { describe, it, expect } from 'vitest';
import {
  DRIVER_AVAILABILITY_TRANSITIONS,
  canTransitionDriverAvailability,
  type DriverAvailabilityState,
} from '../../src/domain/drivers/availability';
import { canTransition } from '../../src/domain/shared/stateMachine';

describe('DRIVER_AVAILABILITY_TRANSITIONS', () => {
  it('allows offline → available (driver comes online)', () => {
    expect(canTransition('offline', 'available', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows available → reserved (trip assigned)', () => {
    expect(canTransition('available', 'reserved', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows available → offline (driver goes offline)', () => {
    expect(canTransition('available', 'offline', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows reserved → on_trip (trip started)', () => {
    expect(canTransition('reserved', 'on_trip', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows reserved → available (reservation cancelled)', () => {
    expect(canTransition('reserved', 'available', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows reserved → offline', () => {
    expect(canTransition('reserved', 'offline', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows on_trip → cooldown (trip completed)', () => {
    expect(canTransition('on_trip', 'cooldown', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows cooldown → available (ready again)', () => {
    expect(canTransition('cooldown', 'available', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('allows cooldown → offline', () => {
    expect(canTransition('cooldown', 'offline', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(true);
  });

  it('blocks on_trip → available (must pass through cooldown)', () => {
    expect(canTransition('on_trip', 'available', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(false);
  });

  it('blocks on_trip → offline (must pass through cooldown)', () => {
    expect(canTransition('on_trip', 'offline', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(false);
  });

  it('blocks offline → on_trip (must go available first)', () => {
    expect(canTransition('offline', 'on_trip', DRIVER_AVAILABILITY_TRANSITIONS)).toBe(false);
  });
});

describe('canTransitionDriverAvailability', () => {
  it('delegates correctly to canTransition', () => {
    expect(canTransitionDriverAvailability('available', 'reserved')).toBe(true);
    expect(canTransitionDriverAvailability('cooldown', 'on_trip')).toBe(false);
  });

  it('returns true for same-state (idempotent)', () => {
    const states: DriverAvailabilityState[] = ['offline', 'available', 'reserved', 'on_trip', 'cooldown'];
    for (const s of states) {
      expect(canTransitionDriverAvailability(s, s)).toBe(true);
    }
  });

  it('covers the full happy-path lifecycle', () => {
    const path: DriverAvailabilityState[] = ['offline', 'available', 'reserved', 'on_trip', 'cooldown', 'available'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionDriverAvailability(path[i]!, path[i + 1]!)).toBe(true);
    }
  });
});
