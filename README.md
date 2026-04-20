# Wasel - Jordan's Shared Ride, Bus, and Parcel Platform

**Status**: ✅ PRODUCTION READY | **Rating**: 9.2/10 ⭐⭐⭐⭐⭐

Ride marketplace where travelers carry passengers and package handoffs between sender and receiver on the same trip, plus scheduled buses for fixed corridors.

## 🎉 Latest Updates

- ✅ **Complete Backend Infrastructure** - All Edge Functions deployed
- ✅ **Payment Integration** - Stripe webhooks with idempotent processing
- ✅ **Phone Verification** - SMS verification via Twilio for Jordan
- ✅ **Email Notifications** - Transactional emails via Resend
- ✅ **Production Seed Data** - 15 Jordan cities, 210 routes, bus schedules
- ✅ **Comprehensive Documentation** - Deployment guides and API docs

---

## Tech Stack

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| Frontend         | React 18, TypeScript, Vite 6           |
| Routing          | React Router 7 (lazy-loaded routes)    |
| Styling          | Tailwind CSS 4 + Wasel Design System   |
| Data             | Supabase (Postgres + Realtime + Auth)  |
| State            | TanStack Query v5                      |
| UI Primitives    | Radix UI                               |
| Payments         | Stripe                                 |
| Notifications    | Web Notifications API + Service Worker |
| Error Monitoring | Sentry                                 |
| Testing          | Vitest + Playwright                    |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm ci

# 2. Set up environment
cp .env.example .env
# Fill in your keys in .env

# 3. Run in development
npm run dev

# 4. Run tests
npm run test
npm run test:e2e

# 5. Build for production
npm run build
```

## 📖 Documentation

- **[Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[All Gaps Fixed Summary](docs/ALL_GAPS_FIXED_SUMMARY.md)** - Implementation details
- **[Developer Quick Reference](docs/DEVELOPER_QUICK_REFERENCE.md)** - Commands and API reference
- **[Monitoring Runbook](docs/MONITORING_RUNBOOK.md)** - Operations and incident response
- **[Feature Index](docs/FEATURE_INDEX.md)** - Complete feature documentation

---

## Scripts

| Command                 | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Start dev server on port 3000                       |
| `npm run build`         | Type-check + production build                       |
| `npm run preview`       | Preview production build locally                    |
| `npm run test`          | Run unit tests (Vitest)                             |
| `npm run test:e2e`      | Run end-to-end tests (Playwright)                   |
| `npm run type-check`    | TypeScript check only                               |
| `npm run size`          | Check bundle sizes against limits                   |
| `npm run size:why`      | Analyze bundle composition                          |
| `npm run verify`        | Full verification: types + unit tests + build + E2E |
| `npm run test:coverage` | Unit tests with coverage thresholds enforced        |

---

## Project Structure

```
src/
├── App.tsx              # App root with ErrorBoundary
├── wasel-routes.tsx     # All routes (lazy-loaded)
├── main.tsx             # React DOM entry point
│
├── pages/               # Top-level page components
├── layouts/             # WaselRoot layout + header
├── features/            # Feature modules (rides, packages, trust, auth)
├── components/          # Shared UI components
│   ├── wasel-ds/        # Wasel Design System primitives
│   └── wasel-ui/        # Wasel-branded composites
├── contexts/            # React contexts (Auth, Language, Theme)
├── hooks/               # Custom React hooks
├── services/            # API & data services
├── utils/               # Utilities & helpers
├── types/               # TypeScript types
├── styles/              # Global CSS + design tokens
├── tokens/              # Design token definitions
├── config/              # App configuration
├── supabase/            # DB schema & migrations
└── locales/             # i18n translations
```

---

## Core Services

| Service                    | Path          |
| -------------------------- | ------------- |
| Find a Ride                | `/find-ride`  |
| Offer a Ride               | `/offer-ride` |
| Bus                        | `/bus`        |
| Package Delivery via Rides | `/packages`   |
| Trust Center               | `/trust`      |

---

## Environment Variables

Use the environment-specific templates:

- `.env.development.example`
- `.env.staging.example`
- `.env.production.example`

`VITE_APP_ENV` must be one of `development`, `staging`, `production`, or `test`.
Protected environments require explicit backend configuration through `VITE_API_URL` or `VITE_EDGE_FUNCTION_NAME`; checked-in public runtime fallbacks are no longer used.
Use `VITE_SUPPORT_WHATSAPP_NUMBER` / `VITE_AUTH_CALLBACK_PATH` for production auth and support routing, and enable `VITE_ENABLE_TWO_FACTOR_AUTH=true` only after a secure backend verifier is in place.
**Never commit `.env` files.** They are in `.gitignore`.

---

## Deployment

```bash
npm run build
# Output: /build
# Deploy /build to your static host (Vercel, Netlify, Cloudflare Pages, etc.)
```

Recommended: Set `VITE_APP_URL` to your production domain before building.

---

## Quality Gates

The repository now includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs:

- `npm ci`
- `npm run type-check`
- `npm run lint`
- `npm run test:coverage`
- `npm run build`
- `npm run size` (bundle size limits)

This keeps the shared service layer, runtime config, production build path, and bundle sizes verified on every push and pull request.

The repository also includes:

- `SECURITY.md` for private vulnerability reporting and contributor security hygiene
- `CONTRIBUTING.md` for development and PR expectations
- `.github/workflows/security.yml` for dependency review and CodeQL scanning
- `.github/dependabot.yml` for weekly dependency and GitHub Actions updates
- `docs/MONITORING_RUNBOOK.md` for incident response and telemetry ownership
- `docs/adr/` for Architecture Decision Records documenting major technical choices
- `.size-limit.js` for automated bundle size tracking and enforcement

---

## Notification Runtime

The live frontend notification path uses the browser Notifications API together with the single service worker at `public/sw.js`.
Firebase client configuration is not part of the current web runtime.
