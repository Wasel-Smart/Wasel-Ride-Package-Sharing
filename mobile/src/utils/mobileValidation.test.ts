import {
  validateRideRequest,
  validatePackageRequest,
  validateScheduledRide,
  validatePositiveInteger,
  validateRequiredText,
} from '../utils/mobileValidation';

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
