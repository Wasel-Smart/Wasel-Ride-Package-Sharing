# Contributing to Wasel

This repository is run with production-grade quality gates. Every change should leave the project safer, more testable, and easier to operate than it was before.

## Working Agreement

- Keep changes scoped. Small, reviewable pull requests move faster and are safer to release.
- Preserve the existing architecture and design system unless the change explicitly requires a broader refactor.
- Add or update tests for any behavior change.
- Update docs when a change affects setup, operations, database behavior, or user-facing flows.
- Do not commit secrets, real customer data, or production-only credentials.

## Local Setup

```bash
npm ci
cp .env.example .env
npm run dev
```

Use `.env.example` as the only committed source of environment shape. Local `.env*` files must stay untracked.

## Branches

- Use short-lived branches.
- Prefix automation or Codex branches with `codex/`.
- Keep `main` releasable. Do not merge red CI.

## Definition Of Done

Run the relevant checks before opening a pull request:

```bash
npm run type-check
npm run lint:strict
npm run test
npm run build
```

Run these when the change touches UI flows, accessibility, or routing:

```bash
npm run test:e2e
npm run test:e2e:a11y
npm run test:e2e:rtl
```

Run these when the change touches Supabase migrations, seeds, or database-facing services:

```bash
npm run verify:supabase-rollout
npm run seed
```

## Pull Request Expectations

- Explain the problem, the chosen fix, and any tradeoffs.
- Link the issue, task, or incident that justified the change.
- Include screenshots or short notes for visible UI changes.
- Call out environment, migration, or rollout requirements explicitly.
- Note any follow-up work instead of silently deferring it.

## Database Changes

- Add forward-only SQL migrations under `supabase/` or `db/` as appropriate.
- Keep migration docs and rollout docs in sync.
- Document any new tables, indexes, policies, or functions in the PR.
- Validate production safety assumptions before relying on anonymous client writes.

## Security

- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
- Never open a public issue for a live security problem.
- Redact secrets, tokens, phone numbers, and personal data from screenshots, logs, and test fixtures.

## Community Standards

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
