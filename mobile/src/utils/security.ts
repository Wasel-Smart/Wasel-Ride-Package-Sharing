export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

const JORDAN_MOBILE_REGEX = /^\+962[6-9]\d{8}$/;
const JORDAN_LANDLINE_REGEX = /^\+962[2-9]\d{7}$/;
const IRAQ_MOBILE_REGEX = /^\+9647[0-9]{8,9}$/;

export function validatePhone(phone: string): boolean {
  return validateJordanPhone(phone) || validateIraqPhone(phone);
}

export function validateJordanPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (JORDAN_MOBILE_REGEX.test(trimmed)) return true;
  return JORDAN_LANDLINE_REGEX.test(trimmed);
}

export function validateIraqPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  return IRAQ_MOBILE_REGEX.test(phone.trim());
}

export function sanitizeInput(input: string, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
