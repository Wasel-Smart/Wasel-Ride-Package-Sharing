---
name: vercel-deployment
description: 'Deploy and manage applications on Vercel. Use when deploying to production, configuring environment variables, managing preview deployments, troubleshooting build issues, or optimizing deployment pipelines.'
argument-hint: 'Optional: deployment stage (production, preview, staging) or specific task'
user-invocable: true
disable-model-invocation: false
---

# Vercel Deployment & Management

Deploy applications to Vercel, manage environment variables, preview deployments, and troubleshoot build and runtime issues.

## When to Use

- **Production deployments**: Push to main/master to trigger automatic deployments
- **Preview deployments**: Test changes in isolated preview environments before production
- **Environment configuration**: Set secrets, variables, and build/runtime settings
- **Build troubleshooting**: Debug failed deployments, analyze logs, fix configuration issues
- **Pipeline optimization**: Improve deployment speed, caching, and reliability

## Quick Start

### 1. Configure Vercel Project

Ensure `vercel.json` is properly configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@VITE_API_URL",
    "DATABASE_URL": "@DATABASE_URL"
  }
}
```

### 2. Deploy to Production

Push to the production branch (typically `main`):
```bash
git push origin main
```

Monitor deployment in Vercel dashboard or use [Vercel CLI](./references/vercel-cli.md):
```bash
vercel logs --tail
```

### 3. Preview Deployments

Create a feature branch and push:
```bash
git checkout -b feature/my-feature
git push origin feature/my-feature
```

Vercel automatically creates a preview URL in your PR.

## Key Tasks

### Environment Variables
- Set via Vercel dashboard: Settings → Environment Variables
- Or use CLI: `vercel env add VARIABLE_NAME`
- Reference in code: `process.env.VARIABLE_NAME`
- For client-side access: prefix with `VITE_`, `NEXT_PUBLIC_`, etc.

See [Environment Configuration](./references/environment-setup.md)

### Build Optimization
- Configure build commands in `vercel.json`
- Enable caching for dependencies: `.vercelignore` to exclude unnecessary files
- Analyze build size: Use Vercel Analytics and Performance Insights

See [Build Optimization](./references/build-optimization.md)

### Deployment Troubleshooting
- Check logs in dashboard: Deployments → Logs
- Use CLI: `vercel logs --follow --tail`
- Common issues: [Troubleshooting Guide](./references/troubleshooting.md)

### Rollback & Recovery
- Revert to previous deployment: Vercel dashboard → Deployments → click prior version
- Manual rollback: `vercel promote <deployment-url>`
- Zero-downtime updates: Vercel handles automatically

## Integration with CI/CD

GitHub Actions integration is pre-configured. Deployments trigger automatically on push:
- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull requests** → Automatic preview URL + comments

See [CI/CD Integration](./references/ci-cd.md)

## Monitoring & Analytics

- **Vercel Analytics**: Dashboard → Analytics → view Core Web Vitals
- **Error tracking**: Dashboard → Integrations → connect Sentry or similar
- **Performance**: Use Lighthouse, Web Vitals, and RUM data

## Next Steps

1. Review [Environment Setup](./references/environment-setup.md) for secrets & variables
2. Check [Build Optimization](./references/build-optimization.md) to improve deploy speed
3. Use [Troubleshooting Guide](./references/troubleshooting.md) if issues arise
4. Configure [Monitoring](./references/monitoring.md) for production insights
