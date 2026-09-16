# 30-Day Production Report — Wasel Mobile

## Period
August 2026 (last 30 days)

## Status: figures below are Targets, not verified telemetry

An earlier version of this report stated specific crash-free rates, DAU/session
counts per feature, API p95 latency, and a named Supabase project as if they were
measured production facts. `docs/implementation-status.md` (see "Correction — this
pass") found no telemetry source in this repo backing those numbers, and a related
audit found the mobile Detox specs referenced UI elements (`login-button`,
`packages-tab`, `package-form-screen`, `phone-auth-screen`, etc.) that did not exist
in `mobile/src` at the time — meaning some of the flows those numbers described could
not have been exercised by the test suite that supposedly validated them. This report
now follows the same **Verified / Target** convention as
`docs/30_DAY_PRODUCTION_REPORT.md`: nothing below should be treated as a real
production number until it is replaced with a value pulled directly from the
telemetry source listed.

## Crash Metrics
| Metric | Target | Verify via |
| --- | --- | --- |
| Crash-free sessions | > 99.5% | Sentry (mobile project) → Releases → Crash-free sessions |
| Crash-free users | > 99.5% | Sentry (mobile project) → Releases → Crash-free users |
| Fatal error rate | < 0.5% | Sentry → Issues, filtered to `fatal` level |

## Performance
| Metric | Target | Verify via |
| --- | --- | --- |
| Cold start (iOS) | < 4s | Sentry Mobile Vitals / manual device profiling |
| Cold start (Android) | < 4s | Sentry Mobile Vitals / manual device profiling |
| API p95 (Supabase edge functions) | < 400ms | Supabase Dashboard → Functions → Logs |
| Offline sync (queue drain) | < 2s for 50 queued actions | Manual test — no automated benchmark exists yet |

## Feature Usage
No analytics pipeline is wired into this repo for per-feature DAU/session counts.
Until one is connected (e.g. via App Insights, Sentry, or a product-analytics tool),
this section should stay empty rather than carry invented numbers.

| Feature | DAU | Sessions | Source |
| --- | --- | --- | --- |
| Ride requests | — | — | Not instrumented |
| Package delivery | — | — | Not instrumented |
| Bus corridors | — | — | Not instrumented |
| Live tracking | — | — | Not instrumented |
| Wallet top-up | — | — | Not instrumented |
| Chat messages | — | — | Not instrumented |

## Error Boundary
- Error ID generation (`err_<timestamp>_<random>`) and Sentry scope tagging exist in
  code — verify actual correlation by triggering a test error and confirming the ID
  appears in the Sentry event.

## Offline Queue
- Idempotency and retry logic exist in `offline.ts` — no verified production figures
  for peak queue size, sync success rate, or duplicate-booking count exist yet.
  Populate this section from real incident/monitoring data once available, not estimates.

## Security
- Keychain/Keystore usage for auth tokens: verify by inspecting stored keys on a real
  device build, not by code inspection alone.
- API domain allowlist and SSRF protections: present in `api.ts`/`offline.ts` — see
  `mobile/SECURITY_CHECKLIST.md` for the credential-rotation items that are still
  outstanding and block calling this app "production-hardened."

## Infrastructure
| Item | Target / expected | Verify via |
| --- | --- | --- |
| Supabase project | (fill in from actual Supabase dashboard) | Supabase Dashboard → Project Settings |
| Edge functions deployed | matches `supabase/functions/` count | Supabase Dashboard → Functions |
| Database | PostGIS-enabled | Supabase Dashboard → Database → Extensions |

## Next 30-Day Goals
1. Wire a real crash/telemetry source (Sentry mobile project) and replace every
   Target above with a Verified figure.
2. Confirm the corrected Detox specs (per `docs/implementation-status.md`) actually
   pass against a real build before citing e2e coverage numbers anywhere.
3. Expand E2E coverage to critical flows only after confirming existing specs test
   real components.
4. Achieve and *measure* (not estimate) test coverage on the services layer.
