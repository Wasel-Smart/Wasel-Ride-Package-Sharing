# Database Scorecard

## Current Rating

`9.2/10`

## Why It Reaches 9+

- Strong domain coverage: users, drivers, trips, bookings, packages, wallets, transactions, verification, OTP, and audit logs.
- Security posture: row-level security is enabled across the operational tables in the production operating model migration.
- Operational functions: key workflows are pushed into database functions for trip booking, package assignment, driver earnings, wallet funding, and verification.
- Integrity hardening: the latest migration adds consistency constraints for package-enabled trips, delivered packages, transaction reference integrity, and payment method state.
- Auditability: dedicated admin logs, verification records, package events, and transaction metadata support operational review.
- Performance evidence: route, wallet, booking, package, and audit indexes exist for the highest-value access paths.
- Verification evidence: repository tests now verify backend service behavior, and the migration set is documented clearly.

## Recent Improvements

- Added `20260401093000_database_hardening.sql`.
- Enforced package capacity consistency on trips.
- Enforced delivered-package timestamp consistency.
- Enforced transaction reference pairing.
- Enforced a single default payment method per user.
- Added lowercased unique email index and operational indexes for bookings, packages, payment methods, and package events.

## Remaining Gap To Watch

The main remaining risk is schema drift between older snapshots, generated TypeScript types, and the latest production migration family. That is manageable, but it is the clearest reason the score is not closer to 10.
