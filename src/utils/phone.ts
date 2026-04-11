export const INTERNATIONAL_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const JORDAN_COUNTRY_CODE = '962';
const JORDAN_LOCAL_PHONE_REGEX = /^0\d{9}$/;

export function canonicalizePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return null;

  const withoutInternationalPrefix = digitsOnly.startsWith('00')
    ? digitsOnly.slice(2)
    : digitsOnly;

  let normalized = `+${withoutInternationalPrefix}`;

  if (JORDAN_LOCAL_PHONE_REGEX.test(withoutInternationalPrefix)) {
    normalized = `+${JORDAN_COUNTRY_CODE}${withoutInternationalPrefix.slice(1)}`;
  }

  return INTERNATIONAL_PHONE_REGEX.test(normalized) ? normalized : null;
}
