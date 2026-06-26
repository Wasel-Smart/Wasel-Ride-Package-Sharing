# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities privately via [GitHub Security Advisories](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/security/advisories/new).

## Security Best Practices

This project follows strict security practices for both web and mobile applications:

### Environment Variables
- Never commit `.env` files or credentials to the repository
- The `.gitignore` blocks all `.env.*` variants, certificates, and token files
- Use `.env.example` as a template for required environment variables

### Secrets Management
- All API keys, tokens, and secrets must be rotated and stored in secure vaults
- See `SECURITY_CHECKLIST.md` for required credential rotation actions before production deployment

### Mobile Security
- Uses `expo-secure-store` for sensitive data persistence
- Implements proper permission handling (location, camera, biometrics)
- Runtime version policy ties updates to app version
- Sentry integration for error monitoring and crash reporting

### Web Security Headers
Configured in `vercel.json`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` with 1-year max-age
- `Content-Security-Policy` with strict source restrictions
- `Permissions-Policy` limiting camera/microphone access

### CI/CD Security
- CodeQL scanning on every push
- Dependency auditing via GitHub Actions
- Gitleaks secret scanning scheduled weekly
- Dependabot automated dependency updates