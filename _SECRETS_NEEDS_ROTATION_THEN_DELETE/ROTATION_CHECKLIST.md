# Rotation Status (see SECURITY.md and docs/CREDENTIAL_ROTATION_GUIDE.md for full steps)

Full instructions already exist in the repo — `SECURITY.md` and
`docs/CREDENTIAL_ROTATION_GUIDE.md` are the canonical sources. This file is
just a status tracker so nothing gets lost between sessions.

## Verified this session (file-level only — I have no terminal/exec access)
- `docs/wasel-planning-with-ai.json` (the real service account key) is
  **no longer in the working tree** — only `wasel-planning-with-ai.example.json`
  remains. Good. BUT per SECURITY.md it was committed at some point, so it may
  still be in **git history** and needs a purge (`git filter-repo` or BFG —
  exact commands are in `SECURITY.md`). This can only be confirmed/run by you,
  from a terminal, with push access.
- The OAuth `client_secret_*.json` in `_SECRETS_NEEDS_ROTATION_THEN_DELETE/`
  was never committed to git (per SECURITY.md) — lower severity, but still
  sitting inside a OneDrive-synced folder.

## Outstanding — none of these can be done via file access, all need you
- [ ] Rotate Google OAuth client secret (Cloud Console)
- [ ] Purge `docs/wasel-planning-with-ai.json` from git history + rotate that
      service account key (IAM console)
- [ ] Rotate Stripe secret key, publishable key, webhook secret
- [ ] Rotate Twilio auth token + API key
- [ ] Rotate Supabase JWT secret, anon key, service role key
- [ ] Rotate Facebook app secret (if used)
- [ ] Rotate Resend/SendGrid API keys
- [ ] Generate new COMMUNICATION_WORKER_SECRET / COMMUNICATION_WEBHOOK_TOKEN
- [ ] Move `.env`/`.env.local` outside the OneDrive-synced folder, or exclude
      this folder from OneDrive sync entirely (Option A/B in SECURITY.md)
- [ ] Run `npm run verify:live-integrations` after rotating to confirm nothing broke

Status: rotation NOT done as of this session. This is the single biggest
blocker to a real (not self-scored) 9+ security rating.
