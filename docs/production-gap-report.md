# Wasel Production Gap Report

> Generated: 2026-06-24  
> Baseline completeness: 62/100

## Critical Gaps (Block Production)

### 1. Fake Backend Persistence — CRITICAL
- `backend/api-server/src/routes/v1.ts` stores all data in `Map()` and hardcoded arrays
- No database connection in the API gateway
- Every write is lost on restart
- Fix: Replace with real PostgreSQL persistence via service layer

### 2. Duplicate Codebases — CRITICAL
- `src/` and `Wasel-Ride-Package-Sharing/src/` are near-identical
- Diverging schemas, type definitions, routes, services
- Maintenance burden and runtime inconsistencies
- Fix: Reconcile into single canonical `src/`, delete duplicate

### 3. Schema Drift — CRITICAL
- 30+ migration files with conflicting table definitions
- Multiple `users` vs `profiles` table variants
- `trip_status` enum defined 4+ different ways
- `bookings` vs `trip_bookings` naming conflicts
- Root migrations don't contain core tables
- Fix: Create single canonical migration, archive conflicts

### 4. Client-Side Business Logic — CRITICAL
- `src/services/directSupabase/*` makes direct Supabase calls from browser
- Ride lifecycle, wallet mutations, trust rules, package states in frontend
- RLS policies insufficient to prevent authorized-user bypass
- Fix: Move all write paths through backend API/Edge Functions

### 5. Missing `@wasel/backend-shared` Package — CRITICAL
- 32 imports across 7 services reference `@wasel/backend-shared`
- Package not in repo — builds fail
- Fix: Create the shared package locally

### 6. Broken Backend Services — HIGH
- Wallet service: real DB/Redis but no Dockerfile, no K8s manifest
- Trust moderation: real DB but Twilio/SMS stubbed
- GDPR service: real DB but no K8s manifest
- Mobility OS: minimal implementation
- Identity service: no Dockerfile, no K8s manifest
- Package delivery: no Dockerfile, payment gateway stubbed
- Notification: no K8s manifest, all delivery providers stubbed
- Fix: Containerize all services, complete integrations

### 7. Mock Bus Backend — HIGH
- Bus routes are hardcoded in API server
- No bus booking persistence
- No seat inventory management
- Fix: Build real bus service with DB-backed routes/schedules/seats

### 8. Giant Files — HIGH
- `FindRidePage.tsx` (1501 lines), `BusPage.tsx` (1711 lines), `ProfilePage.tsx` (752 lines)
- `translations.ts` (2931 lines), `WaselMap.tsx` (1401 lines)
- `walletApi.ts` (1398 lines)
- Fix: Decompose into feature modules, hooks, components

### 9. Linting Discipline Removed — MEDIUM
- All React Hooks rules disabled
- `@typescript-eslint/no-explicit-any` off
- `@typescript-eslint/no-unused-vars` off
- `react-hooks/exhaustive-deps` off
- Fix: Re-enable incrementally, fix violations

### 10. Test Coverage Gaps — HIGH
- Largest pages have zero unit tests
- `directSupabase` services untested
- Backend services largely untested (only ride-matching, ops-analytics have tests)
- No integration tests for API ↔ DB
- Fix: Add unit tests for domain logic, integration tests for API routes

### 11. No Admin/Ops Dashboard — HIGH
- Admin routes point to placeholder `OperationsOverviewPage`
- No user management, trip oversight, payment review, dispatch tools
- Fix: Build operational admin UI with real data binding

### 12. Stubbed Notification Delivery — MEDIUM
- SMS/Email/Push all log to console
- No retry, dead-letter, or failure handling
- Fix: Implement provider adapters with fallback logging

### 13. No Corporate B2B Billing — MEDIUM
- `business_accounts` table exists but no billing workflows
- No invoice generation, monthly statements, cost-center tracking
- Fix: Build corporate billing service and admin UI

### 14. No Post-Trip Ratings UX — LOW
- `reviews` table exists but no rating submission UI
- No rating eligibility enforcement in frontend
- Fix: Add post-completion rating flow

## Medium Priority Gaps

### 15. CI/CD Coverage
- Only 3 backend services have K8s deployment
- No Dockerfiles for identity, wallet, GDPR, mobility-os, package-delivery
- Fix: Add Dockerfiles and K8s manifests for all services

### 16. Observability Completion
- Prometheus/Grafana configs exist but no metrics export from services
- No tracing hooks in service code
- Fix: Add /metrics endpoints, OpenTelemetry instrumentation

### 17. No Backup/Restore Automation
- Supabase backup tools not configured
- No automated DB backup scripts
- Fix: Add backup automation and runbook

## Low Priority Gaps

### 18. Mobile App Sync
- React Native app exists but backend sync unclear
- No documented integration with new backend API
- Fix: Document API integration for mobile

### 19. Geocoding
- Only hardcoded city coordinates in `regionConfig.ts`
- No map provider integration
- Fix: Add Mapbox/Google Maps geocoding

### 20. Offline Support
- Mobile has offline queue but web doesn't
- Fix: Add service worker for web PWA offline
