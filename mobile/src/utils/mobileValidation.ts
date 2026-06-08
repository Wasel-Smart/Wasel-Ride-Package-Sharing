export type ValidationResult = {
  valid: boolean;
  message?: string;
};

export function validatePositiveNumber(value: string, label: string): ValidationResult {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { valid: false, message: `${label} must be greater than zero.` };
  }

  return { valid: true };
}

export function validatePositiveInteger(value: string, label: string): ValidationResult {
  const numberResult = validatePositiveNumber(value, label);
  if (!numberResult.valid) return numberResult;

  if (!Number.isInteger(Number(value))) {
    return { valid: false, message: `${label} must be a whole number.` };
  }

  return { valid: true };
}

export function validateRequiredText(value: string, label: string): ValidationResult {
  if (value.trim().length < 2) {
    return { valid: false, message: `${label} is required.` };
  }

  return { valid: true };
}

export function validateRideRequest(pickup: string, destination: string, seats: string): ValidationResult {
  const pickupResult = validateRequiredText(pickup, 'Pickup');
  if (!pickupResult.valid) return pickupResult;

  const destinationResult = validateRequiredText(destination, 'Destination');
  if (!destinationResult.valid) return destinationResult;

  return validatePositiveInteger(seats, 'Seats');
}

export function validatePackageRequest(
  pickup: string,
  dropoff: string,
  weight: string,
): ValidationResult {
  const pickupResult = validateRequiredText(pickup, 'Pickup');
  if (!pickupResult.valid) return pickupResult;

  const dropoffResult = validateRequiredText(dropoff, 'Drop-off');
  if (!dropoffResult.valid) return dropoffResult;

  return validatePositiveNumber(weight, 'Package weight');
}
