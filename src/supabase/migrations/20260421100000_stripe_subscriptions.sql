-- Wasel Subscription Tables for Stripe Integration
-- Run this migration to create subscription tracking tables

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  plan_id TEXT,
  plan_name TEXT,
  plan_amount INTEGER DEFAULT 0,
  plan_currency TEXT DEFAULT 'JOD',
  interval TEXT CHECK (interval IN ('day', 'week', 'month', 'year')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  last_invoice_id TEXT,
  payment_failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_plan_amount CHECK (plan_amount >= 0)
);

CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Subscription invoices table
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_due INTEGER DEFAULT 0,
  amount_refunded INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'JOD',
  status TEXT,
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_amounts CHECK (amount_paid >= 0 AND amount_due >= 0 AND amount_refunded >= 0)
);

CREATE INDEX idx_invoices_stripe_id ON subscription_invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_subscription_id ON subscription_invoices(subscription_id);
CREATE INDEX idx_invoices_customer_id ON subscription_invoices(customer_id);

-- Generic webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  stripe_id TEXT,
  customer_id TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_id);
CREATE INDEX idx_webhook_events_customer ON webhook_events(customer_id);

-- RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can do everything on subscriptions" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on subscription_invoices" ON subscription_invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on webhook_events" ON webhook_events
  FOR ALL USING (true) WITH CHECK (true);

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  stripe_subscription_id TEXT,
  status TEXT,
  plan_name TEXT,
  plan_amount INTEGER,
  plan_currency TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.stripe_subscription_id,
    s.status,
    s.plan_name,
    s.plan_amount,
    s.plan_currency,
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  WHERE s.user_id = user_uuid
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription status
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM subscriptions
  WHERE user_id = user_uuid
    AND status IN ('active', 'trialing')
    AND current_period_end > NOW();
  
  RETURN active_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;