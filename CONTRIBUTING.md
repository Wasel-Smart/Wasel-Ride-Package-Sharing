# Contributing to Wasel

Thank you for helping build Wasel. This guide explains how to contribute effectively.

## Requirements

- Node.js 20+ and npm 10+
- A `.env` file based on `.env.example` (never commit `.env`)

## Local workflow

```bash
npm install
npm run dev
```

Before opening a PR run:

```bash
npm run verify:ci        # type-check + lint + unit tests + build
npm run verify:contracts # OpenAPI + infra contract validation (when touching those areas)
```

Use the full `npm run verify` gate when you also need Playwright browser validation.

## Commit messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

Types: feat | fix | chore | refactor | docs | test | ci | perf | security
```

Examples:
```
feat(rides): add driver ETA display to booking confirmation
fix(auth): handle expired refresh token on app resume
docs(architecture): update sequence diagram for package delivery flow
chore(deps): bump stripe to 22.1.0
security: rotate Twilio API key reference in .env.example
```

**Do not use:**
- Single-character messages (`.`, `t`, `y`)
- `yes` as a commit message
- `"save current changes"` or similar non-descriptive messages

## Pull request expectations

1. **Explain the problem**, not just the solution — one sentence is enough.
2. **Note environment, schema, or rollout implications** if any.
3. **Include screenshots or a short recording** for UI changes.
4. **Name affected event topics or workers** when the change touches async flows.
5. **Call out intentionally deferred work** so reviewers know what's missing.

## PR checklist (included in the PR template)

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes (zero warnings)
- [ ] `npm run test:unit` passes
- [ ] `npm run build` succeeds
- [ ] Screenshots / recording attached for UI changes
- [ ] `.env.example` updated if new env vars are introduced
- [ ] `docs/` updated if API contracts, workers, or infra change
- [ ] `CHANGELOG.md` updated under `[Unreleased]`

## What not to do

- Do not commit `.env`, `.env.local`, or any file containing real credentials.
- Do not commit build output, `node_modules`, `dist/`, or `coverage/`.
- Do not commit AI tool artefacts (`skills-lock.json`, `.codex/`, `.agents/`, etc.).
- Do not add self-rating or certification documents.
- Do not open a PR with 50+ unrelated commits — rebase and squash first.

## Scope guidelines

- Keep changes focused: do not mix feature work, refactors, and infra changes in one PR.
- Prefer small, reviewable commits.
- Use `git rebase -i` to clean up history before opening a PR.
