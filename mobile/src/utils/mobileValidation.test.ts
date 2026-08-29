import { describe, it, expect } from '@jest/globals';
import { validateRideRequest, validatePackageRequest, validateScheduledRide, validatePositiveInteger, validateRequiredText } from '../utils/mobileValidation';
import { validateEmail, validatePhone, validateJordanPhone, validateIraqPhone } from '../utils/security';
import { incrementOfflineRetry, createOfflineAction, resolveOfflineQueueResult } from '../utils/offlineQueue';
import { useConnectionStore } from '../stores/useConnectionStore';

describe('mobileValidation', () => {
  describe('validateRequiredText', () => {
    it('rejects empty or too-short values', () => {
      expect(validateRequiredText('', 'Name').valid).toBe(false);
      expect(validateRequiredText('a', 'Name').valid).toBe(false);
      expect(validateRequiredText('  ab  ', 'Name').valid).toBe(true);
    });
  });

  describe('validatePositiveInteger', () => {
    it('accepts whole positive numbers', () => {
      expect(validatePositiveInteger('3', 'Seats').valid).toBe(true);
    });
    it('rejects zero, negatives, and decimals', () => {
      expect(validatePositiveInteger('0', 'Seats').valid).toBe(false);
      expect(validatePositiveInteger('-1', 'Seats').valid).toBe(false);
      expect(validatePositiveInteger('2.5', 'Seats').valid).toBe(false);
      expect(validatePositiveInteger('abc', 'Seats').valid).toBe(false);
    });
  });

  describe('validateRideRequest', () => {
    it('passes with valid pickup, destination, and seats', () => {
      expect(validateRideRequest('Amman', 'Aqaba', '2').valid).toBe(true);
    });
    it('fails when any field is missing or invalid', () => {
      expect(validateRideRequest('', 'Aqaba', '2').valid).toBe(false);
      expect(validateRideRequest('Amman', '', '2').valid).toBe(false);
      expect(validateRideRequest('Amman', 'Aqaba', '0').valid).toBe(false);
    });
  });

  describe('validatePackageRequest', () => {
    it('passes with text fields and a positive weight', () => {
      expect(validatePackageRequest('Amman', 'Zarqa', '1.5').valid).toBe(true);
    });
    it('rejects non-positive weight', () => {
      expect(validatePackageRequest('Amman', 'Zarqa', '0').valid).toBe(false);
    });
  });

  describe('validateScheduledRide', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    it('passes with valid coordinates and a future time', () => {
      expect(
        validateScheduledRide('31.95', '35.91', '31.96', '35.88', future).valid,
      ).toBe(true);
    });
    it('rejects out-of-range latitudes', () => {
      expect(validateScheduledRide('95', '35.91', '31.96', '35.88', future).valid).toBe(false);
    });
    it('rejects out-of-range longitudes', () => {
      expect(validateScheduledRide('31.95', '200', '31.96', '35.88', future).valid).toBe(false);
    });
    it('rejects past scheduled times', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      expect(validateScheduledRide('31.95', '35.91', '31.96', '35.88', past).valid).toBe(false);
    });
    it('rejects invalid times', () => {
      expect(validateScheduledRide('31.95', '35.91', '31.96', '35.88', 'not-a-date').valid).toBe(
        false,
      );
    });
  });
});

describe('security validation', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('a@b.co')).toBe(true);
    });
    it('rejects invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('accepts valid Jordanian phones', () => {
      expect(validatePhone('+962791234567')).toBe(true);
      expect(validatePhone('+962771234567')).toBe(true);
    });
    it('rejects invalid phones', () => {
      expect(validatePhone('962791234567')).toBe(false);
      expect(validatePhone('+962')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validateJordanPhone', () => {
    it('accepts valid Jordanian mobile numbers', () => {
      expect(validateJordanPhone('+962791234567')).toBe(true);
      expect(validateJordanPhone('+962771234567')).toBe(true);
    });
    it('rejects invalid Jordanian phones', () => {
      expect(validateJordanPhone('+96212345678')).toBe(false);
      expect(validateJordanPhone('+966791234567')).toBe(false);
    });
  });

  describe('validateIraqPhone', () => {
    it('accepts valid Iraqi mobile numbers', () => {
      expect(validateIraqPhone('+9647701234567')).toBe(true);
    });
    it('rejects invalid Iraqi phones', () => {
      expect(validateIraqPhone('+96412345678')).toBe(false);
      expect(validateIraqPhone('+9667701234567')).toBe(false);
    });
  });
});

describe('offlineQueue utilities', () => {
  describe('createOfflineAction', () => {
    it('creates an action with id, timestamp, and zero retries', () => {
      const action = createOfflineAction({
        type: 'RIDE_REQUEST',
        payload: { origin: 'Amman' },
      });
      expect(action.type).toBe('RIDE_REQUEST');
      expect(action.payload).toEqual({ origin: 'Amman' });
      expect(action.retries).toBe(0);
      expect(action.id).toMatch(/^action_\d+_/);
      expect(action.timestamp).toBeGreaterThan(0);
    });

    it('accepts custom now and random', () => {
      const action = createOfflineAction(
        { type: 'RIDE_CANCEL', payload: { rideId: 'r1' } },
        { now: 1000, random: () => 'i' },
      );
      expect(action.id).toBe('action_1000_i');
      expect(action.timestamp).toBe(1000);
    });
  });

  describe('incrementOfflineRetry', () => {
    it('increments retry count up to max', () => {
      const action = createOfflineAction({ type: 'RIDE_REQUEST', payload: {} });
      const retried = incrementOfflineRetry(action, 5);
      expect(retried).not.toBeNull();
      expect(retried!.retries).toBe(1);
    });

    it('returns null when max retries exceeded', () => {
      const action = { ...createOfflineAction({ type: 'RIDE_REQUEST', payload: {} }), retries: 5 };
      const retried = incrementOfflineRetry(action, 5);
      expect(retried).toBeNull();
    });

    it('defaults to maxRetries=3', () => {
      const action = { ...createOfflineAction({ type: 'RIDE_REQUEST', payload: {} }), retries: 3 };
      const retried = incrementOfflineRetry(action);
      expect(retried).toBeNull();
    });
  });

  describe('resolveOfflineQueueResult', () => {
    it('removes successful actions and keeps failed actions with updated retries', () => {
      const a1 = createOfflineAction({ type: 'RIDE_REQUEST', payload: { id: 1 } });
      const a2 = createOfflineAction({ type: 'RIDE_CANCEL', payload: { id: 2 } });
      const a3 = createOfflineAction({ type: 'RIDE_RATING', payload: { id: 3 } });
      const result = resolveOfflineQueueResult(
        [a1, a2, a3],
        [a1.id], // a1 succeeded
        [{ ...a2, retries: 1 }], // a2 failed and retried
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(a2.id);
      expect(result[0].retries).toBe(1);
      expect(result[1].id).toBe(a3.id);
    });
  });
});

describe('useConnectionStore', () => {
  it('starts with default state', () => {
    const state = useConnectionStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.syncInProgress).toBe(false);
    expect(state.queueSize).toBe(0);
    expect(state.cacheSize).toBe(0);
    expect(state.lastSyncAt).toBeNull();
  });

  it('can update online state', () => {
    useConnectionStore.getState().setOnline(false);
    expect(useConnectionStore.getState().isOnline).toBe(false);
  });

  it('can update queue and cache sizes', () => {
    useConnectionStore.getState().setQueueSize(3);
    useConnectionStore.getState().setCacheSize(5);
    expect(useConnectionStore.getState().queueSize).toBe(3);
    expect(useConnectionStore.getState().cacheSize).toBe(5);
  });

  it('can set last sync timestamp', () => {
    useConnectionStore.getState().setLastSyncAt('2026-07-20T10:00:00Z');
    expect(useConnectionStore.getState().lastSyncAt).toBe('2026-07-20T10:00:00Z');
  });

  it('reset restores initial state', () => {
    useConnectionStore.getState().setOnline(false);
    useConnectionStore.getState().setQueueSize(10);
    useConnectionStore.getState().setLastSyncAt('2026-01-01T00:00:00Z');
    useConnectionStore.getState().reset();
    expect(useConnectionStore.getState().isOnline).toBe(true);
    expect(useConnectionStore.getState().queueSize).toBe(0);
    expect(useConnectionStore.getState().lastSyncAt).toBeNull();
  });
});
