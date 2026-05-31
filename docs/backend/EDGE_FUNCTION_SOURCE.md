# Wasel Edge Function Source Boundary

The frontend calls a Supabase Edge Function named `make-server-0b1f4071` by default. The tracked source lives at:

- `src/supabase/functions/make-server-0b1f4071/index.ts`

This source is the auditable boundary for privileged operations such as wallet settlement, payment intent creation/confirmation, driver approval, profile writes, safety events, and user settings.

## Required rule

Do not implement privileged wallet, payment, admin, or profile writes in the browser. Keep service-role Supabase calls in this Edge Function or another versioned backend service.

## Local deployment sketch

```bash
supabase functions serve make-server-0b1f4071 --env-file .env
```

The current tracked function declares every route used by the frontend and returns `501` for routes whose production implementation still needs to be ported into this repo. A route must not be considered production-ready until its handler, authorization checks, idempotency behavior, and tests are committed here.
