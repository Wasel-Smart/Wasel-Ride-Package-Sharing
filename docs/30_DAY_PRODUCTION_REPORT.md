# 30-Day Production Report — Wasel Platform

## Period
August 2026

## How to read this report

Metrics marked **Verified** are sourced from live tooling (Vercel Speed Insights,
Sentry, Application Insights, Supabase Dashboard). Metrics marked **Target** are
engineering goals — replace with verified figures once the corresponding monitoring
tool is connected and has accumulated data.

---

## Platform-Wide Status

| Component      | Status     | Telemetry Source                          | Notes                              |
| -------------- | ---------- | ----------------------------------------- | ---------------------------------- |
| Web Client     | Production | Vercel Speed Insights + Sentry            | Connect `VITE_SENTRY_DSN` to verify |
| Mobile App     | Production | See `mobile/30_DAY_PRODUCTION_REPORT.md`  | —                                  |
| Edge Functions | Production | Supabase Dashboard → Functions → Logs     | Target: p95 < 300ms                |
| Database       | Production | Supabase Dashboard → Database → Reports   | Target: peak connections < 50      |
| CI/CD          | Green      | GitHub Actions                            | All quality gates enforced         |

---

## Web Vitals (Core Web Vitals)

Real values are reported automatically via the `web-vitals` library wired into:
- **Sentry** — `monitoring.ts` reports CLS, FCP, INP, LCP, TTFB as measurements on every session
- **Application Insights** — `appInsights.ts` reports the same five vitals as custom metrics

To view verified values:
- Sentry → Performance → Web Vitals
- Azure Application Insights → Metrics → `web_vital_*`
- Vercel Speed Insights dashboard (automatic, no config required)

| Vital | Target | Source to verify |
| ----- | ------ | ---------------- |
| LCP   | < 2.5s | Sentry / App Insights / Vercel Speed Insights |
| INP   | < 200ms | Sentry / App Insights |
| CLS   | < 0.1  | Sentry / App Insights |
| FCP   | < 1.8s | Sentry / App Insights |
| TTFB  | < 800ms | Sentry / App Insights |

---

## Error Monitoring

- Runtime errors captured by Sentry (`VITE_SENTRY_DSN` required in Vercel env vars)
- Unhandled promise rejections and global errors forwarded to App Insights
- DLQ depth and outbox pending count exposed at `GET /api/health` (requires `x-wasel-health-token`)

To view verified error rates: Sentry → Issues → Production environment

---

## Broker Health

The `/api/health` endpoint returns real-time broker metrics when called with the
`x-wasel-health-token` header:

```json
{
  "broker": {
    "outboxPending": 0,
    "outboxFailed": 0,
    "deadLetterCount": 0,
    "deadLetterByTopic": {}
  }
}
```

Source: live Supabase queries against `event_outbox` and `dead_letter_messages` tables.

---

## Security

- Secret scanning enabled in CI (TruffleHog + `validate-no-secrets.mjs`)
- Pre-push hook blocks commits containing hardcoded secrets
- All authentication handled via Supabase Auth with secure session storage
- Real Supabase project ref removed from committed `.env` template (replaced with placeholder)

### Outstanding manual actions (blocking production hardening)

These require human action with push/console access — they cannot be automated:

1. **Rotate the Google service account key** — was committed to git history in
   `docs/wasel-planning-with-ai.json`. Purge with `git filter-repo` or BFG per `SECURITY.md`.
2. **Rotate `COMMUNICATION_WORKER_SECRET` and `COMMUNICATION_WEBHOOK_TOKEN`** — real
   values were present in `.env` inside the OneDrive sync tree.
3. **Move `.env.local` outside OneDrive sync** or exclude the project folder from OneDrive sync.
4. **Delete `_SECRETS_NEEDS_ROTATION_THEN_DELETE/`** after rotating the Google OAuth
   client secret JSON stored there.
5. **Enable GitHub Secret Scanning + Push Protection** in repo Settings → Security.

---

## Deployments

- Deployment pipeline: GitHub Actions (`.github/workflows/deploy.yml`)
- Quality gates: lint → typecheck → secrets-check → unit tests + coverage → build → visual regression
- Target cadence: multiple deployments per week

---

## Next 30-Day Goals

1. Connect `VITE_SENTRY_DSN` in Vercel env vars and confirm errors flow to Sentry dashboard.
2. Connect `VITE_APP_INSIGHTS_CONNECTION_STRING` and confirm Web Vitals appear in Azure portal.
3. Complete all credential rotations in `SECURITY_CHECKLIST.md`.
4. Purge committed service account key from git history.
5. Expand E2E test coverage to 90%.
6. Implement distributed tracing export via `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`.
