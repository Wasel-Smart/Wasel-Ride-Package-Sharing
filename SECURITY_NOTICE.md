# Security notice — OAuth credential rotation required

## Action required

A Google OAuth client-secret JSON file was found in the project root:

```
client_secret_2_631682127784-5oaqhkeemp11s370vr4g9oaks888rnf7.apps.googleusercontent.com.json
```

This file contains credentials that must be treated as **compromised** if it was ever pushed to a shared or public repository.

### Steps

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Find the OAuth 2.0 client ID `631682127784-5oaqhkeemp11s370vr4g9oaks888rnf7`.
3. Click **Reset secret** (or delete and recreate the credential).
4. Update `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_SECRET` in your Vercel environment and any local `.env` files.
5. Delete the JSON file from disk — it is already covered by `.gitignore` (`client_secret_*.json`).

### Why this matters

OAuth client secrets are equivalent to passwords. Anyone who obtained this file can impersonate your application with Google's OAuth endpoints, potentially gaining access to user accounts that authenticated via Google.

### Prevention

- Never download OAuth JSON files into a project directory. Store credentials in environment variables only.
- The `.gitignore` now contains `client_secret_*.json` and `*_credentials.json` to prevent accidental commits.
- Consider adding a pre-commit hook (`git-secrets` or `detect-secrets`) to catch credential patterns before they reach the repository.
