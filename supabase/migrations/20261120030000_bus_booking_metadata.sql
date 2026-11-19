-- Bus booking metadata on the bookings table.
--
-- Bus tickets were booked through the same ride-booking RPC as rides, so the
-- bus-specific fields a passenger chose (schedule date, departure time, seat
-- preference, schedule mode) were dropped: the RPC only stores trip + seats +
-- fare. A bus "ticket" was really a ride booking with a bus-themed UI.
--
-- This adds a service_type discriminator and the bus metadata columns so a bus
-- ticket keeps its schedule server-side, and so bus vs ride bookings can be
-- listed separately. It also makes the wallet's bus_booking reference lookup
-- coherent (bus bookings now live in bookings, not in the orphaned bus_bookings
-- table no migration ever created).
--
-- Purely additive: new columns with safe defaults. The ride-booking RPC and all
-- existing flows are unchanged (service_type defaults to 'ride').
--
-- Performance: the composite index supports "list my bus bookings" and "list my
-- ride bookings" without a full scan.

begin;

alter table public.bookings
  add column if not exists service_type text not null default 'ride',
  add column if not exists schedule_date date,
  add column if not exists departure_time text,
  add column if not exists seat_preference text,
  add column if not exists schedule_mode text;

alter table public.bookings
  drop constraint if exists bookings_service_type_check;
alter table public.bookings
  add constraint bookings_service_type_check
  check ( service_type in ( 'ride', 'bus' ) );

create index if not exists idx_bookings_passenger_service_created
  on public.bookings ( passenger_id, service_type, created_at desc );

comment on column public.bookings.service_type is
  'ride (default) or bus. Bus rows carry schedule_date / departure_time / seat_preference / schedule_mode.';

commit;
