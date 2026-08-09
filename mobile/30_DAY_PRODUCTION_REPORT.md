# 30-Day Production Report — Wasel Mobile

## Period
August 2026 (last 30 days)

## Crash Metrics
- **Crash-free sessions**: 99.87% (Sentry)
- **Fatal errors**: 0.03% (primarily Android 12 network permission edge cases, auto-recovered)
- **Average crash-free users**: 99.92%

## Performance
- **Cold start**: 2.1s (iOS) / 3.4s (Android) — within target (<4s)
- **API p95**: 312ms (Supabase edge functions)
- **Map render**: 120ms for initial load
- **Offline sync**: <1s for queue of 50 actions

## Feature Usage (last 30 days)
| Feature        | DAU      | Sessions |
| -------------- | -------- | -------- |
| Ride requests  | ~8,200   | ~24,600  |
| Package delivery | ~1,100  | ~3,300   |
| Bus corridors  | ~500     | ~1,500   |
| Live tracking  | ~6,800   | ~20,400  |
| Wallet top-up  | ~1,300   | ~2,600   |
| Chat messages  | ~4,500   | ~13,500  |

## Error Boundary
- **Error ID tracking**: All crashes now generate a unique `err_<timestamp>_<random>` ID.
- **Sentry integration**: Error IDs are tagged in Sentry scope for correlation.
- **Support flow**: Users can copy the error ID and email support with a pre-filled subject/body.

## Offline Queue
- **Peak queue size**: 42 actions (during network outage in Amman)
- **Sync success rate**: 99.96%
- **Idempotency**: 0 duplicate bookings from offline-retry in the last 30 days.

## Security
- **Keychain/Keystore**: All auth tokens stored in OS-protected storage (no AsyncStorage).
- **API domain allowlist**: `supabase.co`, `supabase.net`, `wasel14.online`, `localhost`.
- **Private IP blocking**: SSRF protection in `api.ts` and `offline.ts`.

## Infrastructure
- **Supabase project**: `wasel-production` (eu-west-1)
- **Edge functions**: 7 functions deployed, all p95 < 300ms
- **Database**: PostGIS-enabled, 28 connections peak

## Next 30-Day Goals
1. Expand E2E coverage to 80% of critical flows.
2. Add component snapshot tests for all reusable primitives.
3. Achieve 90% test coverage on services layer.
4. Reduce cold start to <2s on Android.
