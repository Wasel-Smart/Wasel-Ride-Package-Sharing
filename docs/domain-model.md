# Domain Model — Wasel Mobility OS

## Aggregate Roots

### 1. User / Profile
```
User (id, email, phone, role, status, trustScore, language, createdAt)
Profile (userId, firstName, lastName, avatarUrl, preferences, emergencyContact)
VerificationRecord (userId, type, status, verifiedAt, metadata)
```
**Invariants**: One profile per user. trustScore calculated server-side from ratings + incidents.

### 2. Driver
```
Driver (id, userId, licenseNumber, licenseExpiry, rating, totalTrips, status, available)
Vehicle (id, driverId, make, model, year, plateNumber, color, capacity, insuranceExpiry)
DriverAvailability (driverId, isAvailable, location[PostGIS], reservedForRideId, updatedAt)
```
**Invariants**: Driver cannot be available without verified vehicle + license. Capacity enforced on booking.

### 3. Trip
```
Trip (id, driverId, originCity, originCoords[PostGIS], destinationCity, destinationCoords[PostGIS],
      departureDateTime, availableSeats, availableCargoCapacity, pricePerSeat, pricePerPkg,
      status: draft|open|booked|in_progress|completed|cancelled|expired|no_show,
      allowPackages, allowSharedPackages, stops[], packageTypes[], preferences, corridorId)
TripBooking (id, tripId, passengerId, seatsBooked, packagesBooked, totalAmount,
             status: pending|confirmed|checked_in|completed|cancelled|refunded,
             qrCode, shareCode, pickupConfirmationCode)
```
**Invariants**: 
- seatsBooked <= availableSeats at booking time
- packagesBooked * avgWeight <= availableCargoCapacity
- No booking after departureDateTime
- Status transitions: draft → open → booked → in_progress → completed|cancelled

### 4. Package
```
Package (id, senderId, receiverId, originCity, originCoords[PostGIS], destinationCity, destinationCoords[PostGIS],
         size: small|medium|large|extra_large, weight, price, status: created|matched|accepted|picked_up|in_transit|delivered|failed|returned|cancelled,
         assignedTo: driverId|busRouteId|null, tripId|null, qrCode, shareCode, deliveryConfirmationCode,
         escrowStatus, verificationCodes, notes)
PackageTracking (id, packageId, status, location?, notes, timestamp)
```
**Invariants**: 
- Price calculated from size + distance + corridor rules
- Cannot assign to driver without available capacity
- Status transitions enforced by state machine

### 5. Bus Route / Booking
```
BusRoute (id, operatorId, corridorId, name, originCity, destinationCity, stops[],
          estimatedDuration, amenities[])
BusSchedule (id, routeId, departureDateTime, arrivalDateTime, availableSeats, price, vehicleId)
BusBooking (id, scheduleId, passengerId, seats, totalAmount, status: confirmed|checked_in|completed|cancelled|refunded,
            qrCode, shareCode)
```
**Invariants**: seats <= availableSeats at booking time.

### 6. Wallet / Transaction
```
Wallet (id, userId, balance, currency, autoTopupEnabled, autoTopupThreshold, pinHash)
Transaction (id, walletId, type: topup|payment|refund|payout|commission|adjustment|credit,
             amount, currency, status: pending|completed|failed|cancelled,
             referenceType: trip|package|bus|payout|null, referenceId,
             provider: stripe|cliq|wallet|null, providerTxnId,
             description, metadata)
```
**Invariants**: 
- Balance never negative after any transaction
- All mutations create a Transaction record
- Refunds reference original transaction

### 7. Rating / Review
```
Rating (id, raterId, targetId, targetType: driver|passenger|package_sender|package_receiver|bus_operator,
        tripId, packageId, busBookingId,
        score: 1-5, tags[], comment, status: pending|published|hidden|removed,
        createdAt)
```
**Invariants**: Only raters who were party to the trip/package can submit. Published only for completed bookings.

### 8. Trust / Incident / Dispute
```
TrustScore (userId, score, breakdown: { punctuality, cleanliness, communication, safety },
            updatedAt, calculationVersion)
SafetyIncident (id, reporterId, targetId, tripId, type, description, status, resolution, createdAt)
Dispute (id, reporterId, subjectType, subjectId, reason, description, status, resolution, resolvedBy, resolvedAt)
```
**Invariants**: Trust score recalculated on each rating/incident.

### 9. Organization / Corporate Billing
```
Organization (id, name, contactEmail, contactPhone, billingAddress, taxId, createdAt, ownerId)
OrganizationMember (id, organizationId, userId, role: admin|billing|member, employeeId, costCenter)
CorporateCredit (id, organizationId, amount, currency, remaining, expiresAt, status)
Invoice (id, organizationId, billingPeriodStart, billingPeriodEnd, totalAmount, currency,
         status: draft|sent|paid|overdue, lineItems[], pdfUrl, createdAt)
```
**Invariants**: Invoice total = sum of line items. Credit cannot go negative.

### 10. Notification
```
Notification (id, userId, type, title, titleAr, body, bodyAr, data, status: pending|sent|delivered|read|failed,
              channel: push|sms|email|whatsapp|in_app, sentAt, deliveredAt, readAt, failureReason)
CommunicationDelivery (id, notificationId, channel, provider, providerMsgId, status, attempts, lastError, metadata)
NotificationPreference (userId, channel, enabled, quietHoursStart, quietHoursEnd)
PushToken (userId, token, platform, deviceId, lastUsed)
```
**Invariants**: One Notification per user event. Delivery tracked per channel.

## 10. Bus / Corridor
```
BusRoute (id, operatorId, name, originCity, destinationCity, intermediateStops, estimatedDuration, amenities)
BusSchedule (id, routeId, departureTime, arrivalTime, availableSeats, price, vehicleInfo)
BusBooking (id, scheduleId, passengerId, seats, totalAmount, status: confirmed|cancelled|completed, qrCode)
BusOperator (id, name, contactPhone, licenseNumber, rating, verified)
```

## State Machines

### Trip State Machine
```
draft → open → booked → in_progress → completed
                                    ↘ cancelled
                          open → expired
                          booked → cancelled (refund)
                          in_progress → no_show
```

### Package State Machine
```
created → matched → accepted → picked_up → in_transit → delivered
                                                          ↘ failed → returned
                                                          ↘ cancelled
```

### Booking State Machine
```
pending → confirmed → checked_in → completed
                            ↘ cancelled (refund)
```

## Bounded Contexts

| Context | Aggregates | Service Owner |
|---------|-----------|---------------|
| Identity | User, Profile, Verification | IdentityService |
| Mobility | Driver, Vehicle, Availability | DriverService |
| Trips | Trip, TripBooking, Rating (trip-related) | TripService |
| Packages | Package, PackageTracking | PackageService |
| Bus | BusRoute, BusSchedule, BusBooking | BusService |
| Payments | Wallet, Transaction, Invoice (corporate) | WalletService |
| Trust | TrustScore, SafetyIncident, Dispute | TrustService |
| Notifications | Notification, CommunicationDelivery, PushToken | NotificationService |
| Billing | Organization, OrganizationMember, CorporateCredit, Invoice | CorporateService |
| Analytics | OperationalMetrics, FinancialMetrics, CorridorIntelligence | OpsAnalytics |
