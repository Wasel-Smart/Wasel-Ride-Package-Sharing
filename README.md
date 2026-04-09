# Wasel - Jordan's Shared Ride, Bus, and Parcel Platform

Ride marketplace where travelers carry passengers and package handoffs between sender and receiver on the same trip, plus scheduled buses for fixed corridors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6 |
| Routing | React Router 7 (lazy-loaded routes) |
| Styling | Tailwind CSS 4 + Wasel Design System |
| Data | Supabase (Postgres + Realtime + Auth) |
| State | TanStack Query v5 |
| UI Primitives | Radix UI |
| Payments | Stripe |
| Notifications | Web Notifications API + Service Worker |
| Error Monitoring | Sentry |
| Testing | Vitest + Playwright |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your keys in .env

# 3. Run in development
npm run dev
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run type-check` | TypeScript check only |
| `npm run verify` | Full verification: types + unit tests + build + E2E |
| `npm run test:coverage` | Unit tests with coverage thresholds enforced |

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

| Service | Path |
|---|---|
| Find a Ride | `/find-ride` |
| Offer a Ride | `/offer-ride` |
| Bus | `/bus` |
| Package Delivery via Rides | `/packages` |
| Trust Center | `/trust` |

---

## Environment Variables

See `.env.example` for all required and optional variables.  
Use `VITE_EDGE_FUNCTION_NAME` when your backend edge function name differs from the default slug, `VITE_API_URL` for a custom API base, `VITE_SUPPORT_WHATSAPP_NUMBER` / `VITE_AUTH_CALLBACK_PATH` for production auth and support routing, and `VITE_ENABLE_TWO_FACTOR_AUTH=true` only after a secure backend verifier is in place.
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

This keeps the shared service layer, runtime config, and production build path verified on every push and pull request.

---

## Notification Runtime

The live frontend notification path uses the browser Notifications API together with the single service worker at `public/sw.js`.
Firebase client configuration is not part of the current web runtime.
