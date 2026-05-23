# CI/CD Integration with Vercel

Automate deployments via GitHub, GitLab, or Bitbucket.

## GitHub Integration (Recommended)

### Prerequisites
- Vercel project connected to GitHub repository
- GitHub token with repo access

### Automatic Deployments

Vercel automatically deploys on push:

| Branch | Deployment |
|--------|-----------|
| `main` or `master` | Production |
| Other branches | Preview |
| Pull requests | Preview with auto-comment |

### Configure in `.github/workflows/`

Create `.github/workflows/vercel-deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitHub Secrets Setup

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add three secrets:
   - `VERCEL_TOKEN`: Get from Vercel → Settings → Tokens
   - `VERCEL_ORG_ID`: From Vercel dashboard URL or `vercel env list`
   - `VERCEL_PROJECT_ID`: Same source

```bash
# Get via CLI
vercel projects list --json | jq '.[] | select(.name=="your-project")'
```

## Preview Deployments

Vercel auto-comments on PRs with preview URL:

```
✅ Preview: https://my-app-git-feature.vercel.app
```

Automatically redeploys on new commits to PR branch.

### Disable Auto-preview (if needed)

In Vercel dashboard → Git → Deployments:
- Toggle off "Preview deployments for pull requests"

## Environment-Specific Deployments

### Production Only
```yaml
- uses: vercel/action@main
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-args: '--prod'
```

### Preview Only
```yaml
- uses: vercel/action@main
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Conditional by Branch
```yaml
- uses: vercel/action@main
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

## Deployment Approvals

For production deployments, require manual approval:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    environment: production  # Requires approval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

Configure required reviewers in Settings → Environments → production.

## Slack Notifications

Add notification on deployment completion:

```yaml
- name: Notify Slack
  if: always()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "Deployment ${{ job.status }}"
      }'
```

## Rollback via CI/CD

```yaml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      deployment-id:
        description: 'Deployment ID to promote'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: 'promote ${{ github.event.inputs.deployment-id }}'
```

## Monitoring Deployments

View deployment status in Actions:
- Click workflow run
- See Vercel deployment link and status
- Click link to view full build logs

## Testing Before Merge

Require passing CI checks before merging:

1. Go to repo Settings → Branch protection rules
2. Require status checks to pass
3. Select Vercel deployment status

## Multi-Environment Setup

For dev, staging, production:

```yaml
name: Deploy to All Environments

on: [push]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_DEV_PROJECT_ID }}

  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: staging
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_PROD_PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting CI/CD

**Deployment never triggers**: Check if branch is connected in Vercel dashboard → Git.

**Permission denied**: Verify `VERCEL_TOKEN` is valid and has correct scope.

**Environment variables missing**: Ensure set in Vercel dashboard, not just in GitHub Secrets.

**Deployment succeeds locally but fails in CI**: Check Node.js version matches and dependencies are committed.
