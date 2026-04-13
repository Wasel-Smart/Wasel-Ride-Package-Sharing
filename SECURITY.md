# Security Policy

## Supported Branches

Security fixes are supported on `master` and `main`.

## Reporting A Vulnerability

Do not open a public GitHub issue for a suspected vulnerability.

Report privately using one of these channels:

- GitHub Security Advisories for this repository
- `support@wasel.jo`

Please include:

- Affected component, route, or workflow
- Reproduction steps or proof of concept
- Impact assessment
- Any mitigation you already verified

## Response Targets

- Acknowledgement: within 1 business day
- Initial triage: within 3 business days
- Remediation plan or risk decision: within 7 business days for confirmed issues

## Scope

We care most about:

- Authentication and session handling
- Supabase row-level security and anonymous insert surfaces
- Payments, wallet, and booking integrity
- Secrets handling and environment configuration
- CSP, headers, and browser-side trust boundaries
- Supply-chain and dependency risk

## Safe Harbor

If you act in good faith, avoid data destruction, avoid service disruption, and do not access more data than necessary to prove impact, we will treat your research as authorized.

## Security Hygiene For Contributors

- Never commit `.env*` files or production secrets.
- Use publishable Supabase keys only on the client.
- Redact personal data from logs, fixtures, and screenshots.
- Prefer least privilege for new database policies, edge functions, and API access.
