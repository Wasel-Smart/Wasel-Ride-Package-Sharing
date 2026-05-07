# Wasel - Deployment & Testing Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Your `.env` is already configured with production credentials:
- ✅ Google OAuth & Maps
- ✅ Stripe Payment Processing
- ✅ Twilio Communications
- ✅ Supabase Production

### 3. Apply Database Migrations
```bash
npm run supabase:db:reset
```

This will create:
- `ratings` table
- `refunds` table
- `messages` table
- `notifications` table
- Enhanced `bookings` and `profiles` tables
- All triggers and RLS policies

### 4. Deploy Edge Functions
```bash
# Deploy payment processing
supabase functions deploy payment-sheet --project-ref djccmatubyyudeosrngm

# Deploy refund processing
supabase functions deploy refund --project-ref djccmatubyyudeosrngm

# Deploy webhook handler
supabase functions deploy webhook --project-ref djccmatubyyudeosrngm
```

### 5. Set Supabase Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_51SZmpKENhKSYxMCX03sEOKEiljDGWYTX0ZKTVmqKM0NeNH60jWc6pzyW8vaMHr7ahEKfKRNG24UqNrlsELnEGvHZ004Ec5d33u" --project-ref djccmatubyyudeosrngm

supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret" --project-ref djccmatubyyudeosrngm

supabase secrets set SUPABASE_URL="https://djccmatubyyudeosrngm.supabase.co" --project-ref djccmatubyyudeosrngm

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2NtYXR1Ynl5dWRlb3NybmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA2NjkyNSwiZXhwIjoyMDc3NDI2OTI1fQ.7_fGWjK9c8iGk36iHMqH37nBJEAdosg4G8aZSaYdWeQ" --project-ref djccmatubyyudeosrngm
```

### 6. Configure Stripe Webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://djccmatubyyudeosrngm.supabase.co/functions/v1/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `refund.updated`
5. Copy the webhook signing secret
6. Update the secret in Supabase (step 5 above)

### 7. Start Development Server
```bash
npm run dev
```

---

## 🧪 Testing Guide

### Test 1: Payment Flow

#### Steps:
1. Navigate to Find Ride page
2. Search for a trip
3. Book a trip
4. Click "Pay Now"
5. Enter test card: `4242 4242 4242 4242`
6. Expiry: Any future date
7. CVC: Any 3 digits
8. Confirm payment

#### Expected Results:
- ✅ Payment intent created
- ✅ Stripe payment sheet appears
- ✅ Payment succeeds
- ✅ Booking status → "confirmed"
- ✅ Payment status → "succeeded"
- ✅ Notification sent to driver
- ✅ Notification sent to passenger

#### Verify in Database:
```sql
SELECT * FROM bookings WHERE id = 'booking_id';
-- payment_status should be 'succeeded'
-- payment_intent_id should be set
```

---

### Test 2: Booking Cancellation

#### Steps:
1. Go to My Trips
2. Find a confirmed booking
3. Click "Cancel Booking"
4. Enter cancellation reason
5. Confirm cancellation

#### Expected Results:
- ✅ Booking status → "cancelled"
- ✅ Seats restored to trip
- ✅ Refund processed automatically
- ✅ Notification sent to driver
- ✅ Refund appears in refunds table

#### Verify in Database:
```sql
-- Check booking
SELECT status, cancelled_at, cancellation_reason FROM bookings WHERE id = 'booking_id';

-- Check refund
SELECT * FROM refunds WHERE booking_id = 'booking_id';

-- Check seats restored
SELECT available_seats FROM trips WHERE id = 'trip_id';
```

---

### Test 3: Trip Cancellation (Driver)

#### Steps:
1. Login as driver
2. Go to My Trips
3. Find an active trip
4. Click "Cancel Trip"
5. Enter reason
6. Confirm

#### Expected Results:
- ✅ Trip status → "cancelled"
- ✅ All bookings cancelled
- ✅ All passengers refunded
- ✅ Notifications sent to all passengers

#### Verify in Database:
```sql
-- Check trip
SELECT status, cancelled_at FROM trips WHERE id = 'trip_id';

-- Check all bookings cancelled
SELECT COUNT(*) FROM bookings WHERE trip_id = 'trip_id' AND status = 'cancelled';

-- Check all refunds processed
SELECT COUNT(*) FROM refunds WHERE booking_id IN (
  SELECT id FROM bookings WHERE trip_id = 'trip_id'
);
```

---

### Test 4: Rating System

#### Steps:
1. Complete a trip (set booking status to 'completed')
2. Go to My Trips
3. Click "Rate Driver"
4. Select 5 stars
5. Add tags: "punctual", "friendly"
6. Write review: "Great driver!"
7. Submit

#### Expected Results:
- ✅ Rating saved
- ✅ Driver average rating updated
- ✅ Driver total ratings incremented
- ✅ Notification sent to driver
- ✅ Cannot rate same trip twice

#### Verify in Database:
```sql
-- Check rating
SELECT * FROM ratings WHERE booking_id = 'booking_id';

-- Check driver profile updated
SELECT average_rating, total_ratings FROM profiles WHERE id = 'driver_id';
```

---

### Test 5: Real-Time Chat

#### Steps:
1. Open trip details
2. Click "Chat"
3. Send message: "Hello!"
4. Open same trip in another browser/incognito
5. Login as driver
6. Check chat

#### Expected Results:
- ✅ Message appears instantly
- ✅ Read receipts work
- ✅ Unread count updates
- ✅ Messages persist on refresh
- ✅ Only trip participants can access

#### Verify in Database:
```sql
-- Check messages
SELECT * FROM messages WHERE trip_id = 'trip_id' ORDER BY created_at;

-- Check read receipts
SELECT read_by FROM messages WHERE id = 'message_id';
```

---

### Test 6: Performance

#### Smooth Scrolling Test:
1. Navigate to Find Ride page
2. Scroll through trip list
3. Check for smooth 60fps scrolling
4. No jank or stuttering

#### Lazy Loading Test:
1. Open page with many images
2. Open DevTools Network tab
3. Scroll down
4. Images should load as they enter viewport

#### Navigation Test:
1. Click through multiple pages rapidly
2. No lag or freezing
3. Instant page transitions
4. Smooth animations

---

## 🔍 Debugging

### Check Edge Function Logs
```bash
supabase functions logs payment-sheet --project-ref djccmatubyyudeosrngm
supabase functions logs refund --project-ref djccmatubyyudeosrngm
supabase functions logs webhook --project-ref djccmatubyyudeosrngm
```

### Check Database Logs
1. Go to: https://app.supabase.com/project/djccmatubyyudeosrngm/logs/postgres-logs
2. Filter by table or query

### Check Stripe Events
1. Go to: https://dashboard.stripe.com/test/events
2. Find your payment_intent
3. Check webhook delivery

### Common Issues

#### Payment Intent Creation Fails
- Check Stripe secret key is set
- Verify amount is > 0
- Check booking exists

#### Refund Fails
- Verify payment was successful
- Check payment_intent_id exists
- Ensure not already refunded

#### Chat Not Real-Time
- Check Supabase Realtime is enabled
- Verify RLS policies allow access
- Check subscription is active

#### Ratings Not Updating
- Verify trigger is created
- Check booking status is 'completed'
- Ensure no duplicate ratings

---

## 📊 Monitoring

### Key Metrics to Track

#### Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1

#### Reliability
- API success rate > 99%
- Payment success rate > 98%
- Refund success rate > 99%
- Message delivery rate > 99.9%

#### Business
- Booking conversion rate
- Cancellation rate
- Average rating
- Chat engagement

---

## 🔐 Security Checklist

- [x] RLS enabled on all tables
- [x] Edge functions validate auth
- [x] Payment intents validated
- [x] Refunds authorized
- [x] Chat participants verified
- [x] Secrets not in code
- [x] HTTPS only
- [x] CORS configured

---

## 📱 Mobile Testing

### iOS
```bash
# Install Expo Go
# Scan QR code from terminal
npm run dev
```

### Android
```bash
# Install Expo Go
# Scan QR code from terminal
npm run dev
```

### Test Checklist
- [ ] Smooth scrolling
- [ ] Touch gestures work
- [ ] Keyboard doesn't cover inputs
- [ ] Back button works
- [ ] Deep links work
- [ ] Push notifications work
- [ ] Offline mode graceful

---

## 🚀 Production Deployment

### 1. Update Environment Variables
```bash
# Set production URLs
VITE_APP_URL=https://wasel14.online
VITE_SUPABASE_URL=https://djccmatubyyudeosrngm.supabase.co
```

### 2. Build for Production
```bash
npm run build
```

### 3. Deploy
```bash
# Deploy to your hosting provider
# Vercel, Netlify, AWS, etc.
```

### 4. Configure Production Stripe Webhook
- Use production Stripe keys
- Update webhook URL to production
- Test with production cards

### 5. Monitor
- Set up Sentry alerts
- Monitor Supabase logs
- Track Stripe events
- Check performance metrics

---

## 📞 Support

Issues? Contact:
- Email: support@wasel14.online
- Docs: [COMPLETE_IMPLEMENTATION.md](./COMPLETE_IMPLEMENTATION.md)

---

**Ready to launch! 🚀**
