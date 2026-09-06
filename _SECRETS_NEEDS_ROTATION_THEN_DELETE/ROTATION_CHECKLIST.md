# Credential Rotation Checklist

One file remains here: a Google OAuth `client_secret_*.json`.
This has been an open blocker across multiple sessions. It also sits inside
a OneDrive-synced folder, which means it may already be replicated to
Microsoft's cloud — treat it as already-exposed, not just "at risk."

Steps (must be done by Laith — requires authenticated dashboard access):

1. Go to Google Cloud Console → APIs & Services → Credentials.
2. Find the OAuth 2.0 Client ID matching this file's client_id.
3. Reset/regenerate the client secret (or delete and recreate the OAuth
   client if the console offers that instead of pure rotation).
4. Update the new secret in:
   - Supabase project environment variables (Auth provider config)
   - Vercel project environment variables (all environments: preview,
     staging, production)
   - Any local `.env*` files still referencing the old value
5. Redeploy so the new secret takes effect.
6. Confirm login via Google OAuth still works end-to-end (test on
   staging first, then production).
7. Delete this entire `_SECRETS_NEEDS_ROTATION_THEN_DELETE/` folder —
   including this checklist — once rotation is confirmed working.
8. Search the repo (and OneDrive-synced history if possible) for any
   other place the old secret value was pasted — e.g. old `.env.backup`
   files, chat exports, docs — and remove those too.

Status: NOT YET DONE as of this session.
