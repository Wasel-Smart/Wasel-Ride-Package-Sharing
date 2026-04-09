# Wasel TOWS Execution Plan

This plan converts the TOWS strategy into an implementation sequence.

## Sequence

1. Reliability first
Status: completed
Command:
- Harden booking, package, and wallet reliability paths.
- Make sync state explicit instead of inferred from scattered booleans.
- Add tests for fallback, retry, and reconciliation behavior.

Current implementation progress:
- `rideLifecycle.ts` now exposes explicit booking sync state.
- `journeyLogistics.ts` now persists sync state for rides and packages.
- `walletApi.ts` now exposes wallet and insights reliability metadata so the app can tell when it is on edge API versus direct Supabase fallback.
- `WalletDashboard.tsx` now surfaces fallback mode directly in the UI instead of hiding degraded wallet reads.
- Service tests were extended to assert these reliability states.

2. Domain clarity second
Status: completed
Command:
- Define canonical domain contracts for ride, package, wallet, trust, and corridor.
- Stop loose object passing between services and feature screens.
- Make local storage a cache layer, not a truth layer.

Current implementation progress:
- `corridorTruth.ts` now defines a shared corridor truth contract for corridor plan, live signal, price quote, readiness counts, and recommendation state.
- `FindRidePage.tsx` and `PackagesPage.tsx` now consume one corridor truth source instead of manually recomputing route signal and pricing fragments.

3. Product moat third
Status: completed
Command:
- Promote corridor truth into all booking and execution surfaces.
- Standardize corridor score, route ownership, price pressure, and next-wave recommendations.
- Make Mobility OS the common intelligence source for ride, package, and ops flows.

Current implementation progress:
- `FindRidePage.tsx`, `OfferRidePage.tsx`, and `PackagesPage.tsx` now read from the shared corridor truth layer for live route confidence.
- `PackageSendPanel.tsx` now shows attach rate, shared price, and next-wave timing so package senders see the same corridor economics as riders and drivers.

4. Revenue layer fourth
Status: completed
Command:
- Productize commuter pass, recurring corridor subscriptions, and B2B corridor workflows.
- Connect membership, wallet, and corridor priority into one commercial model.

Current implementation progress:
- `movementMembership.ts` now stores Wasel Plus and commuter-pass commercial metadata including renewal dates and corridor-linked subscriptions.
- `walletApi.ts` now projects local subscription state into wallet payloads and supports fallback subscription activation without requiring the edge wallet backend.
- Wallet overview and hero components now surface active plan name, corridor label, renewal timing, and subscriber benefits.

5. Design-system consolidation fifth
Status: completed
Command:
- Consolidate repeated panel, stat-card, and hero patterns into shared Wasel primitives.
- Preserve the current visual language while reducing one-off styling across feature screens.

Current implementation progress:
- Wallet reliability state is now rendered as a reusable status card pattern rather than staying hidden in controller state.

6. Execution operating system rollout
Status: completed
Command:
- Make governance, KPI ownership, and operating cadence visible inside the application.
- Back the maturity target with explicit playbooks, dashboards, and enforcement rules.
- Add documentation templates so execution rituals can be repeated by the team.

Current implementation progress:
- `executionOperatingSystem.ts` now defines the canonical operating model for maturity, owners, KPIs, cadences, playbooks, and enforcement rules.
- `ExecutionOSPage.tsx` now exposes that model as a first-class app surface at `/app/execution-os`.
- Execution docs now exist for the operating system, weekly review, KPI scorecard, and governance RACI.

## Delivery rule

Each sequence item should leave behind:
- code changes
- tests
- a visible source-of-truth improvement
- a reduced regression surface
