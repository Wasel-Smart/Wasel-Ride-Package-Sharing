# Incremental Release Guide

## Overview

Wasel uses semantic versioning with automated releases. Every push to `master` triggers quality checks and can automatically create a new release.

## Semantic Versioning

- **Patch** (1.0.x): Bug fixes, minor changes
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

## Commit Convention

Commits determine the version bump:

```bash
# Patch release (1.0.0 → 1.0.1)
fix: resolve authentication timeout
chore: update dependencies

# Minor release (1.0.0 → 1.1.0)
feat: add package tracking
feature: implement real-time notifications

# Major release (1.0.0 → 2.0.0)
feat!: redesign authentication flow
feat: new API with BREAKING CHANGE in body
```

## Automated Release (Recommended)

Push to master and let GitHub Actions handle it:

```bash
git add .
git commit -m "feat: add driver rating system"
git push origin master
```

The workflow will:
1. Run quality checks
2. Determine version bump from commit message
3. Update package.json and CHANGELOG.md
4. Create git tag and GitHub release
5. Trigger Vercel deployment

## Manual Release

For explicit control:

```bash
# Auto-detect version bump
npm run release

# Specific version bump
npm run release:patch   # 1.0.0 → 1.0.1
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0
```

## Manual Workflow Trigger

Use GitHub Actions UI:
1. Go to Actions → Release workflow
2. Click "Run workflow"
3. Select version bump type
4. Click "Run workflow"

## Release Checklist

Before releasing:

- [ ] All tests pass locally: `npm run verify`
- [ ] Working directory is clean: `git status`
- [ ] On master branch: `git branch`
- [ ] Latest changes pulled: `git pull`
- [ ] Environment variables documented in `.env.example`
- [ ] Breaking changes documented in commit message

## Deployment Flow

```
Commit → Push → CI Checks → Version Bump → Tag → GitHub Release → Vercel Deploy
```

## Rollback

To rollback a release:

```bash
# Revert to previous version
git revert HEAD
git push origin master

# Or deploy specific tag
git checkout v1.0.0
git push origin HEAD:master --force
```

## Version History

View all releases:
- GitHub: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/releases
- Tags: `git tag -l`
- Changelog: [CHANGELOG.md](../CHANGELOG.md)

## Hotfix Process

For urgent production fixes:

```bash
# Create hotfix branch from production tag
git checkout -b hotfix/critical-fix v1.2.3

# Make fix
git commit -m "fix: resolve critical payment issue"

# Merge to master
git checkout master
git merge hotfix/critical-fix

# Release
npm run release:patch

# Clean up
git branch -d hotfix/critical-fix
```

## Pre-release Versions

For beta/alpha releases:

```bash
npm version prerelease --preid=beta
git push origin master --tags
```

## Environment-Specific Releases

- **Development**: Auto-deploy from `develop` branch
- **Staging**: Auto-deploy from `staging` branch  
- **Production**: Auto-deploy from `master` branch tags

## Monitoring Releases

Track deployment status:
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Actions: Repository → Actions tab
- Sentry: Monitor error rates post-release

## Release Notes

Automatically generated from commits. Enhance with:

```bash
# Edit CHANGELOG.md before release
# Add manual notes under version heading
```

## Troubleshooting

**Release workflow fails:**
- Check CI logs in GitHub Actions
- Ensure GITHUB_TOKEN has write permissions
- Verify no uncommitted changes

**Version conflict:**
- Pull latest: `git pull --rebase`
- Resolve conflicts in package.json
- Continue: `git rebase --continue`

**Vercel deployment fails:**
- Check Vercel dashboard logs
- Verify environment variables
- Review build command output
