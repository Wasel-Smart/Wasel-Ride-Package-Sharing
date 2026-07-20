# Contributing

## Development standards

1. Use Node.js 20+ and npm 10+.
2. Copy `.env.example` to `.env` and fill in only the values required for your change.
3. Keep changes scoped. Avoid mixing feature work, refactors, and infrastructure edits in one pull request.
4. For UI changes, include before/after screenshots or a short recording in the pull request.
5. If your change affects contracts, workers, or infra, update the matching files in `docs/` or `infra/`.

## Local workflow

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run verify:ci
```

Use the full `npm run verify` flow when you also need browser-level validation.
Run `npm run verify:contracts` when touching `docs/openapi`, `infra`, or async topology contracts.

## Pull request expectations

1. Explain the user-facing problem and the chosen fix.
2. Note any environment, schema, or rollout implications.
3. Call out any follow-up work that is intentionally deferred.
4. Name the impacted event topics or workers when the change affects async flows.

## Commit guidance

- Prefer small, reviewable commits.
- Use clear, imperative commit messages.
- Do not commit `.env`, secrets, build artifacts, or local reports.
