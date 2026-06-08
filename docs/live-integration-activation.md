# Live Integration Activation

Use this checklist before calling Wasel fully live-integrated in production.

## Required Gate

Run:

```bash
npm run verify:backend-integrations
```

This executes contract validation, wiring validation, the production Kubernetes proof gate, and the live provider gate.

## Current External Blockers

The application code and production proof gate are ready. Full live integration still requires real provider credentials for:

- Supabase OAuth client secrets: Google and Facebook.
- Stripe server credentials: secret key, webhook secret, Wasel Plus price ID.
- Google Maps Routes API key.
- Email provider: Resend or SendGrid API key.
- Communications worker secret and webhook token.
- CliQ merchant/API/webhook credentials.
- Sanad client/API/webhook credentials.

Do not use placeholder, demo, or fabricated values. After secrets are set in the deployment environment, rerun `npm run verify:live-integrations`.

## Evidence Artifacts

The live integration gate writes:

- `artifacts/live-integrations/live-integration-report.json`
- `artifacts/live-integrations/live-integration-report.md`

These reports are local generated artifacts and are intentionally ignored by git.
