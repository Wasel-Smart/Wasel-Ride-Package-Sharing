# Production Cutover Checklist

Use this checklist when moving from seeded mock launch into real authenticated
users and live operational traffic.

## 1. Environment Setup

- Set `VITE_SUPABASE_URL`
- Set `VITE_SUPABASE_ANON_KEY`
- Confirm the frontend points at the intended Supabase project
- Confirm the edge function name and base URL resolve through the shared backend contract
- Confirm the project is not still using demo/local auth fallback

## 2. Database Rollout

- Apply [20260401113000_unified_backend_contract.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260401113000_unified_backend_contract.sql)
- Apply [20260401133000_align_canonical_rls_policies.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260401133000_align_canonical_rls_policies.sql)
- Apply [20260401143000_harden_rpc_execute_permissions.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260401143000_harden_rpc_execute_permissions.sql)
- Apply [20260404110000_route_automation_backbone.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260404110000_route_automation_backbone.sql)
- Apply [20260404133000_harden_auth_signup_trigger.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260404133000_harden_auth_signup_trigger.sql)
- Apply [20260404153000_operational_bootstrap_reference_data.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260404153000_operational_bootstrap_reference_data.sql)
- Apply [20260406101500_harden_automation_queue_access_and_support_rpcs.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260406101500_harden_automation_queue_access_and_support_rpcs.sql)
- Confirm all migrations complete without manual edits in the dashboard
- Confirm [MIGRATIONS_README.md](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/MIGRATIONS_README.md) matches what is applied

## 2.1 Automation Runtime

- Set `AUTOMATION_WORKER_SECRET`
- Confirm the edge function responds to `POST /automation/admin/apply-migrations`
- Confirm the edge function responds to `POST /automation/process`
- Run `npm run worker:automation -- --inline-communications` against the production function URL for a smoke pass
- Verify `automation_jobs`, `route_reminders`, `support_tickets`, and `pricing_snapshots` are present in Supabase
- Confirm direct browser inserts into `automation_jobs`, `support_tickets`, and `support_ticket_events` are denied under RLS
- Confirm `app_enqueue_automation_job`, `app_create_support_ticket`, and `app_update_support_ticket_status` execute for authenticated users

## 3. Auth to Canonical User Binding

- Create a real Supabase Auth test user
- Run `npm run verify:auth:production`
- Confirm the verifier reaches both `accounts.google.com` and `www.facebook.com`
- Confirm the verifier no longer reports `Database error saving new user`
- Sign in through the app
- Confirm `public.users.auth_user_id` is populated for that user
- Confirm profile fetch returns canonical user data rather than only legacy compatibility fields
- Confirm profile update writes to the canonical user model
- Confirm password reset flow still works
- Confirm OAuth sign-in still works if enabled

## 4. Real User Flow Validation

- Passenger sign-up
- Passenger sign-in
- Driver sign-in
- Profile load
- Profile update
- Trip search
- Trip creation
- Driver trip listing
- Booking creation
- Booking status update
- Package creation
- Package tracking
- Wallet summary load
- Wallet top-up
- Wallet transfer
- Notification read flow
- Verification state rendering

## 5. Security Validation

- Confirm anonymous users cannot call privileged RPCs
- Confirm authenticated normal users cannot call internal/admin-only RPCs
- Confirm user-facing RPCs still work for normal users
- Confirm canonical insert/update paths do not fail under RLS
- Confirm no table allows unexpected cross-user reads
- Confirm no table allows unexpected cross-user writes

## 6. Seed Transition Rules

- Do not use the mock seed pack as production identity data
- If mock users remain in the project, keep them clearly separated from real users
- For any seeded persona that should become a real login:
  - create a real Supabase Auth account
  - bind `public.users.auth_user_id`
  - verify wallet, verification, and role data still match expected behavior

## 7. Observability and Logs

- Review Supabase auth logs during sign-up/sign-in
- Review Postgres logs for RLS denials
- Review edge function logs for backend errors
- Review failed RPC invocation attempts
- Capture at least one successful trace for each critical flow

## 8. Go / No-Go

Go when:

- auth users bind cleanly into canonical `public.users`
- user-facing flows work without manual database intervention
- no unexpected RLS denials appear
- no privileged RPC misuse is possible from normal clients
- wallet, booking, and package flows complete successfully

No-go when:

- auth users fail to map into canonical records
- any critical user flow still depends on mock-only assumptions
- RLS policies block intended writes
- normal users can invoke internal/admin-only RPCs
- wallet or booking integrity is inconsistent after real-user testing

## Suggested Final Commands

- `node scripts/verify-supabase-rollout.mjs`
- `npm run verify:auth:production`
- `npm run type-check`
- `npm run lint`
- `npm run test`
- `npm run build`
