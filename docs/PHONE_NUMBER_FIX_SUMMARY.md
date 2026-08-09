# Phone Number Handling — Project-Wide

## Context

The Wasel platform supports Jordan (+962) and Iraq (+964) phone number formats across web,
mobile, and edge functions. This document tracks the phone number validation and normalization
strategy.

## Mobile App (`mobile/`)

- `services/auth.ts` — `normalizePhone()` uses `libphonenumber-js/mobile` to parse, validate,
  and convert to E.164 format. Defaults to Jordan (`JO`) region.
- `utils/security.ts` — `validatePhone()`, `validateJordanPhone()`, `validateIraqPhone()`
  provide regex-based validation before API calls.
- `utils/mobileValidation.ts` — `validateCoordinate()` checks latitude/longitude ranges.

See `mobile/PHONE_NUMBER_FIX_SUMMARY.md` for detailed fix history.

## Web Client (`src/`)

- `src/utils/validation.ts` — `validatePhoneNumber()` and `validatePhone()` for form validation.
- `src/services/authApi.ts` — normalizes phone numbers before sending to backend.

## Edge Functions (`supabase/functions/`)

- `make-server/` — validates phone numbers in booking requests using `libphonenumber`.
- `matching-worker/` — uses PostGIS `ST_DWithin` for geospatial matching.

## Database

- `phone_number` column on `profiles` table stores E.164 format.
- Index on `profiles.phone_number` for O(1) lookups.
