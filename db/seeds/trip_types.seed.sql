begin;

do $$
begin
  raise notice 'Applying trip_types.seed.sql';
end $$;

insert into public.trip_types_catalog (
  trip_type_key,
  display_name,
  lifecycle_mode,
  generates_return_trip,
  default_return_buffer_minutes,
  pricing_multiplier,
  description,
  metadata,
  active
)
values
  (
    'wasel',
    'Wasel',
    'one_way',
    false,
    0,
    1.000,
    'One-way trip lifecycle for immediate rider and package mobility.',
    '{"labelAr":"واصل","lifecycle":"single_leg","autoCreateReturnTrip":false}'::jsonb,
    true
  ),
  (
    'raje3',
    'Raje3',
    'auto_return',
    true,
    480,
    1.080,
    'Auto-return lifecycle that seeds both outbound and return legs in one planning action.',
    '{"labelAr":"راجع","lifecycle":"paired_leg","autoCreateReturnTrip":true}'::jsonb,
    true
  )
on conflict (trip_type_key) do update
set
  display_name = excluded.display_name,
  lifecycle_mode = excluded.lifecycle_mode,
  generates_return_trip = excluded.generates_return_trip,
  default_return_buffer_minutes = excluded.default_return_buffer_minutes,
  pricing_multiplier = excluded.pricing_multiplier,
  description = excluded.description,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.seed_execution_log (seed_name, details)
values (
  'trip_types.seed.sql',
  jsonb_build_object('rows_targeted', 2, 'layer', 'business_logic_data')
);

commit;
