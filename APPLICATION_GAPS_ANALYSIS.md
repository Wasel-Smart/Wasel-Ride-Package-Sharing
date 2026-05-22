# Application Gaps Analysis — Wasel
> Last updated: 2026-05-20
> Status: **ALL GAPS RESOLVED ✅**

---

## Gap Resolution Summary

| # | Gap | File(s) | Status |
|---|-----|---------|--------|
| 1 | Missing fields in `profiles` Row type | `src/utils/supabase/database.types.ts` | ✅ Fixed |
| 2 | Mobile `UserProfile` interface incomplete | `mobile/src/services/userProfile.ts` | ✅ Fixed |
| 3 | Missing web `useProfile` hook | `src/hooks/useProfile.ts` | ✅ Fixed |
| 4 | `NEXT_PUBLIC_STORADGE_*` typo fallback in env.ts | `src/utils/env.ts` | ✅ Fixed |
| 5 | No down migration / verification script | `supabase/migrations/20260520000001_*.sql`, `verify_database.sql` | ✅ Fixed |
| 6 | Missing SMS verification implementation | `src/services/smsVerification.ts` | ✅ Fixed |
| 7 | Error-handling inconsistency (`import.meta.env.DEV` vs `PROD`) | `src/services/auth.ts`, `src/utils/sanitization.ts` | ✅ Fixed |
| 8 | Mobile app.json placeholder values + no eas.json | `mobile/app.json`, `mobile/eas.json`, `mobile/MOBILE_CONFIGURATION.md` | ✅ Fixed |
| 9 | Missing SMS exports from `directSupabase/index.ts` | `src/services/directSupabase/index.ts` | ✅ Fixed |
| 10 | Inconsistent sanitization utility naming | `src/utils/sanitize.ts` | ✅ Fixed |

---

## Detailed Notes

### Gap 1 — Database Types (`database.types.ts`)
All 16 previously-missing `profiles` Row fields are now present:
`phone_verified`, `email_verified`, `verification_status`, `trust_score`,
`rating_as_passenger`, `rating_as_driver`, `total_rides_as_passenger`,
`total_rides_as_driver`, `push_token`, `push_enabled`, `email_notifications`,
`sms_notifications`, `whatsapp_notifications`, `preferred_language`,
`deleted_at`, `date_of_birth`, `gender`.

### Gap 2 — Mobile UserProfile Interface
`phone_verified` and `email_verified` added and documented in
`mobile/src/services/userProfile.ts`.

### Gap 3 — Web `useProfile` Hook
Created `src/hooks/useProfile.ts` — a React Query hook mirroring the mobile
`useProfile` hook. Wraps all `src/services/userProfile.ts` functions and exposes
`profile`, `isLoading`, `isUpdating`, and mutation helpers.

### Gap 4 — Env Typo Fallback
Removed `NEXT_PUBLIC_STORADGE_*` fallback chain from `resolveSupabaseUrl` and
`resolveSupabasePublicKey`. Canonical variable names are
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Gap 5 — Migration Safety
- `supabase/migrations/20260520000000_complete_user_profile_schema.sql` — up migration.
- `supabase/migrations/20260520000001_complete_user_profile_schema_down.sql` — down / rollback.
- `supabase/migrations/verify_database.sql` — run-in-psql verification queries.

### Gap 6 — SMS Verification
`src/services/smsVerification.ts` implements:
- `getSMSOtp(phoneNumber)` — sends OTP via `send-sms-otp` Edge Function.
- `verifySMSCode(phoneNumber, code)` — validates OTP via `verify-sms-otp` Edge Function.
- `verifyPhoneNumber({ phoneNumber, code? })` — convenience wrapper combining both steps.

Twilio credentials live server-side (Edge Function env vars only).

### Gap 7 — Error Handling Consistency
`src/services/auth.ts` now uses a single `isDevMode()` helper instead of
scattered `import.meta.env.DEV` checks. `sanitization.ts` correctly uses
`import.meta.env.PROD` for its SSRF security guard — that is a distinct,
intentional usage pattern (security must block in production regardless of
logging verbosity).

### Gap 8 — Mobile App Configuration
- `mobile/app.json`: all placeholder strings renamed to `REPLACE_WITH_*` for
  visibility. `YOUR_*` silent placeholders were indistinguishable from real values.
- `mobile/eas.json`: created with `development`, `preview`, and `production`
  build profiles — required by EAS CLI ≥ 5.
- `mobile/MOBILE_CONFIGURATION.md`: step-by-step guide for EAS init, Google Maps
  key creation, notification icons, and local `.env.local` setup.
- Notification icons (`notification-icon.png`, `adaptive-icon.png`) must be
  placed in `mobile/assets/` — see `MOBILE_CONFIGURATION.md` for specs.

### Gap 9 — Missing SMS Type Exports
`src/services/directSupabase/index.ts` now re-exports:
```ts
export type { SMSOtpResult, SMSVerifyResult } from '../smsVerification';
export { getSMSOtp, verifySMSCode, verifyPhoneNumber } from '../smsVerification';
```
Consumers can now import SMS helpers from either path:
```ts
import { verifyPhoneNumber } from '@/services/directSupabase';
// or directly:
import { verifyPhoneNumber } from '@/services/smsVerification';
```

### Gap 10 — Sanitization Naming Inconsistency
`src/utils/sanitize.ts` is now a clean extension barrel:
- Re-exports **all** functions from `sanitization.ts` (no duplication).
- Adds DOM-dependent and UI-specific helpers that cannot live in the
  isomorphic `sanitization.ts`: `stripHTML`, `sanitizeHTMLStrict`,
  `sanitizeURL`, `sanitizePhone`, `sanitizeSearchQuery`, `sanitizeNumber`,
  `sanitizeFilename`, `sanitizeObject`, `escapeRegExp`, `safeJSONParse`,
  `sanitizeMarkdown`.
- `mobile/src/utils/sanitization.ts` is the mobile-specific copy (uses `__DEV__`
  instead of `import.meta.env.PROD`) and remains separate by design.

**Import guidance:**
| Context | Import from |
|---------|-------------|
| Web UI components | `@/utils/sanitize` |
| Web services / utils (no DOM) | `@/utils/sanitization` |
| Mobile | `../utils/sanitization` |
