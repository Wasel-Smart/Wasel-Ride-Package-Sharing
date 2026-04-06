# Wasel Email Edge Function — Deployment Guide

## Files created

```
supabase/functions/wasel-email/
  index.ts          ← Main edge function entry point (Deno)
  brand.ts          ← Wasel brand tokens + inline SVG logo
  layout.ts         ← HTML email shell, header, footer, components
  templates.ts      ← 11 typed email templates
  migration.sql     ← Supabase table for delivery logging

src/services/emailService.ts     ← Frontend client (calls the edge function)
src/hooks/useEmailTriggers.ts    ← Per-event trigger helpers (fire-and-forget)
```

---

## Step 1 — Run the database migration

Open your Supabase dashboard → SQL Editor → paste and run `migration.sql`.  
This creates the `communication_deliveries` table and RLS policies.

---

## Step 2 — Set Edge Function secrets

In Supabase dashboard → Settings → Edge Functions → Secrets, add:

```
RESEND_API_KEY                = re_xxxxxxxxxxxx
RESEND_FROM_EMAIL             = Wasel <notifications@wasel14.online>
RESEND_REPLY_TO_EMAIL         = support@wasel.jo
SENDGRID_API_KEY              = SG.xxxxxxxxxxxx          # fallback, optional
SENDGRID_FROM_EMAIL           = notifications@wasel14.online
SUPABASE_SERVICE_ROLE_KEY     = your-service-role-key
COMMUNICATION_WORKER_SECRET   = generate-a-long-random-secret
VITE_APP_URL                  = https://wasel14.online
```

> ⚠️  Never put SUPABASE_SERVICE_ROLE_KEY in the browser bundle (.env with VITE_ prefix).

---

## Step 3 — Deploy the function

```bash
supabase functions deploy wasel-email --no-verify-jwt
```

Or with the Supabase CLI:
```bash
cd supabase
supabase functions deploy wasel-email
```

---

## Step 4 — Wire triggers into your app flows

Import the trigger helpers and call them after the relevant actions:

### After signup (LocalAuth.tsx → register())
```ts
import { triggerWelcomeEmail } from '../hooks/useEmailTriggers';

// After authAPI.signUp() succeeds:
void triggerWelcomeEmail({
  name:       name,
  email:      email,
  confirmUrl: confirmUrl, // from Supabase auth response if email confirmation enabled
});
```

### After ride booking (FindRidePage.tsx → handleBook())
```ts
import { triggerRideBookingEmails } from '../hooks/useEmailTriggers';

// After createRideBooking() returns:
triggerRideBookingEmails({
  booking,
  passengerEmail: user.email,
  driverEmail:    ride.driver.email,
  priceJod:       ridePriceQuote.finalPriceJod,
  appUrl:         import.meta.env.VITE_APP_URL,
});
```

### After wallet top-up (useWalletDashboardController → handleTopUp())
```ts
import { triggerPaymentReceiptEmail } from '../hooks/useEmailTriggers';

// After walletApi.topUp() returns:
triggerPaymentReceiptEmail({
  userEmail:     user.email,
  userName:      user.name,
  transaction:   newWalletData.transactions[0],
  balanceJod:    newWalletData.balance,
  paymentMethod: topUpMethod,
});
```

### After package created (createConnectedPackage → success)
```ts
import { triggerPackageConfirmationEmail } from '../hooks/useEmailTriggers';

triggerPackageConfirmationEmail({
  senderEmail:   user.email,
  senderName:    user.name,
  trackingId:    pkg.trackingId,
  handoffCode:   pkg.handoffCode,
  from:          pkg.from,
  to_city:       pkg.to,
  weight:        pkg.weight,
  recipientName: pkg.recipientName,
  matchedDriver: pkg.matchedDriver,
  status:        pkg.status,
});
```

---

## Email types covered

| Type | Trigger point |
|------|---------------|
| `welcome` | After signup |
| `email_confirmation` | Supabase auth confirm flow |
| `password_reset` | Forgot password |
| `booking_confirmation` | Passenger: ride booked |
| `driver_booking_request` | Driver: new ride request |
| `booking_status_update` | Passenger: driver accepted/declined |
| `payment_receipt` | Wallet top-up, ride payment, withdrawal |
| `package_confirmation` | Package sender — includes handoff code |
| `bus_booking_confirmation` | Bus seat booked |
| `ride_completed` | Post-trip rating prompt (passenger + driver) |
| `security_alert` | New login, password changed |

---

## Brand identity in emails

Every email includes:
- Inline SVG Wasel logomark (3 rounded rectangles + connector bar) — no remote image dependency
- Wasel wordmark in cyan with "Linked Mobility Network" sub-label
- "Jordan Network" live badge in header
- Full Wasel color palette: deep navy background, cyan accent, gold handoff codes
- Branded footer with mini logo, support email, preference link, copyright

---

## Testing a send locally

```bash
curl -X POST http://localhost:54321/functions/v1/wasel-email \
  -H "Content-Type: application/json" \
  -H "X-Wasel-Worker-Secret: your-worker-secret" \
  -d '{
    "type": "welcome",
    "to": "test@example.com",
    "payload": {
      "name": "Ahmad Al-Rashid",
      "email": "test@example.com"
    }
  }'
```
