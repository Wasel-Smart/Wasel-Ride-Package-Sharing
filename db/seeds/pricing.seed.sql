begin;

do $$
begin
  raise notice 'Applying pricing.seed.sql';
end $$;

insert into public.route_corridors (
  corridor_id,
  corridor_label,
  origin_city_id,
  destination_city_id,
  route_scope,
  demand_tier,
  distance_km,
  estimated_duration_minutes,
  allows_packages,
  supports_wasel,
  supports_raje3,
  metadata,
  active
)
values
  (
    'amman-zarqa',
    'Amman to Zarqa',
    'amman',
    'zarqa',
    'city_to_city',
    'priority',
    24.00,
    35,
    true,
    true,
    false,
    '{"launchPriority":1,"serviceMix":["ride","package"],"peakWindows":["07:00","17:00"]}'::jsonb,
    true
  ),
  (
    'zarqa-amman',
    'Zarqa to Amman',
    'zarqa',
    'amman',
    'city_to_city',
    'priority',
    24.00,
    40,
    true,
    true,
    false,
    '{"launchPriority":1,"serviceMix":["ride","package"],"peakWindows":["08:00","18:00"]}'::jsonb,
    true
  ),
  (
    'amman-irbid',
    'Amman to Irbid',
    'amman',
    'irbid',
    'city_to_city',
    'core',
    95.00,
    75,
    true,
    true,
    true,
    '{"launchPriority":2,"serviceMix":["ride","package"],"peakWindows":["06:30","15:00"]}'::jsonb,
    true
  ),
  (
    'irbid-amman',
    'Irbid to Amman',
    'irbid',
    'amman',
    'city_to_city',
    'core',
    95.00,
    80,
    true,
    true,
    true,
    '{"launchPriority":2,"serviceMix":["ride","package"],"peakWindows":["07:00","16:30"]}'::jsonb,
    true
  ),
  (
    'amman-aqaba',
    'Amman to Aqaba',
    'amman',
    'aqaba',
    'city_to_city',
    'growth',
    330.00,
    260,
    true,
    true,
    true,
    '{"launchPriority":3,"serviceMix":["ride","package"],"peakWindows":["05:30","14:00"]}'::jsonb,
    true
  ),
  (
    'aqaba-amman',
    'Aqaba to Amman',
    'aqaba',
    'amman',
    'city_to_city',
    'growth',
    330.00,
    265,
    true,
    true,
    true,
    '{"launchPriority":3,"serviceMix":["ride","package"],"peakWindows":["06:00","15:00"]}'::jsonb,
    true
  )
on conflict (corridor_id) do update
set
  corridor_label = excluded.corridor_label,
  origin_city_id = excluded.origin_city_id,
  destination_city_id = excluded.destination_city_id,
  route_scope = excluded.route_scope,
  demand_tier = excluded.demand_tier,
  distance_km = excluded.distance_km,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  allows_packages = excluded.allows_packages,
  supports_wasel = excluded.supports_wasel,
  supports_raje3 = excluded.supports_raje3,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.pricing_rules (
  rule_id,
  corridor_id,
  trip_type_key,
  pricing_model,
  base_fare_jod,
  distance_rate_jod,
  minimum_price_jod,
  package_surcharge_jod,
  return_trip_discount_pct,
  demand_multiplier_min,
  demand_multiplier_max,
  metadata,
  active
)
values
  ('pricing-amman-zarqa-wasel', 'amman-zarqa', 'wasel', 'hybrid', 1.500, 0.040, 2.500, 0.900, 0.00, 0.950, 1.350, '{"recommendedSeatPrice":2.75}'::jsonb, true),
  ('pricing-zarqa-amman-wasel', 'zarqa-amman', 'wasel', 'hybrid', 1.500, 0.040, 2.500, 0.900, 0.00, 0.950, 1.350, '{"recommendedSeatPrice":2.75}'::jsonb, true),
  ('pricing-amman-irbid-wasel', 'amman-irbid', 'wasel', 'hybrid', 2.200, 0.038, 4.250, 1.100, 0.00, 1.000, 1.450, '{"recommendedSeatPrice":5.50}'::jsonb, true),
  ('pricing-irbid-amman-wasel', 'irbid-amman', 'wasel', 'hybrid', 2.200, 0.038, 4.250, 1.100, 0.00, 1.000, 1.450, '{"recommendedSeatPrice":5.50}'::jsonb, true),
  ('pricing-amman-aqaba-wasel', 'amman-aqaba', 'wasel', 'hybrid', 4.500, 0.045, 13.500, 2.500, 0.00, 1.000, 1.550, '{"recommendedSeatPrice":18.00}'::jsonb, true),
  ('pricing-aqaba-amman-wasel', 'aqaba-amman', 'wasel', 'hybrid', 4.500, 0.045, 13.500, 2.500, 0.00, 1.000, 1.550, '{"recommendedSeatPrice":18.00}'::jsonb, true),
  ('pricing-amman-irbid-raje3', 'amman-irbid', 'raje3', 'hybrid', 2.200, 0.038, 4.250, 1.100, 8.00, 1.000, 1.500, '{"recommendedSeatPrice":5.95,"pairedLifecycle":true}'::jsonb, true),
  ('pricing-irbid-amman-raje3', 'irbid-amman', 'raje3', 'hybrid', 2.200, 0.038, 4.250, 1.100, 8.00, 1.000, 1.500, '{"recommendedSeatPrice":5.95,"pairedLifecycle":true}'::jsonb, true),
  ('pricing-amman-aqaba-raje3', 'amman-aqaba', 'raje3', 'hybrid', 4.500, 0.045, 13.500, 2.500, 10.00, 1.000, 1.600, '{"recommendedSeatPrice":19.50,"pairedLifecycle":true}'::jsonb, true),
  ('pricing-aqaba-amman-raje3', 'aqaba-amman', 'raje3', 'hybrid', 4.500, 0.045, 13.500, 2.500, 10.00, 1.000, 1.600, '{"recommendedSeatPrice":19.50,"pairedLifecycle":true}'::jsonb, true)
on conflict (rule_id) do update
set
  corridor_id = excluded.corridor_id,
  trip_type_key = excluded.trip_type_key,
  pricing_model = excluded.pricing_model,
  base_fare_jod = excluded.base_fare_jod,
  distance_rate_jod = excluded.distance_rate_jod,
  minimum_price_jod = excluded.minimum_price_jod,
  package_surcharge_jod = excluded.package_surcharge_jod,
  return_trip_discount_pct = excluded.return_trip_discount_pct,
  demand_multiplier_min = excluded.demand_multiplier_min,
  demand_multiplier_max = excluded.demand_multiplier_max,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.seed_execution_log (seed_name, details)
values (
  'pricing.seed.sql',
  jsonb_build_object('corridors', 6, 'pricing_rules', 10, 'layer', 'business_logic_data')
);

commit;
