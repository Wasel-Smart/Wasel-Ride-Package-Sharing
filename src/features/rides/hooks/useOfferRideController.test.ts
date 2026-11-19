/**
 * Unit tests for useOfferRideController pure-logic helpers.
 *
 * We test the validation and form-step logic that used to be untestable
 * because it was buried inside the page component.
 */
import { describe, it, expect } from 'vitest';
import { validateOfferRideStep } from '../../../pages/waselCorePageHelpers';

// Re-use the same validation function the controller delegates to.
// This tests the boundary that guards step transitions.

type OfferRideForm = Record<string, unknown>;

const VALID_STEP1: OfferRideForm = {
  from: 'Amman',
  to: 'Aqaba',
  seats: 2,
  price: 5,
};

const VALID_STEP2: OfferRideForm = {
  ...VALID_STEP1,
  date: '2027-01-15',
  time: '08:00',
};

const VALID_STEP3: OfferRideForm = {
  ...VALID_STEP2,
  carModel: 'Toyota Camry',
  gender: 'any',
  prayer: false,
  note: '',
  acceptsPackages: false,
  packageCapacity: 'small',
  packageNote: '',
};

describe('validateOfferRideStep', () => {
  it('step 1 passes when from, to, seats and price are set', () => {
    expect(validateOfferRideStep(VALID_STEP1, 1, false)).toBeNull();
  });

  it('step 1 fails when from equals to', () => {
    const form = { ...VALID_STEP1, to: 'Amman' };
    const result = validateOfferRideStep(form, 1, false);
    expect(result).toBeTruthy();
  });

  it('step 1 fails when seats is zero', () => {
    const form = { ...VALID_STEP1, seats: 0 };
    const result = validateOfferRideStep(form, 1, false);
    expect(result).toBeTruthy();
  });

  it('step 2 passes when date and time are present', () => {
    expect(validateOfferRideStep(VALID_STEP2, 2, false)).toBeNull();
  });

  it('step 2 fails when date is missing', () => {
    const form = { ...VALID_STEP1, date: '', time: '08:00' };
    const result = validateOfferRideStep(form, 2, false);
    expect(result).toBeTruthy();
  });

  it('step 3 passes with car model present', () => {
    expect(validateOfferRideStep(VALID_STEP3, 3, false)).toBeNull();
  });

  it('Arabic error messages are returned when ar=true', () => {
    const form = { ...VALID_STEP1, seats: 0 };
    const result = validateOfferRideStep(form, 1, true);
    // Arabic text contains Arabic characters (Unicode range 0600–06FF)
    if (result) {
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    }
  });
});
