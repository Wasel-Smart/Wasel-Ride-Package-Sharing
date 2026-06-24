# Target Architecture — Wasel Mobility OS

## 1. Architectural Principles

1. **Backend owns authority.** Frontend is a thin client. No business logic, no write paths, no validations that enforce platform rules exist only in the browser.
2. **Single deployable truth.** One repo, one schema, one app. Duplicate trees are eliminated.
3. **Event-driven with transactional safety.** All state changes publish domain events through an outbox pattern. Consumers are idempotent.
4. **Explicit authz boundary.** Every write path checks role/permission server-side. RLS is defense-in-depth, not the primary gate.
5. **Observable by default.** Structured logs, metrics, tracing on every service call.

## 2. Target System Topology

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                       │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │   Web SPA        │  │   React Native Mobile    │  │
│  │   (Vite/React)  │  │   (Expo)                 │  │
│  └────────┬────────┘  └──────────┬───────────────┘  │
│           │  HTTPS/REST           │                   │
└───────────┼───────────────────────┼──────────────────┘
            │                       │
┌───────────▼───────────────────────▼──────────────────┐
│                  API GATEWAY / BFF                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │          Express API Server (real)               │ │
│  │  • Auth middleware (JWT → user/role)             │ │
│  │  • Rate limiting                                 │ │
│  │  • Request validation (Zod)                      │ │
│  │  • Route handlers → Service layer                │ │
│  │  • Response envelope { data, meta, error }       │ │
│  └─────────────────────────────────────────────────┘ │
│                          │                            │
│  ┌───────────────────────┼────────────────────────┐  │
│  │              SERVICE LAYER                       │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────┐  │  │
│  │  │ TripService │ │ PackageSvc   │ │ BusSvc  │  │  │
│  │  └─────────────┘ └──────────────┘ └─────────┘  │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────┐  │  │
│  │  │ WalletSvc   │ │ RatingSvc    │ │ NotifSvc│  │  │
│  │  └─────────────┘ └──────────────┘ └─────────┘  │  │
│  │  ┌─────────────┐ ┌──────────────┐              │  │
│  │  │ AdminSvc    │ │ CorporateSvc │              │  │
│  │  └─────────────┘ └──────────────┘              │  │
│  └───────────────────────┼────────────────────────┘  │
└──────────────────────────┼──────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  PostgreSQL │ │   Redis     │ │   Object    │
    │  + PostGIS  │ │  Streams    │ │   Storage   │
    │  + pg_cron  │ │  + Cache    │ │   (media)   │
    └─────────────┘ └─────────────┘ └─────────────┘
                           │
                           │ Event consumers
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐
   │ Ride    │      │ Payment   │     │ Ops       │
   │ Match   │      │ Reconciler│     │ Analytics │
   │ Worker  │      │ Worker    │     │ Worker    │
   └─────────┘      └───────────┘     └───────────┘
```

## 3. Canonical Directory Structure

```
wasel/
├── src/                          # Web frontend (canonical)
│   ├── features/                 # Route-level feature modules
│   │   ├── rides/
│   │   ├── packages/
│   │   ├── bus/
│   │   ├── wallet/
│   │   ├── profile/
│   │   ├── trust/
│   │   ├── admin/
│   │   ├── driver/
│   │   └── ...
│   ├── components/               # Shared presentational components
│   ├── hooks/                    # Reusable domain hooks
│   ├── contexts/                 # Auth, language, theme
│   ├── services/                 # API clients ONLY (no business logic)
│   │   ├── api.ts                # Centralized fetch with auth/retry
│   │   ├── trips.ts              # Trip API wrapper
│   │   ├── packages.ts
│   │   └── ...
│   ├── domain/                   # Shared domain types (frontend view models)
│   ├── platform/                 # Event bus client, RBAC client
│   ├── utils/                    # Helpers, env, security utils
│   └── main.tsx
│
├── backend/                      # Backend services (canonical)
│   ├── shared/                   # @wasel/backend-shared package
│   │   ├── src/
│   │   │   ├── config.ts
│   │   │   ├── logger.ts
│   │   │   ├── errors.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── db.ts
│   │   │   └── redis.ts
│   │   └── package.json
│   │
│   ├── api-gateway/              # Unified Express API (replaces api-server)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── trips.ts
│   │   │   │   │   ├── packages.ts
│   │   │   │   │   ├── bus.ts
│   │   │   │   │   ├── wallet.ts
│   │   │   │   │   ├── ratings.ts
│   │   │   │   │   ├── admin.ts
│   │   │   │   │   ├── corporate.ts
│   │   │   │   │   ├── notifications.ts
│   │   │   │   │   └── auth.ts
│   │   │   │   └── health.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── validate.ts
│   │   │   │   └── errors.ts
│   │   │   ├── services/         # Service layer (business logic)
│   │   │   │   ├── tripService.ts
│   │   │   │   ├── packageService.ts
│   │   │   │   ├── busService.ts
│   │   │   │   ├── walletService.ts
│   │   │   │   ├── ratingService.ts
│   │   │   │   ├── notificationService.ts
│   │   │   │   ├── adminService.ts
│   │   │   │   └── corporateService.ts
│   │   │   ├── repositories/     # Data access layer
│   │   │   │   ├── tripRepository.ts
│   │   │   │   ├── packageRepository.ts
│   │   │   │   ├── busRepository.ts
│   │   │   │   └── ...
│   │   │   ├── domain/           # Domain models and events
│   │   │   │   ├── events.ts
│   │   │   │   ├── trip.ts
│   │   │   │   ├── package.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   └── Dockerfile
│   │
│   ├── workers/                  # Background event consumers
│   │   ├── ride-matching/
│   │   ├── payment-reconciliation/
│   │   ├── ops-analytics/
│   │   ├── notification-delivery/
│   │   ├── package-assignment/
│   │   └── bus-manifest/
│   │
│   └── migrations/               # Single canonical migration history
│       └── (ordered .sql files)
│
├── supabase/
│   ├── migrations/               # Canonical schema (matches backend/migrations)
│   ├── functions/                # Edge Functions for Stripe/ClIQ
│   └── config.toml
│
├── infra/
│   ├── kubernetes/
│   │   ├── base/
│   │   ├── overlays/
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── prod/
│   │   └── helm/                 # Helm charts (optional)
│   ├── observability/
│   └── docker-compose.*.yml
│
├── tests/
│   ├── unit/                     # Domain, services, repositories
│   ├── integration/              # API ↔ DB, event flows
│   ├── contract/                 # API contract tests
│   ├── e2e/                      # Playwright critical flows
│   └── backend/                  # Worker/service tests
│
└── docs/
    ├── production-gap-report.md
    ├── target-architecture.md
    ├── repo-reconciliation-plan.md
    ├── domain-model.md
    ├── api-surface.md
    ├── testing-strategy.md
    └── wasel-100-completion-report.md
```

## 4. API Surface (Target)

All endpoints under `/v1/`. Authentication via Bearer JWT. Response envelope: `{ data, meta, error }`.

| Domain | Key Endpoints |
|--------|--------------|
| **Trips** | `POST /v1/trips` (driver creates), `GET /v1/trips/search`, `GET /v1/trips/:id`, `POST /v1/trips/:id/book`, `PATCH /v1/trips/:id/status` |
| **Packages** | `POST /v1/packages`, `GET /v1/packages/:id`, `POST /v1/packages/:id/assign`, `POST /v1/packages/:id/status` |
| **Bus** | `GET /v1/bus/routes`, `GET /v1/bus/schedules`, `POST /v1/bus/bookings`, `PATCH /v1/bus/bookings/:id/cancel` |
| **Wallet** | `GET /v1/wallet/:userId/balance`, `POST /v1/wallet/:userId/topup`, `GET /v1/wallet/:userId/transactions` |
| **Ratings** | `POST /v1/ratings`, `GET /v1/ratings/:targetId` |
| **Notifications** | `GET /v1/notifications`, `PATCH /v1/notifications/:id/read` |
| **Trust** | `GET /v1/trust/status/:userId`, `POST /v1/trust/verify/phone`, `POST /v1/trust/verify/identity` |
| **Admin** | `GET /v1/admin/rides`, `PATCH /v1/admin/rides/:id/dispatch`, `GET /v1/admin/users`, `GET /v1/admin/payments/ Reconciliation` |
| **Corporate** | `POST /v1/corporate/organizations`, `POST /v1/corporate/invoices/generate`, `GET /v1/corporate/credits/:orgId` |

## 5. Domain Events

| Event | Publisher | Consumers |
|-------|-----------|-----------|
| `trip.created` | TripService | ride-matching, notification |
| `trip.status_changed` | TripService | notification, ops-analytics |
| `trip.booked` | TripService | payment-reconciliation, notification |
| `trip.completed` | TripService | payment-reconciliation, ops-analytics, rating-prompt |
| `trip.cancelled` | TripService | payment-reconciliation, notification |
| `package.created` | PackageService | package-assignment, notification |
| `package.assigned` | PackageService | notification |
| `package.picked_up` | PackageService | notification |
| `package.in_transit` | PackageService | ops-analytics |
| `package.delivered` | PackageService | payment-reconciliation, rating-prompt |
| `package.failed` | PackageService | notification |
| `payment.authorized` | PaymentService | payment-reconciliation |
| `payment.captured` | PaymentReconciler | ops-analytics, wallet |
| `payment.refunded` | PaymentReconciler | wallet, notification |
| `rating.submitted` | RatingService | ops-analytics, trust-score |
| `user.verified` | TrustService | notification |

## 6. Data Ownership Rules

| Entity | Owner | Write Path |
|--------|-------|-----------|
| Trips | TripService (API) | `POST /v1/trips` → `tripRepository.create()` |
| Bookings | TripService | `POST /v1/trips/:id/book` → `tripRepository.createBooking()` |
| Packages | PackageService | `POST /v1/packages` → `packageRepository.create()` |
| Bus Routes | BusService | Admin-only endpoints |
| Wallet | WalletService | `POST /v1/wallet/topup` → `walletRepository.credit()` |
| Transactions | WalletService | Written inside wallet operations only |
| Ratings | RatingService | `POST /v1/ratings` after trip/package completion |
| Notifications | NotificationService | Triggered by domain events |
| Users/Profiles | IdentityService (for auth), ProfileService (for profile updates) | Dedicated endpoints |
| Disputes | TrustService | Dedicated endpoints |

## 7. Migration Strategy

1. **Week 1-2**: Create `@wasel/backend-shared`, unify schema, build real API gateway core
2. **Week 3-4**: Move business logic into service layer, replace direct Supabase calls
3. **Week 5-6**: Complete missing backend services (bus, package, notification)
4. **Week 7-8**: Admin/ops dashboard, driver console, corporate billing
5. **Week 9-10**: Testing, lint fixes, giant file decomposition
6. **Week 11-12**: Validation, deployment, completion report
