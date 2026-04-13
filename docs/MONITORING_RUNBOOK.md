# Monitoring Runbook

This runbook defines the minimum operating signals required to keep Wasel healthy in production.

## Primary Signals

- Sentry: application errors, unhandled rejections, browser runtime failures, replay-backed investigations
- Web Vitals: `LCP`, `CLS`, `INP`, `FCP`, `TTFB` written to the `web_vitals` table
- Lighthouse CI: regression gate for performance, accessibility, and best practices
- Uptime checks: homepage, auth callback route, and any public health endpoint

## Required Dashboards

- Sentry issues filtered to `environment:production`
- Sentry releases and deploy markers
- Supabase dashboard or SQL view for recent `web_vitals`
- CI dashboards for `verify`, `e2e-core`, `e2e-a11y`, `e2e-rtl`, and security workflows

## Alert Thresholds

- Error spike: any new production error with repeated events in 15 minutes
- Availability: two consecutive uptime failures
- Performance: p75 `LCP > 2800ms`, `CLS > 0.1`, or `INP > 200ms`
- Quality gate: failed `main` branch CI or security workflow

## Release Checklist

Before release:

- Confirm Sentry DSN is configured
- Confirm source maps are uploaded for the release
- Confirm `web_vitals` inserts are succeeding
- Confirm CI is green on the target commit

After release:

- Watch Sentry for 30 minutes
- Check new issue volume, replay samples, and route-level failures
- Verify no major Web Vitals regression on the landing page or auth flow

## Incident Triage

1. Identify the user-facing impact and affected routes.
2. Check Sentry for new errors, regressions, and replay evidence.
3. Check deployment history and recent merged PRs.
4. Check Supabase operational signals and recent migration changes.
5. Roll back or feature-flag off the bad change if impact is active.
6. Record the incident and follow-up actions in the linked task or incident doc.

## Ownership

- Engineering lead owns CI, release safety, and remediation
- Product owner owns user impact and communications
- Database owner reviews migration and policy-related incidents

## Source Files

- Runtime monitoring: `src/utils/monitoring.ts`
- Web Vitals reporter: `src/utils/webVitalsReporter.ts`
- CI gates: `.github/workflows/ci.yml`
- Security automation: `.github/workflows/security.yml`
