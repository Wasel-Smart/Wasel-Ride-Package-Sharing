# Database Scorecard

Current score: 9.2/10

## Why It Reaches 9+

The database model has layered production hardening across schema integrity, access control, and operational performance. Core records use explicit constraints for package-enabled trips, package delivery state, transaction references, and one-default-payment-method-per-user behavior. The migration set also adds audit-friendly indexes for bookings, packages, payment methods, package events, and communication delivery retries.

Security posture is strong because row-level security is treated as a first-class database concern, with separate migrations for canonical RLS alignment, RPC permission hardening, GDPR tables, and secure operational views. Sensitive workflows such as OTP sessions, communication deliveries, wallet activity, support tickets, and moderation records are represented as server-mediated tables rather than browser-owned local state.

Scalability is supported by hot-path indexes, partial indexes, covering indexes, PostGIS spatial indexes, retry queue indexes, and event/outbox-oriented tables. These choices reduce full-table scans for ride search, booking history, package tracking, delivery retry processing, and operational dashboards.

## Remaining Gap To Watch

The remaining risk is operational drift between migrations and the live Supabase project. Keep verifying applied migrations, RLS policy behavior, slow-query telemetry, backup restore drills, and production index usage before each release. The schema is production-grade, but it still depends on disciplined rollout checks and periodic query-plan review.
