# Environment Setup for Vercel

Configure secrets, environment variables, and build-time settings.

## Environment Variable Types

### 1. Build-time (Static)
Available during build but not at runtime:
```bash
vercel env add BUILD_VARIABLE "value"
```

Use in: `next.config.js`, `vite.config.ts`, build scripts

### 2. Runtime (Server-side)
Available to API routes and server functions:
```bash
vercel env add DATABASE_URL "postgresql://..."
```

Access via: `process.env.DATABASE_URL`

### 3. Client-side Variables
Available to browser code (⚠️ never include secrets):

**Vite**: Prefix with `VITE_`:
```bash
vercel env add VITE_API_URL "https://api.example.com"
```

Access via:
```ts
const apiUrl = import.meta.env.VITE_API_URL;
```

**Next.js**: Prefix with `NEXT_PUBLIC_`:
```bash
vercel env add NEXT_PUBLIC_SENTRY_KEY "..."
```

Access via:
```ts
const key = process.env.NEXT_PUBLIC_SENTRY_KEY;
```

## Setting Variables via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variable
vercel env add DATABASE_URL

# List all variables
vercel env list

# Pull production variables locally
vercel env pull

# Deploy with specific environment
vercel --prod
```

## Setting Variables via Dashboard

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add/Edit variables
5. Select which environments (Production, Preview, Development)

## Secrets Best Practices

- ✅ Store database URLs, API keys, tokens as environment variables
- ✅ Use `.env.local` for local development (never commit)
- ✅ Rotate secrets regularly
- ✅ Use scoped tokens with minimal permissions
- ❌ Never hardcode secrets in code
- ❌ Don't log environment variables
- ❌ Don't commit `.env` files to Git

## Example `vercel.json` with Env References

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@VITE_API_URL",
    "VITE_VERSION": "@VITE_VERSION",
    "DATABASE_URL": "@DATABASE_URL"
  },
  "envFile": [".env.local"]
}
```

The `@` prefix tells Vercel to inject the value from your environment variables.

## Local Development

Create `.env.local` (never commit):
```bash
VITE_API_URL=http://localhost:3000
DATABASE_URL=postgresql://localhost/mydb
STRIPE_SECRET=sk_test_...
```

Pull production variables for testing:
```bash
vercel env pull
```

This creates `.env.local` with all production variables.
