# WASEL - DEVELOPER QUICK REFERENCE

## 🚀 Quick Start

```bash
# Install dependencies
npm ci

# Set up environment
cp .env.example .env
# Edit .env with your keys

# Run development server
npm run dev

# Run tests
npm run test
npm run test:e2e

# Build for production
npm run build
```

## 📦 Environment Variables (Production)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Google
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com

# Sentry
VITE_SENTRY_DSN=https://...@sentry.io/...

# Features
VITE_ENABLE_TWO_FACTOR_AUTH=true
VITE_ENABLE_DEMO_DATA=false
```

## 🔧 Supabase Commands

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_REF

# Apply migrations
supabase db push

# Deploy function
supabase functions deploy FUNCTION_NAME

# Set secrets
supabase secrets set KEY=value

# View logs
supabase functions logs FUNCTION_NAME

# Local development
supabase start
supabase functions serve
```

## 🌐 API Endpoints

### Main Server (`make-server-0b1f4071`)

```
GET  /health
POST /profile
GET  /profile/:userId
PATCH /profile/:userId
GET  /rides
POST /rides
GET  /trips
POST /trips
```

### SMS Verification (`sms-verification`)

```
POST /send-code
     Body: { phone_number: "+962790000000" }

POST /verify-code
     Body: { phone_number: "+962790000000", code: "123456" }
```

### Payment Webhook (`payment-webhook`)

```
POST /
     Headers: stripe-signature
     Body: Stripe event payload
```

### Email Service (`wasel-email`)

```
POST /
     Body: {
       to: "user@example.com",
       subject: "Subject",
       template: "ride_confirmed",
       data: { ... }
     }
```

## 📊 Database Tables

### Core Tables
- `profiles` - User profiles
- `cities` - Jordan cities
- `routes` - Routes between cities
- `trips` - Driver trip offers
- `rides` - Passenger bookings
- `packages` - Package deliveries
- `buses` - Bus operators
- `bus_schedules` - Bus timetables
- `bus_bookings` - Bus reservations

### Financial
- `wallet_transactions` - Wallet history
- `payment_status` - Payment source of truth
- `payment_webhooks` - Stripe events

### Trust & Safety
- `trust_scores` - User reputation
- `user_verifications` - Verification status
- `reports` - User reports

### System
- `job_queue` - Async jobs
- `ride_events` - State machine log
- `audit_logs` - Security audit
- `business_events` - Analytics
- `web_vitals` - Performance metrics
- `notifications` - User notifications

## 🔐 RLS Policies

All tables have Row Level Security enabled:

```sql
-- Users can read all profiles
profiles: SELECT (true)

-- Users can update own profile
profiles: UPDATE (id = auth.uid())

-- Published trips are public
trips: SELECT (status = 'active' OR driver_id = auth.uid())

-- Users see own rides
rides: SELECT (passenger_id = auth.uid() OR trip_id IN ...)

-- Users see own wallet transactions
wallet_transactions: SELECT (user_id = auth.uid())
```

## 🎯 Common Queries

### Get User Profile
```sql
SELECT * FROM profiles WHERE id = 'user-id';
```

### Get Active Trips
```sql
SELECT t.*, p.full_name as driver_name
FROM trips t
JOIN profiles p ON t.driver_id = p.id
WHERE t.status = 'active'
AND t.departure_time > NOW()
ORDER BY t.departure_time;
```

### Get User Rides
```sql
SELECT r.*, t.*, p.full_name as driver_name
FROM rides r
JOIN trips t ON r.trip_id = t.id
JOIN profiles p ON t.driver_id = p.id
WHERE r.passenger_id = 'user-id'
ORDER BY r.created_at DESC;
```

### Get Wallet Balance
```sql
SELECT wallet_balance FROM profiles WHERE id = 'user-id';
```

### Get Wallet Transactions
```sql
SELECT * FROM wallet_transactions
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 50;
```

## 🔄 Job Queue

### Enqueue Job
```sql
SELECT enqueue_job(
  'send_notification',
  '{"user_id": "...", "message": "..."}'::jsonb,
  5, -- priority
  'unique-key',
  0 -- delay seconds
);
```

### Claim Next Job
```sql
SELECT * FROM claim_next_job('send_notification');
```

### Complete Job
```sql
SELECT complete_job('job-id');
```

### Fail Job
```sql
SELECT fail_job('job-id', 'Error message');
```

### View Dead Letter Queue
```sql
SELECT * FROM dead_letter_queue;
```

## 📱 Phone Verification Flow

```typescript
// 1. Send code
const response = await fetch(`${API_URL}/sms-verification/send-code`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ phone_number: '+962790000000' })
});

// 2. Verify code
const response = await fetch(`${API_URL}/sms-verification/verify-code`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ 
    phone_number: '+962790000000',
    code: '123456'
  })
});
```

## 💳 Payment Flow

```typescript
// 1. Create payment intent (Stripe client-side)
const { clientSecret } = await stripe.paymentIntents.create({
  amount: 1000, // 10.00 JOD
  currency: 'jod',
});

// 2. Confirm payment
const { paymentIntent } = await stripe.confirmCardPayment(clientSecret);

// 3. Webhook processes payment_intent.succeeded
// 4. Updates payment_status table
// 5. Creates wallet_transaction
// 6. Enqueues notification job
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:e2e:a11y

# RTL tests
npm run test:e2e:rtl

# Coverage
npm run test:coverage

# Lighthouse
npm run test:lhci
```

## 📈 Monitoring

### Sentry
```typescript
import * as Sentry from '@sentry/react';

Sentry.captureException(error);
Sentry.captureMessage('Info message');
```

### Web Vitals
```typescript
import { reportWebVitals } from './utils/webVitalsReporter';

reportWebVitals((metric) => {
  // Automatically sent to web_vitals table
});
```

### Audit Logs
```sql
INSERT INTO audit_logs (actor_id, action, table_name, record_id)
VALUES (auth.uid(), 'profile.update', 'profiles', 'user-id');
```

## 🐛 Debugging

### View Function Logs
```bash
supabase functions logs make-server-0b1f4071 --tail
```

### Check Database Connection
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Test Webhook Locally
```bash
stripe listen --forward-to localhost:54321/functions/v1/payment-webhook
```

### Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## 🚨 Common Issues

### "Unauthorized" Error
- Check JWT token is valid
- Verify RLS policies allow operation
- Check user is authenticated

### Payment Webhook Not Working
- Verify webhook secret is correct
- Check Stripe dashboard for delivery attempts
- View function logs for errors

### SMS Not Sending
- Check Twilio credentials
- Verify phone number format (+962...)
- Check Twilio account balance

### Database Connection Issues
- Check connection string
- Verify Supabase project is active
- Check connection pooling settings

## 📚 Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [All Gaps Fixed Summary](./ALL_GAPS_FIXED_SUMMARY.md)
- [Monitoring Runbook](./MONITORING_RUNBOOK.md)
- [Feature Index](./FEATURE_INDEX.md)
- [Architecture Decisions](./adr/)

## 🆘 Support

- **Database**: Supabase Support
- **Payments**: Stripe Support
- **SMS**: Twilio Support
- **Email**: Resend Support
- **Monitoring**: Sentry Support

## 📞 Emergency Contacts

```
Production Issues: support@wasel.jo
Database Admin: dba@wasel.jo
DevOps: devops@wasel.jo
Security: security@wasel.jo
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
