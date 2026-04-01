# Real User Test Matrix

Use this matrix during cutover from mock launch into real Supabase-authenticated
users. Mark each row as `Pass`, `Fail`, or `Blocked`, and capture the relevant
Supabase logs for anything that fails.

## Personas

- `Passenger A`: newly registered verified passenger
- `Passenger B`: newly registered low-verification passenger
- `Driver A`: approved driver with vehicle
- `Driver B`: approved driver with vehicle
- `Admin`: operational admin user

## Auth and Identity

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Sign-up | Passenger A | Register through app | Auth user created and canonical `public.users` record available |
| Sign-up | Passenger B | Register through app | Auth user created and canonical `public.users` record available |
| Sign-in | Passenger A | Sign in with email/password | Session created and profile loads |
| Sign-in | Driver A | Sign in with email/password | Session created and role-aware profile loads |
| Password reset | Passenger A | Request password reset | Reset email flow succeeds |
| OAuth | Passenger A | Sign in with OAuth if enabled | Session created and canonical user binding works |
| Profile sync | Passenger A | Open profile page | `auth_user_id` is linked and canonical data appears |

## Profile and Verification

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Profile read | Passenger A | Load profile | Full canonical data returned |
| Profile update | Passenger A | Change name/phone | Update persists without RLS error |
| Verification state | Passenger B | Open profile | Restricted verification state displays correctly |
| Verification submit | Passenger A | Trigger verification submission | User-facing verification RPC works |
| Verification admin action | Admin | Complete verification from admin path | Internal/admin-only path works only for admin tooling |

## Trips and Booking

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Trip create | Driver A | Create trip | Trip is inserted and visible in driver trips |
| Trip create | Driver B | Create trip | Trip is inserted and visible in driver trips |
| Trip search | Passenger A | Search active routes | Open routes appear |
| Trip detail | Passenger A | Open trip details | Correct route and driver information loads |
| Booking create | Passenger A | Book a seat on Driver A trip | Booking created, seats reduced, wallet charged if applicable |
| Booking create | Passenger B | Attempt restricted booking if under-verified | Correct restriction or success based on policy |
| Booking list | Passenger A | Open my bookings | Passenger sees own bookings only |
| Driver booking view | Driver A | Open trip bookings | Driver sees bookings for owned trips only |
| Booking status update | Driver A | Accept/reject/cancel flow | Update succeeds without RLS failure |

## Packages and Logistics

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Package create | Passenger A | Create package | Package row inserted and trackable |
| Package assign | Driver A or supported flow | Assign package to eligible trip | Assignment succeeds and package state changes |
| Package tracking | Passenger A | Track package by code | Current package state loads |
| Package event history | Passenger A | Open package activity | Events visible only to authorized users |
| Delivery confirm | Driver A or admin flow | Confirm package delivery | Internal flow works only for authorized path |

## Wallet and Payments

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Wallet read | Passenger A | Open wallet | Balance, payment methods, and transactions load |
| Wallet read | Driver A | Open wallet | Earnings and transactions load |
| Top-up | Passenger A | Add funds | User-facing RPC works and transaction posts |
| Transfer | Passenger A | Send money to Passenger B | Transfer succeeds and balances update |
| Payment methods | Passenger A | Add/delete payment method | Change persists without RLS issue |
| Driver earnings | Driver A | Complete earning-triggering flow | Earnings credit appears correctly |

## Notifications

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Notification read | Passenger A | Load notifications | User sees only own notifications |
| Notification mark read | Passenger A | Mark notification as read | Update persists |
| Notification create | Passenger A | Trigger notification-producing flow | Notification is created for the correct user |

## Security and Isolation

| Area | Persona | Action | Expected Result |
|------|---------|--------|-----------------|
| Cross-user profile read | Passenger A | Attempt to load Passenger B profile via client path | Access denied |
| Cross-user wallet read | Passenger A | Attempt to access Driver A wallet | Access denied |
| Internal RPC access | Passenger A | Attempt admin/internal RPCs | Access denied |
| Anonymous RPC access | Unauthenticated | Attempt user-facing or internal RPCs | Access denied unless intentionally public |
| Cross-user booking access | Passenger A | Attempt to fetch unrelated bookings | Access denied |

## Observability Capture

For every failed row, capture:

- user type
- action attempted
- frontend error
- Supabase auth log excerpt
- Postgres/RLS log excerpt
- edge function log excerpt if applicable

## Exit Criteria

You are ready to move beyond rehearsal when:

- all critical auth rows pass
- all critical wallet, booking, and package rows pass
- no unexpected RLS denial appears in intended flows
- no internal/admin RPC can be called by a normal user
- canonical `public.users` binding works consistently for real auth users
