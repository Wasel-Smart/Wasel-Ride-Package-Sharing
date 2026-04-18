-- Enhanced Payments and Wallet Tables
-- This migration adds comprehensive payment and wallet functionality

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('card', 'wallet', 'bank_transfer', 'cliq')),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_method_id TEXT,
  display_name TEXT NOT NULL,
  last_four TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider_method_id) WHERE provider_method_id IS NOT NULL
);

-- Payment Intents Table
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('deposit', 'ride_payment', 'package_payment', 'subscription', 'withdrawal')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'JOD',
  payment_method_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'processing', 'succeeded', 'failed', 'cancelled')),
  client_secret TEXT,
  reference_type TEXT,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_id TEXT,
  reference_type TEXT,
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Settings Table
CREATE TABLE IF NOT EXISTS wallet_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auto_topup_enabled BOOLEAN DEFAULT FALSE,
  auto_topup_amount DECIMAL(10,2) DEFAULT 20.00,
  auto_topup_threshold DECIMAL(10,2) DEFAULT 5.00,
  pin_hash TEXT,
  pin_attempts INTEGER DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{"transactions": true, "low_balance": true, "payments": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider_refund_id TEXT,
  metadata JSONB DEFAULT '{}',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Wallet Escrows Table (for holding funds during transactions)
CREATE TABLE IF NOT EXISTS wallet_escrows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded')),
  held_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_active ON payment_methods(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_default ON payment_methods(user_id) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_status ON payment_intents(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_reference ON payment_intents(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_date ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_escrows_user_status ON wallet_escrows(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_escrows_trip ON wallet_escrows(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_user_status ON refunds(user_id, status, requested_at DESC);

-- Triggers for updated_at
CREATE TRIGGER set_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_wallet_settings_updated_at BEFORE UPDATE ON wallet_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    -- Remove default from all other methods for this user
    UPDATE payment_methods 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_payment_method_trigger
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_payment_method();

-- Function to update wallet balance on transaction
CREATE OR REPLACE FUNCTION update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE profiles
    SET wallet_balance = wallet_balance + NEW.amount
    WHERE id = NEW.user_id;
  ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    -- Reverse the transaction if status changes from completed
    UPDATE profiles
    SET wallet_balance = wallet_balance - OLD.amount
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallet_balance_trigger
  AFTER INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_balance_on_transaction();

-- Function to auto-release expired escrows
CREATE OR REPLACE FUNCTION release_expired_escrows()
RETURNS void AS $$
BEGIN
  -- Release expired escrows back to user wallet
  WITH expired_escrows AS (
    SELECT id, user_id, amount
    FROM wallet_escrows
    WHERE status = 'held' AND expires_at < NOW()
  )
  UPDATE wallet_escrows
  SET status = 'released', released_at = NOW()
  WHERE id IN (SELECT id FROM expired_escrows);
  
  -- Create wallet transactions for released escrows
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, reference_type, reference_id)
  SELECT 
    user_id,
    amount,
    'credit',
    'Escrow auto-release (expired)',
    'escrow',
    id::text
  FROM wallet_escrows
  WHERE status = 'released' AND released_at >= NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_escrows ENABLE ROW LEVEL SECURITY;

-- Payment Methods Policies
CREATE POLICY "Users can manage own payment methods"
  ON payment_methods FOR ALL
  USING (auth.uid() = user_id);

-- Payment Intents Policies
CREATE POLICY "Users can view own payment intents"
  ON payment_intents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create payment intents"
  ON payment_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment intents"
  ON payment_intents FOR UPDATE
  USING (auth.uid() = user_id);

-- Wallet Transactions Policies
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create wallet transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (TRUE); -- Allow system to create transactions

-- Wallet Settings Policies
CREATE POLICY "Users can manage own wallet settings"
  ON wallet_settings FOR ALL
  USING (auth.uid() = user_id);

-- Refunds Policies
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request refunds"
  ON refunds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Wallet Escrows Policies
CREATE POLICY "Users can view own escrows"
  ON wallet_escrows FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default wallet settings for existing users
INSERT INTO wallet_settings (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM wallet_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Create a function to initialize wallet settings for new users
CREATE OR REPLACE FUNCTION initialize_wallet_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallet_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_wallet_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_wallet_settings();