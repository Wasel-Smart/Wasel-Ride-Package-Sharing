-- Scheduled Pickups
-- Allows users to pre-book rides or schedule package pickups/deliveries
-- for a future date/time with optional recurring pattern

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE scheduled_item_type AS ENUM ('ride', 'package_delivery', 'package_return');
CREATE TYPE scheduled_item_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'missed');

CREATE TABLE scheduled_pickups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Item details
  item_type scheduled_item_type NOT NULL,
  status scheduled_item_status DEFAULT 'scheduled',
  
  -- Location
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  dropoff_location TEXT,
  dropoff_lat DECIMAL(10,8),
  dropoff_lng DECIMAL(11,8),
  pickup_location_geom GEOGRAPHY(POINT),
  dropoff_location_geom GEOGRAPHY(POINT),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurring_pattern TEXT CHECK (recurring_pattern IN ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  recurring_until TIMESTAMPTZ,
  
  -- Linked entities
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  
  -- Additional info
  notes TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  estimated_price DECIMAL(10,2),
  
  -- Reminders
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE INDEX idx_scheduled_pickups_user ON scheduled_pickups(user_id, scheduled_at DESC);
CREATE INDEX idx_scheduled_pickups_status ON scheduled_pickups(status, scheduled_at);
CREATE INDEX idx_scheduled_pickups_date ON scheduled_pickups(scheduled_at);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON scheduled_pickups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE scheduled_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled pickups"
  ON scheduled_pickups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled pickups"
  ON scheduled_pickups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled pickups"
  ON scheduled_pickups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled pickups"
  ON scheduled_pickups FOR DELETE
  USING (auth.uid() = user_id);
