# Launch Rehearsal Checklist

Use this checklist before moving from mock launch into wider rollout.

## Supabase Rollout

- Apply [20260401113000_unified_backend_contract.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260401113000_unified_backend_contract.sql)
- Apply [20260401133000_align_canonical_rls_policies.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260401133000_align_canonical_rls_policies.sql)
- Apply [20260401143000_harden_rpc_execute_permissions.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/migrations/20260401143000_harden_rpc_execute_permissions.sql)
- Run [mock_engine_launch_pack.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/seeds/mock_engine_launch_pack.sql)
- Run [mock_engine_smoke_checks.sql](/C:/Users/user/OneDrive/Desktop/Wdoubleme/src/supabase/seeds/mock_engine_smoke_checks.sql)
- Run `node scripts/verify-supabase-rollout.mjs`

## Application Checks

- Confirm sign-in/session restore works
- Confirm profile fetch returns canonical data
- Confirm trip search returns seeded mock routes
- Confirm driver trips load for seeded drivers
- Confirm booking creation works without RLS failure
- Confirm package tracking resolves seeded package codes
- Confirm wallet summary loads
- Confirm wallet transfer flow works
- Confirm notifications render
- Confirm verification state appears correctly in profile/auth flows

## Security Checks

- Confirm internal RPCs are not callable by normal authenticated users
- Confirm user-facing RPCs still work after execute hardening
- Confirm no direct canonical write path fails due to missing `WITH CHECK`
- Confirm no unexpected `anon` access to privileged functions

## Go / No-Go

Go when:

- migrations apply cleanly
- seed pack loads cleanly
- smoke checks return expected rows
- core user flows work in the app
- no RLS or RPC permission errors appear in Supabase logs

No-go when:

- any migration fails
- canonical insert/update flows fail under RLS
- wallet or booking flows regress after RPC hardening
- auth-user to canonical-user mapping fails
