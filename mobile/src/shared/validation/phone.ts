const JORDAN_MOBILE_REGEX = /^(\+?962|0)(7[0-9]\d{7}|[0-9]\d{6})$/;
const JORDAN_LANDLINE_REGEX = /^(\+?962|0)(6\d{6})$/;
const IRAQ_MOBILE_REGEX = /^(\+?964|0)(7[0-9]\d{8,9})$/;

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const sanitized = trimmed.replace(/[\s-]/g, '');

  if (JORDAN_MOBILE_REGEX.test(sanitized) || JORDAN_LANDLINE_REGEX.test(sanitized)) {
    return sanitized.replace(/^(\+?962|0)/, '+962');
  }

  if (IRAQ_MOBILE_REGEX.test(sanitized)) {
    return sanitized.replace(/^(\+?964|0)/, '+964');
  }

  if (/^\+962[6-9]\d{7}$/.test(sanitized) || /^\+9621\d{6}$/.test(sanitized)) {
    return sanitized;
  }

  if (/^\+9647\d{8,9}$/.test(sanitized)) {
    return sanitized;
  }

  throw new Error('Invalid phone number provided.');
}

export function normalizePhoneNumber(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '');
}

export function isValidE164Phone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
