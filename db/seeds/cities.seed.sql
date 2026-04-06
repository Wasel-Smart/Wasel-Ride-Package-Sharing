begin;

do $$
begin
  raise notice 'Applying cities.seed.sql';
end $$;

insert into public.cities (
  city_id,
  city_name,
  governorate,
  country_code,
  latitude,
  longitude,
  timezone_name,
  geo_reference,
  active
)
values
  (
    'amman',
    'Amman',
    'Amman',
    'JO',
    31.953900,
    35.910600,
    'Asia/Amman',
    '{"center":{"lat":31.9539,"lng":35.9106},"geohash":"sv8wr9"}'::jsonb,
    true
  ),
  (
    'irbid',
    'Irbid',
    'Irbid',
    'JO',
    32.555600,
    35.850000,
    'Asia/Amman',
    '{"center":{"lat":32.5556,"lng":35.85},"geohash":"svd4zz"}'::jsonb,
    true
  ),
  (
    'aqaba',
    'Aqaba',
    'Aqaba',
    'JO',
    29.526700,
    35.007800,
    'Asia/Amman',
    '{"center":{"lat":29.5267,"lng":35.0078},"geohash":"su8z7v"}'::jsonb,
    true
  ),
  (
    'zarqa',
    'Zarqa',
    'Zarqa',
    'JO',
    32.072800,
    36.088000,
    'Asia/Amman',
    '{"center":{"lat":32.0728,"lng":36.088},"geohash":"sv8zmh"}'::jsonb,
    true
  )
on conflict (city_id) do update
set
  city_name = excluded.city_name,
  governorate = excluded.governorate,
  country_code = excluded.country_code,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  timezone_name = excluded.timezone_name,
  geo_reference = excluded.geo_reference,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.seed_execution_log (seed_name, details)
values (
  'cities.seed.sql',
  jsonb_build_object('rows_targeted', 4, 'layer', 'core_system_data')
);

commit;
