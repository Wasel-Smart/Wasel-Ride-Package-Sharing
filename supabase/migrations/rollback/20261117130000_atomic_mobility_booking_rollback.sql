-- Revert the atomic Mobility OS booking primitive.
--
-- Drops the function introduced in 20261117130000_atomic_mobility_booking.sql.
-- The /mobility-os/booking/create endpoint remains paused, so nothing calls it.

drop function if exists public.app_create_mobility_booking(text, uuid, text, numeric, text);