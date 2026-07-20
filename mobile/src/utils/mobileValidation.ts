export type ValidationResult = {
  valid: boolean;
  message?: string;
};

export function validatePositiveNumber(value: string, label: string): ValidationResult {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { valid: false, message: `${label} لازم يكون أكبر من صفر.` };
  }

  return { valid: true };
}

export function validatePositiveInteger(value: string, label: string): ValidationResult {
  const numberResult = validatePositiveNumber(value, label);
  if (!numberResult.valid) return numberResult;

  if (!Number.isInteger(Number(value))) {
    return { valid: false, message: `${label} لازم يكون رقم صحيح.` };
  }

  return { valid: true };
}

export function validateRequiredText(value: string, label: string): ValidationResult {
  if (value.trim().length < 2) {
    return { valid: false, message: `${label} مطلوب.` };
  }

  return { valid: true };
}

export function validateRideRequest(pickup: string, destination: string, seats: string): ValidationResult {
  const pickupResult = validateRequiredText(pickup, 'نقطة الانطلاق');
  if (!pickupResult.valid) return pickupResult;

  const destinationResult = validateRequiredText(destination, 'الوجهة');
  if (!destinationResult.valid) return destinationResult;

  return validatePositiveInteger(seats, 'عدد المقاعد');
}

export function validatePackageRequest(
  pickup: string,
  dropoff: string,
  weight: string,
): ValidationResult {
  const pickupResult = validateRequiredText(pickup, 'نقطة الانطلاق');
  if (!pickupResult.valid) return pickupResult;

  const dropoffResult = validateRequiredText(dropoff, 'موقع التسليم');
  if (!dropoffResult.valid) return dropoffResult;

  return validatePositiveNumber(weight, 'وزن الطرد');
}

export function validateScheduledRide(
  pickupLat: string,
  pickupLng: string,
  dropoffLat: string,
  dropoffLng: string,
  scheduledTime: string,
): ValidationResult {
  const latResult = validateCoordinate(pickupLat, 'Pickup latitude');
  if (!latResult.valid) return latResult;

  const lngResult = validateCoordinate(pickupLng, 'Pickup longitude');
  if (!lngResult.valid) return lngResult;

  const dropLatResult = validateCoordinate(dropoffLat, 'Dropoff latitude');
  if (!dropLatResult.valid) return dropLatResult;

  const dropLngResult = validateCoordinate(dropoffLng, 'Dropoff longitude');
  if (!dropLngResult.valid) return dropLngResult;

  if (!scheduledTime.trim()) {
    return { valid: false, message: 'وقت الجدولة مطلوب.' };
  }

  const scheduledDate = new Date(scheduledTime);
  if (isNaN(scheduledDate.getTime())) {
    return { valid: false, message: 'وقت الجدولة لازم يكون تاريخ ISO 8601 صحيح.' };
  }

  if (scheduledDate.getTime() < Date.now() - 60000) {
    return { valid: false, message: 'وقت الجدولة لازم يكون بالمستقبل.' };
  }

  return { valid: true };
}

function validateCoordinate(value: string, label: string): ValidationResult {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return { valid: false, message: `${label} لازم يكون رقم.` };
  }

  const isLatitude = label.toLowerCase().includes('latitude') || label.includes('عرض') || label.includes('عرض') || label.includes('عرض') || label.includes('عرض') || label.includes('عرض');
  const [min, max] = isLatitude ? [-90, 90] : [-180, 180];

  if (numericValue < min || numericValue > max) {
    return { valid: false, message: `${label} لازم يكون بين ${min} و ${max}.` };
  }

  return { valid: true };
}
