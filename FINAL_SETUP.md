# ✅ Wasel Platform - Final Setup

## 🎉 Status

### ✅ Completed
- Supabase project linked: `zexlxabdcsjefptmjhuq`
- Edge functions deployed:
  - `payment-sheet`
  - `refund`
  - `webhook`
- Environment configured
- Services implemented
- Performance optimizations applied

### 📋 Manual Steps Required

Your database already has existing schema. Apply enhancements manually:

## Step 1: Apply Database Enhancements

Go to: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/sql/new

Copy and paste this SQL:

```sql
-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  rider_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_booking_rider ON ratings(booking_id, rider_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver ON ratings(driver_id);

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  payment_intent_id TEXT NOT NULL,
  refund_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_booking ON refunds(booking_id);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all ratings" ON ratings;
CREATE POLICY "Users can view all ratings" ON ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create ratings" ON ratings;
CREATE POLICY "Users can create ratings" ON ratings FOR INSERT WITH CHECK (rider_id = auth.uid());

DROP POLICY IF EXISTS "Users can view refunds" ON refunds;
CREATE POLICY "Users can view refunds" ON refunds FOR SELECT USING (true);

-- Update driver rating function
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM ratings WHERE driver_id = NEW.driver_id),
    total_ratings = (SELECT COUNT(*) FROM ratings WHERE driver_id = NEW.driver_id)
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_driver_rating ON ratings;
CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();
```

Click "RUN" to execute.

## Step 2: Set Supabase Secrets

Get your service role key from: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/settings/api

```bash
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_51SZmpKENhKSYxMCX03sEOKEiljDGWYTX0ZKTVmqKM0NeNH60jWc6pzyW8vaMHr7ahEKfKRNG24UqNrlsELnEGvHZ004Ec5d33u" --project-ref zexlxabdcsjefptmjhuq

npx supabase secrets set SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co" --project-ref zexlxabdcsjefptmjhuq

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE" --project-ref zexlxabdcsjefptmjhuq
```

## Step 3: Configure Stripe Webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/webhook`
4. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `refund.updated`
5. Copy signing secret
6. Set it:
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET" --project-ref zexlxabdcsjefptmjhuq
```

## Step 4: Enable Realtime

Go to: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/database/replication

Enable for: `messages`, `notifications`, `bookings`, `trips`

## Step 5: Configure Google OAuth

**Google Cloud Console:**
Add redirect: `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback`

**Supabase Dashboard:**
https://app.supabase.com/project/zexlxabdcsjefptmjhuq/auth/providers

Enable Google with your credentials.

## Step 6: Start Development

```bash
npm run dev
```

---

## 🚀 You're Ready!

All code is implemented:
- ✅ Payment processing
- ✅ Cancellation with refunds
- ✅ Ratings system
- ✅ Real-time chat
- ✅ Performance optimizations

Just complete the 6 steps above!

---

## 📚 Documentation

- `COMPLETE_IMPLEMENTATION.md` - Full technical docs
- `DEPLOYMENT_GUIDE.md` - Testing guide
- `QUICK_DEPLOY.md` - All commands
- `SETUP_COMPLETE.md` - This file

---

**Support**: support@wasel14.online
