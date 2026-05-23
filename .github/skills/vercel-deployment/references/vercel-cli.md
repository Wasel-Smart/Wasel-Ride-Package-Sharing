# Vercel CLI Commands Reference

Essential commands for deployment, configuration, and troubleshooting.

## Installation & Authentication

```bash
# Install globally
npm install -g vercel

# Login
vercel login

# Logout
vercel logout

# Switch account
vercel login --sso
```

## Project Management

```bash
# Link project (in project directory)
vercel link

# Link existing project
vercel link --project my-project

# List all projects
vercel projects list
vercel projects list --json  # JSON output for scripting

# Remove project link
vercel unlink
```

## Deployments

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific directory
vercel --cwd ./packages/web

# Deploy without cache
vercel --no-cache

# Deploy with specific environment
vercel --env DATABASE_URL=postgresql://...

# Skip build (deploy pre-built output)
vercel --skip-build
```

## Environment Variables

```bash
# List all variables
vercel env list

# Add variable
vercel env add MY_VAR
# Follow prompts to select environments (production/preview/development)

# Remove variable
vercel env remove MY_VAR

# Pull production variables to .env.local
vercel env pull

# Pull all variables to .env.*.local
vercel env pull --yes
```

## Build & Testing

```bash
# Build locally (exactly like Vercel)
vercel build

# Start local server with build output
vercel start

# Run in development mode with live reload
vercel dev

# Test full build locally
vercel build && vercel start
```

## Logs & Debugging

```bash
# Stream logs in real-time
vercel logs --follow --tail

# View only error logs
vercel logs --follow --tail --error-only

# Logs for specific function
vercel logs --follow --tail api/users

# View logs from specific deployment
vercel logs <DEPLOYMENT_ID>

# Filter logs
vercel logs --follow --tail | grep "error\|warning"

# Last 100 log lines
vercel logs --lines 100
```

## Deployment Management

```bash
# List deployments
vercel ls

# List deployments as JSON (for scripting)
vercel ls --json

# Promote deployment to production
vercel promote <DEPLOYMENT_ID>

# View deployment details
vercel inspect <DEPLOYMENT_ID>

# Remove deployment
vercel rm <DEPLOYMENT_ID> --yes
```

## Secrets & Security

```bash
# List all secrets
vercel secrets list

# Add secret
vercel secrets add MY_SECRET
# Paste secret value, press Ctrl+D when done

# Remove secret
vercel secrets remove MY_SECRET

# Verify secret (cannot view actual value)
vercel secrets list | grep MY_SECRET
```

## Aliases (Custom Domains)

```bash
# List aliases
vercel alias list

# Add custom domain/alias
vercel alias set my-app.vercel.app example.com

# Remove alias
vercel alias remove example.com
```

## Cron Jobs

```bash
# List configured cron jobs
vercel cron list

# Test cron endpoint manually
curl https://example.com/api/cron/cleanup
```

## Analytics & Monitoring

```bash
# View Web Vitals
vercel analytics

# View bandwidth usage
vercel usage

# Export analytics data
vercel analytics --format=csv
```

## Team Management

```bash
# Switch to team scope
vercel switch

# List team members
vercel teams ls

# Add team member
vercel teams add --role developer user@example.com
```

## Preview & Sharing

```bash
# Create shareable preview link
vercel link <DEPLOYMENT_URL>

# Get deployment URL
vercel ls | head -1
```

## Advanced Options

```bash
# Show help for any command
vercel --help
vercel deploy --help

# Dry-run (see what would happen)
vercel --prod --dry-run

# Force build even if no changes
vercel --force

# Specify Node version
vercel --node-version 18.x

# Output JSON for parsing
vercel ls --json | jq '.[0].url'

# Verbose output for debugging
vercel --verbose
```

## Configuration Files

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "DATABASE_URL": "@DATABASE_URL"
  }
}
```

### `.vercelignore`
```
node_modules
.git
.env.local
tests
docs
```

## Common Workflows

### Deploy & Monitor
```bash
vercel --prod && vercel logs --follow --tail
```

### Deploy & Test Performance
```bash
vercel --prod && \
sleep 5 && \
curl -w "\nTime: %{time_total}s\n" https://example.com
```

### Rollback Previous Version
```bash
vercel ls | grep "production" | head -2 | tail -1 | awk '{print $2}' | xargs vercel promote
```

### Set & Deploy
```bash
vercel env add MY_VAR && \
vercel --prod
```

## Troubleshooting

```bash
# Check version
vercel --version

# Check configuration
vercel projects list --json | jq '.[] | {name, .id}'

# Verbose debugging
vercel --verbose build

# Clear cache
vercel --no-cache --prod
```

## Documentation

For more: `vercel help` or https://vercel.com/docs/cli
