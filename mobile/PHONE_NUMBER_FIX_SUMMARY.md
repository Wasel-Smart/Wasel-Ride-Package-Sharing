# Phone Number Handling Fix Summary

## Context

The Wasel mobile app uses `libphonenumber-js` to normalize and validate phone numbers
across Jordan (+962) and Iraq (+964) markets. During the August 2026 audit, several
phone-number-related issues were identified and fixed.

## Changes

### 1. `normalizePhone` in `services/auth.ts`

- Uses `parsePhoneNumberFromString` from `libphonenumber-js/mobile` to parse international
  and local formats.
- Defaults to Jordan (`'JO'`) region for local numbers that omit the country code.
- Throws a descriptive error if the number is invalid: `"Invalid phone number provided."`.
- Returns E.164 format (e.g., `+962791234567`).

### 2. `validatePhone` in `utils/security.ts`

- Regex-based validation for Jordanian mobile, Jordanian landline, and Iraqi mobile numbers.
- `validateJordanPhone` — matches `+962[6-9]\d{7}` for mobile and `+962[0-9]\d{6}` for landline.
- `validateIraqPhone` — matches `+9647[0-9]{8,9}` for mobile.

### 3. `validateScheduledRide` in `utils/mobileValidation.ts`

- Added `validateCoordinate` helper that checks latitude ranges (-90 to 90) vs
  longitude ranges (-180 to 180).
- Fixed a bug where `isLatitude` detection had duplicated `label.includes('عرض')` checks.
  Simplified to check for `'lat'` in the label or Arabic 'عرض' for latitude.

## Test Coverage

- `mobileValidation.test.ts` — covers all phone/coordinate validation paths.
- `security.test.ts` — covers `validatePhone`, `validateJordanPhone`, `validateIraqPhone`.

## Usage

```typescript
import { validatePhone, validateJordanPhone } from '../utils/security';
import { authService } from '../services/auth';

// Validate before showing error to user
if (!validatePhone(phoneInput)) {
  setError('رقم الهاتف لازم يكون بصيغة +962XXXXXXXXX');
}

// Normalize for backend
const normalized = normalizePhone(phoneInput); // '+962791234567'
```
