# Testing Strategy — Wasel Mobility OS

## Test Pyramid

```
        /\
       /E2E\        Playwright — critical user flows only (5-10%)
      /------\
     /Integr.\     API ↔ DB, event flows, service interactions (20%)
    /----------\
   /  Unit      \  Domain logic, services, repositories, utilities (75%)
  /--------------\
```

## Coverage Targets

| Layer | Target | Current | Gap |
|-------|--------|---------|-----|
| Unit (domain/services) | 80% | ~10% | +70% |
| Integration (API ↔ DB) | 60% | 0% | +60% |
| Contract (API routes) | 90% | 0% | +90% |
| E2E (critical flows) | Key flows covered | Partial | Complete missing |

## Unit Test Plan

### Domain Logic (src/domain/)
- Ride lifecycle state machine transitions
- Package lifecycle state machine transitions
- Booking capacity enforcement rules
- Pricing calculations (seat, package, surge)
- Trust score calculation
- Rating eligibility rules

### Services (backend/, src/services/ for API clients only)
- TripService: create, search, book, status change
- PackageService: create, assign, status transitions
- BusService: route search, schedule lookup, booking, cancellation
- WalletService: topup, send, withdraw, balance calculation
- RatingService: submission, eligibility check
- NotificationService: template rendering, preference filtering
- AdminService: user management, dispute resolution
- CorporateService: invoice generation, credit enforcement

### Repositories
- TripRepository: CRUD with PostGIS queries
- PackageRepository: CRUD with status constraints
- BusRepository: route/schedule/booking CRUD
- WalletRepository: balance updates, transaction recording

### Utilities
- Validation schemas (Zod)
- Geo/distance calculations
- Region config lookups
- Security helpers (rate limit, input sanitization)

## Integration Test Plan

### API Route Tests
- POST /v1/trips → verifies DB write + event publish
- POST /v1/trips/:id/book → verifies capacity enforcement + DB write + wallet transaction
- POST /v1/packages → verifies DB write + event publish
- POST /v1/bus/bookings → verifies seat inventory decrement
- POST /v1/wallet/topup → verifies Stripe webhook simulation + balance update
- POST /v1/ratings → verifies eligibility + trust score recalculation

### Event Flow Tests
- trip.created → ride-matching worker consumes → rides.assigned published
- trip.completed → payment-reconciliation captures → ops-analytics records metrics
- payment.captured → wallet credited → notification dispatched

### Auth/Authz Tests
- Unauthenticated request to protected endpoint → 401
- Rider attempts driver endpoint → 403
- User A attempts to cancel User B's booking → 403

## Contract Test Plan

- Every /v1 route has a Zod schema for request/response
- Contract tests verify: valid request → success response, invalid request → 400 with clear error
- OpenAPI spec generated from Zod schemas (where feasible)

## E2E Test Plan (Playwright)

Keep ONLY critical flows:

1. Registration + login (email + Google OAuth)
2. Driver creates trip
3. Passenger searches + books trip
4. Driver starts trip → trip goes in_progress
5. Trip completes → payment captured
6. Passenger submits rating
7. Package delivery flow: create → assign → pickup → deliver
8. Bus booking: search route → select schedule → book
9. Admin: view trips, reassign driver, resolve dispute
10. Corporate: create org → add member → generate invoice

## Backend Worker Tests

- ride-matching: PostGIS query correctness, scoring algorithm, idempotent reservation
- payment-reconciliation: Stripe capture/refund idempotency, escrow release logic
- ops-analytics: metric aggregation, corridor intelligence updates

## Running Tests

```bash
# Unit + Integration
npm run test                # Vitest
npm run test:coverage       # With coverage report

# E2E
npm run test:e2e            # Playwright (requires dev server)

# Backend workers
cd backend/workers/ride-matching && npm test
cd backend/workers/payment-reconciliation && npm test
```

## Continuous Integration

- Every PR runs: lint → typecheck → unit tests → build
- Nightly: full test suite including E2E on staging
- Pre-deploy: all tests must pass, coverage threshold enforced on critical modules
