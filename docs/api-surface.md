# API Surface Specification

## Base
- Base URL: `/v1`
- Auth: `Authorization: Bearer <JWT>` or Supabase anon key for public routes
- Response envelope: `{ success: boolean, data?: T, meta?: { page, limit, total }, error?: { code, message, details } }`
- Errors: HTTP status codes + structured error body
- Pagination: `?page=1&limit=20` on list endpoints
- Filtering: `?status=open&originCity=Amman` on list endpoints

## Authentication

### POST /v1/auth/session
Create session (email+password or OAuth token exchange).
Request: `{ email, password }` or `{ provider, accessToken }`
Response: `{ user, session, accessToken, refreshToken }`

### POST /v1/auth/session/refresh
Refresh access token.
Request: `{ refreshToken }`

### POST /v1/auth/session/revoke
Revoke session.

## Trips

### POST /v1/trips
Driver creates a trip.
Request: `{ originCity, originCoords, destinationCity, destinationCoords, departureDateTime, availableSeats, availableCargoCapacity, pricePerSeat, pricePerPackage, allowPackages, preferences }`
Response: `{ trip }`
Auth: driver role required.

### GET /v1/trips/search
Search available trips.
Query: `?originCity=Amman&destinationCity=Irbid&date=2026-07-01&seats=1&sort=price|time|rating`
Response: `{ trips: Trip[], meta }`

### GET /v1/trips/:id
Get trip details.
Response: `{ trip, bookings, driver: ProfileSummary }`

### POST /v1/trips/:id/book
Book seats/packages on a trip.
Request: `{ seats, packages: [{ size, weight, recipientName, recipientPhone }] }`
Response: `{ booking }`
Auth: rider/regular user role. Enforces capacity, time, and status rules server-side.

### PATCH /v1/trips/:id/status
Driver updates trip status.
Request: `{ status: open|in_progress|completed|cancelled|expired }`
Response: `{ trip }`
Auth: trip.driverId only.

## Packages

### POST /v1/packages
Create package delivery request.
Request: `{ originCity, originCoords, destinationCity, destinationCoords, size, weight, senderName, senderPhone, receiverName, receiverPhone, notes }`
Response: `{ package, estimatedPrice }`
Auth: authenticated user.

### GET /v1/packages/:id
Get package details.
Response: `{ package, tracking, assignedDriver?, trip? }`

### POST /v1/packages/:id/assign-to-trip
Ops/admin assigns package to a trip manually.
Request: `{ tripId }`
Response: `{ package }`
Auth: admin or ops role.

### POST /v1/packages/:id/status
Update package status (driver/ops action).
Request: `{ status: accepted|picked_up|in_transit|delivered|failed|returned, location?, confirmationCode?, notes? }`
Response: `{ package }`

### GET /v1/packages/search
Search package delivery options (by route/time).
Query: `?originCity=Amman&destinationCity=Aqaba&readyBy=2026-07-01`
Response: `{ packages: MatchingTrip[], options }`

## Bus

### GET /v1/bus/routes
List bus routes.
Query: `?originCity=Amman&destinationCity=Irbid`
Response: `{ routes: BusRoute[] }`

### GET /v1/bus/routes/:id/schedules
Get schedules for a route.
Query: `?date=2026-07-01`
Response: `{ schedules: BusSchedule[] }`

### POST /v1/bus/bookings
Book bus seats.
Request: `{ scheduleId, seats, passengerDetails[] }`
Response: `{ booking }`
Auth: authenticated user.

### PATCH /v1/bus/bookings/:id/cancel
Cancel bus booking.
Request: `{ reason? }`
Response: `{ booking, refund? }`

## Wallet

### GET /v1/wallet/:userId/balance
Get wallet balance.
Response: `{ balance, currency, autoTopupEnabled }`

### POST /v1/wallet/:userId/topup
Add funds to wallet.
Request: `{ amount, method: stripe|cliq|card, paymentMethodId? }`
Response: `{ transaction, paymentIntent? }`

### GET /v1/wallet/:userId/transactions
Transaction history.
Query: `?page=1&limit=20&type=topup&from=2026-01-01`
Response: `{ transactions[], meta }`

### POST /v1/wallet/:userId/withdraw
Driver payout request.
Request: `{ amount, destination }`
Response: `{ transaction }`

## Ratings

### POST /v1/ratings
Submit rating after trip/package completion.
Request: `{ targetId, targetType, tripId|packageId, score, tags[], comment? }`
Response: `{ rating }`
Auth: rater must have completed the booking.

### GET /v1/ratings/:targetId
Get ratings for a user/driver.
Query: `?page=1&limit=10`
Response: `{ ratings[], averageScore, meta }`

## Notifications

### GET /v1/notifications
Get user notifications.
Query: `?page=1&limit=20&unreadOnly=true`
Response: `{ notifications[], meta }`

### PATCH /v1/notifications/:id/read
Mark notification as read.
Response: `{ notification }`

### POST /v1/notifications/preferences
Update notification preferences.
Request: `{ push: boolean, sms: boolean, email: boolean, whatsapp: boolean, quietHours? }`

## Trust / Safety

### GET /v1/trust/status/:userId
Get trust/verification status.
Response: `{ trustScore, verifications[], driverModeEnabled }`

### POST /v1/trust/verify/phone
Start phone verification.
Request: `{ phone }`
Response: `{ challengeId }` (triggers OTP via notification)

### POST /v1/trust/verify/phone/confirm
Confirm phone OTP.
Request: `{ challengeId, code }`
Response: `{ trustScore }`

### POST /v1/trust/incidents
Report safety incident.
Request: `{ tripId?, targetId?, type, description }`
Response: `{ incident }`

## Admin / Ops

### GET /v1/admin/rides/active
Get all active trips.
Query: `?status=in_progress&page=1`
Response: `{ trips[] }`

### PATCH /v1/admin/rides/:id/dispatch
Manual driver assignment (ops override).
Request: `{ driverId }`
Response: `{ trip }`

### GET /v1/admin/payments/reconciliation
Get unreconciled payments.
Query: `?status=pending`
Response: `{ transactions[] }`

### GET /v1/admin/users
List users.
Query: `?role=driver&status=active&page=1`
Response: `{ users[], meta }`

### PATCH /v1/admin/users/:id/status
Update user status.
Request: `{ status: active|suspended|banned }`
Response: `{ user }`

### GET /v1/admin/disputes
List disputes.
Query: `?status=open&page=1`
Response: `{ disputes[] }`

### PATCH /v1/admin/disputes/:id/resolve
Resolve dispute.
Request: `{ resolution, action? }`

## Corporate / B2B

### POST /v1/corporate/organizations
Create organization.
Request: `{ name, contactEmail, contactPhone, billingAddress, taxId }`
Response: `{ organization }`

### POST /v1/corporate/organizations/:id/members
Add member.
Request: `{ userId, employeeId, costCenter? }`

### POST /v1/corporate/organizations/:id/credits
Add corporate credits.
Request: `{ amount, currency, expiresAt? }`
Response: `{ credit }`

### POST /v1/corporate/invoices/generate
Generate monthly invoice.
Request: `{ organizationId, billingPeriodStart, billingPeriodEnd }`
Response: `{ invoice, lineItems[] }`

### GET /v1/corporate/organizations/:id/invoices
List invoices.
Query: `?page=1&limit=10`
Response: `{ invoices[], meta }`
