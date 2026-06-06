# Real User Test Matrix

Run this matrix after staging rehearsal and again during controlled production launch.

## Personas

| Persona | Device | Critical Flows |
| --- | --- | --- |
| Rider | Mobile web, Android, iOS | Sign up, search corridor, book ride, cancel booking |
| Driver | Android, iOS | Sign in, update availability, accept trip, complete trip |
| Package sender | Mobile web | Create package request, track handoff, receive notification |
| Operator | Desktop web | View operations dashboard, inspect demand alerts, monitor queues |
| Support admin | Desktop web | Review user state, inspect payments, trigger support workflow |

## Regional Coverage

- Amman core corridors.
- Airport route.
- University and commuter corridors.
- Low-connectivity mobile network.
- Arabic and English locale smoke checks.

## Acceptance Criteria

- Authentication succeeds without captcha or redirect loops.
- Map and corridor data load within SLO.
- Booking and package writes are persisted server-side.
- Payment actions use live or sandbox provider mode appropriate to the environment.
- Notification delivery state is visible in operations views.
- No console errors expose secrets or service-role credentials.
