-- =====================================================
-- WASEL ENHANCEMENTS - Ratings, Refunds, Chat
-- Standalone migration that extends existing schema
-- =====================================================

-- =====================================================
-- 1. RATINGS TABLE
-- =====================================================

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
CREATE INDEX IF NOT EXISTS idx_ratings_trip ON ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created ON ratings(created_at DESC);

-- =====================================================
-- 2. REFUNDS TABLE
-- =====================================================

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
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- =====================================================
-- 3. ENHANCE EXISTING TABLES
-- =====================================================

-- Enhance bookings table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount INTEGER DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enhance profiles table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_trips INTEGER DEFAULT 0;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancelled_trips INTEGER DEFAULT 0;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}';
  END IF;
END $$;

-- Enhance messages table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Enhance notifications table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings');
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled ON bookings(cancelled_at) WHERE cancelled_at IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings');
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(average_rating DESC) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles');
CREATE INDEX IF NOT EXISTS idx_messages_trip ON messages(trip_id, created_at DESC) WHERE trip_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages');
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages');
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');

-- =====================================================
-- 5. TRIGGERS & FUNCTIONS
-- =====================================================

-- Function to update driver rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    UPDATE profiles
    SET 
      average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM ratings
        WHERE driver_id = NEW.driver_id
      ),
      total_ratings = (
        SELECT COUNT(*)
        FROM ratings
        WHERE driver_id = NEW.driver_id
      )
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_driver_rating ON ratings;
CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();

-- Function to restore seats on cancellation
CREATE OR REPLACE FUNCTION restore_seats_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
      UPDATE trips
      SET available_seats = available_seats + NEW.seats_requested
      WHERE id = NEW.trip_id;
    END IF;
    
    UPDATE bookings
    SET 
      cancelled_at = NOW(),
      cancelled_by = NEW.cancelled_by,
      cancellation_reason = NEW.cancellation_reason
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    DROP TRIGGER IF EXISTS trigger_restore_seats ON bookings;
    CREATE TRIGGER trigger_restore_seats
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
      EXECUTE FUNCTION restore_seats_on_cancel();
  END IF;
END $$;

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all ratings" ON ratings;
CREATE POLICY "Users can view all ratings" ON ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create ratings for their bookings" ON ratings;
CREATE POLICY "Users can create ratings for their bookings" ON ratings FOR INSERT
  WITH CHECK (rider_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their refunds" ON refunds;
CREATE POLICY "Users can view their refunds" ON refunds FOR SELECT USING (true);

-- =====================================================
-- 7. ENABLE REALTIME
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS bookings;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS trips;
  END IF;
END $$;
