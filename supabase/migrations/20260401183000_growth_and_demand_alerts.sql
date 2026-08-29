-- Growth + demand capture persistence

CREATE TABLE IF NOT EXISTS demand_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('ride', 'bus', 'package')),
  requested_date DATE NOT NULL,
  seats_or_slots INTEGER NOT NULL DEFAULT 1 CHECK (seats_or_slots > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_alerts_user_id ON demand_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_demand_alerts_corridor ON demand_alerts(origin_city, destination_city, requested_date);
CREATE INDEX IF NOT EXISTS idx_demand_alerts_status ON demand_alerts(status);

ALTER TABLE demand_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demand alerts are readable by owners" ON demand_alerts;
CREATE POLICY "Demand alerts are readable by owners"
ON demand_alerts
FOR SELECT
USING (
  user_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = demand_alerts.user_id
      AND users.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Demand alerts are insertable by owners" ON demand_alerts;
CREATE POLICY "Demand alerts are insertable by owners"
ON demand_alerts
FOR INSERT
WITH CHECK (
  user_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = demand_alerts.user_id
      AND users.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Demand alerts are updatable by owners" ON demand_alerts;
CREATE POLICY "Demand alerts are updatable by owners"
ON demand_alerts
FOR UPDATE
USING (
  user_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = demand_alerts.user_id
      AND users.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = demand_alerts.user_id
      AND users.auth_user_id = auth.uid()
  )
);
