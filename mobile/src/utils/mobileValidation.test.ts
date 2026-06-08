import {
  validatePackageRequest,
  validatePositiveInteger,
  validatePositiveNumber,
  validateRequiredText,
  validateRideRequest,
} from './mobileValidation';

describe('mobile validation', () => {
  it('validates required text fields', () => {
    expect(validateRequiredText('', 'Pickup')).toEqual({
      valid: false,
      message: 'Pickup is required.',
    });
    expect(validateRequiredText('Amman', 'Pickup')).toEqual({ valid: true });
  });

  it('validates positive numeric fields', () => {
    expect(validatePositiveNumber('0', 'Seats')).toEqual({
      valid: false,
      message: 'Seats must be greater than zero.',
    });
    expect(validatePositiveNumber('2', 'Seats')).toEqual({ valid: true });
  });

  it('validates positive integer fields', () => {
    expect(validatePositiveInteger('1.5', 'Seats')).toEqual({
      valid: false,
      message: 'Seats must be a whole number.',
    });
    expect(validatePositiveInteger('2', 'Seats')).toEqual({ valid: true });
  });

  it('validates ride requests', () => {
    expect(validateRideRequest('Amman', 'Aqaba', '1')).toEqual({ valid: true });
    expect(validateRideRequest('Amman', '', '1')).toEqual({
      valid: false,
      message: 'Destination is required.',
    });
  });

  it('validates package requests', () => {
    expect(validatePackageRequest('Amman', 'Irbid', '2')).toEqual({ valid: true });
    expect(validatePackageRequest('Amman', 'Irbid', '-1')).toEqual({
      valid: false,
      message: 'Package weight must be greater than zero.',
    });
  });
});
