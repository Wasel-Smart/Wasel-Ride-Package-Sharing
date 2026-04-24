# Real User Test Matrix

## Core Identity

| Persona | Scenario | Expected Database Result |
|--------|----------|--------------------------|
| Passenger | Sign up with phone/email | Canonical `public.users` row created and linked to auth user |
| Driver | Complete driver onboarding | Driver row linked to the canonical user and verification state updated |
| Admin | Review user state | No direct client mutation path bypasses audited database workflows |

## Money Movement

| Persona | Scenario | Expected Database Result |
|--------|----------|--------------------------|
| Passenger | Create payment intent | Payment intent row reflects real backend response only |
| Passenger | Confirm wallet-funded action | Ledger and wallet balance move atomically or fail visibly |
| Operations | Inspect failed payment | Failure is stored and no synthetic success row is produced |

## Mobility Operations

| Persona | Scenario | Expected Database Result |
|--------|----------|--------------------------|
| Passenger | Request bus or ride booking | Booking row created through atomic server-side workflow |
| Driver | Accept or reject booking | Booking status and seat inventory stay consistent |
| Sender | Assign package to trip | Package, trip capacity, and wallet state stay synchronized |

## Safety And Preferences

| Persona | Scenario | Expected Database Result |
|--------|----------|--------------------------|
| User | Update settings | `updated_at` changes and row remains owned by the caller |
| User | Submit safety incident | Incident row is created under caller ownership |
| User | Trigger SOS alert | Alert is recorded with caller ownership and audit timestamps |
