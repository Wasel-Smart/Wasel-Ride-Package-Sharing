-- Production database indexes for optimal query performance
-- Run after existing schema migrations

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_user_status_date 
  ON rides(user_id, status, departure_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_status_departure 
  ON rides(status, departure_date ASC) 
  WHERE status = 'available';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_driver_status_date 
  ON rides(driver_id, status, departure_date DESC);

-- Spatial indexes for geospatial queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_availability_spatial 
  ON driver_availability USING GIST(location);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_origin_spatial 
  ON rides USING GIST(origin_point);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_destination_spatial 
  ON rides USING GIST(destination_point);

-- Covering indexes for frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_search_covering 
  ON rides(origin, status, departure_date) 
  INCLUDE (destination, price, seats_available, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_wallet_type_date 
  ON transactions(wallet_id, transaction_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_provider 
  ON payments(status, provider_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_status_available_seats 
  ON driver_availability(status, available_seats DESC) 
  WHERE status = 'available';

-- Partial indexes for active data only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_active_only 
  ON rides(departure_date, status) 
  WHERE departure_date > NOW() AND status IN ('available', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_packages_active_only 
  ON packages(created_at, status) 
  WHERE status IN ('pending', 'assigned', 'in_transit');

-- Performance indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operational_metrics_type_recorded 
  ON operational_metrics(metric_type, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_metrics_type_recorded 
  ON financial_metrics(metric_type, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corridor_intelligence_last_updated 
  ON corridor_intelligence(last_updated DESC);

-- Foreign key helper indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_payments_fk 
  ON rides(id) 
  WHERE id IN (SELECT ride_id FROM payments);

-- Expression indexes for computed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rides_price_cents 
  ON rides((price * 100))
  WHERE price IS NOT NULL;