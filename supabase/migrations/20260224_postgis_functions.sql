-- ═══════════════════════════════════════════════════════════
-- Wasel | واصل — PostGIS Functions & Stored Procedures
-- Version: 1.0.1 (canonical schema aligned — table-dep functions
--          deferred to later migrations that create those tables)
-- Date: February 24, 2026
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 🔧 Enable required extensions (idempotent)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm    WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────
-- 🗺️ Pure geospatial helper — no table deps
-- ─────────────────────────────────────────────────────────────

-- Haversine distance in km between two lat/lng points
CREATE OR REPLACE FUNCTION geo_distance_km(
  lat1 FLOAT, lng1 FLOAT,
  lat2 FLOAT, lng2 FLOAT
)
RETURNS FLOAT AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::extensions.geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::extensions.geography
  ) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- ─────────────────────────────────────────────────────────────
-- 💰 Surge pricing calculator — pure logic, no table deps
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calc_surge_multiplier(
  pending_trips   INTEGER,
  available_drivers INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
  ratio FLOAT;
BEGIN
  IF available_drivers > 0 THEN
    ratio := pending_trips::FLOAT / available_drivers::FLOAT;
  ELSE
    ratio := pending_trips::FLOAT;
  END IF;

  IF ratio >= 3.0 THEN RETURN 2.0;
  ELSIF ratio >= 2.0 THEN RETURN 1.5;
  ELSIF ratio >= 1.5 THEN RETURN 1.3;
  ELSE RETURN 1.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- ─────────────────────────────────────────────────────────────
-- 🏆 Loyalty tier calculator — pure logic, no table deps
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calc_loyalty_tier(lifetime_points INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF lifetime_points >= 10000 THEN RETURN 'platinum';
  ELSIF lifetime_points >= 5000 THEN RETURN 'gold';
  ELSIF lifetime_points >= 2000 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- ─────────────────────────────────────────────────────────────
-- NOTE: Functions that query drivers, trips, notifications,
-- messages, loyalty_points, api_logs, error_logs, promo_codes
-- are defined in later migrations once those tables exist:
--   • find_nearby_drivers      → 20260327090000_production_operating_model
--   • update_driver_location   → 20260327090000_production_operating_model
--   • get_driver_earnings      → 20260401113000_unified_backend_contract
--   • create_notification      → 20260327110000_notifications_runtime_contract
--   • award_trip_points        → 20260401213000_expand_runtime_contract_tables
-- ─────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════
-- End of PostGIS Functions
-- ═══════════════════════════════════════════════════════════
