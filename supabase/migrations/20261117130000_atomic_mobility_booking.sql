-- Atomic Mobility OS booking creation.
--
-- The previous /mobility-os/booking/create handler read the corridor row, priced
-- the booking from a client-supplied timestamp, inserted a booking, then wrote
-- seats_booked back as an absolute value. Two concurrent requests therefore both
-- saw the last seat and both "bought" it, the counter was overwritten instead of
-- incremented, and a fractional seat quantity was accepted. The endpoint is
-- currently paused (it fails closed until a payment lifecycle exists); this
-- function is the server-owned primitive it must call when that lands.
--
-- Guarantees, all inside one transaction on the locked corridor row:
--   * capacity is re-checked under the lock, so a seat can never be oversold;
--   * seats_booked / cargo_booked_kg are incremented, never overwritten;
--   * the unit price is derived from the corridor at the server clock, so a
--     client-supplied price or timestamp cannot influence what is charged;
--   * seat quantities must be whole numbers;
--   * an outbox event is written in the same transaction.
--
-- Access is service-role only; the edge validates the caller's identity.

create or replace function public.app_create_mobility_booking(
  p_corridor_id text,
  p_user_id     uuid,
  p_type        text,
  p_quantity    numeric,
  p_trace_id    text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_corridor         record;
  v_unit_price       numeric(10,2);
  v_total_price      numeric(10,2);
  v_booking_id       uuid;
  v_seats_booked     integer;
  v_cargo_booked     numeric(10,2);
  v_utilization      numeric;
  v_demand_pressure  numeric;
  v_capacity_base    numeric;
  v_quantity_share   numeric;
  v_directional_bias numeric;
  v_new_demand       numeric(10,4);
  v_new_seat_price   numeric(10,2);
  v_demand_history   jsonb;
  v_price_history    jsonb;
  v_now              timestamptz := timezone('utc', now());
begin
  if p_type is null or p_type not in ('seat', 'cargo') then
    raise exception 'invalid mobility booking type' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid mobility booking quantity' using errcode = '22023';
  end if;
  -- Seats are whole units; a fractional seat count would over-allocate capacity.
  if p_type = 'seat' and p_quantity <> floor(p_quantity) then
    raise exception 'seat quantity must be a whole number' using errcode = '22023';
  end if;
  if p_trace_id is null or char_length(p_trace_id) not between 1 and 200 then
    raise exception 'invalid trace id' using errcode = '22023';
  end if;

  select c.id,
         c.seats_total, c.seats_booked,
         c.cargo_total_kg, c.cargo_booked_kg,
         c.base_price_seat, c.base_price_kg,
         c.demand_index, c.demand_history, c.price_history
    into v_corridor
    from public.mobility_corridors c
   where c.id = p_corridor_id
     for update;

  if not found then
    raise exception 'corridor % was not found', p_corridor_id using errcode = 'P0002';
  end if;

  if p_type = 'seat' then
    if v_corridor.seats_booked + p_quantity > v_corridor.seats_total then
      raise exception 'not enough seats' using errcode = 'P0001';
    end if;
  elsif v_corridor.cargo_booked_kg + p_quantity > v_corridor.cargo_total_kg then
    raise exception 'not enough cargo capacity' using errcode = 'P0001';
  end if;

  -- Price from the locked corridor row at the server clock. A client-supplied
  -- price or timestamp is never accepted.
  v_utilization := (v_corridor.seats_booked + v_corridor.cargo_booked_kg)
                   / greatest(v_corridor.seats_total + v_corridor.cargo_total_kg, 1);
  v_demand_pressure := v_corridor.demand_index * (1 + v_utilization);
  v_unit_price := round(
    (case when p_type = 'seat' then v_corridor.base_price_seat else v_corridor.base_price_kg end)
    * (1 + v_demand_pressure * v_utilization),
    2
  );
  v_total_price := round(v_unit_price * p_quantity, 2);

  insert into public.mobility_bookings (
    corridor_id, user_id, type, quantity, unit_price, total_price, booking_timestamp, trace_id
  )
  values (
    p_corridor_id, p_user_id, p_type, p_quantity, v_unit_price, v_total_price, v_now, p_trace_id
  )
  returning booking_id into v_booking_id;

  -- Advance the corridor with the same formula the snapshot uses, but as one
  -- atomic update instead of a read-then-write that overwrote seats_booked.
  if p_type = 'seat' then
    v_seats_booked := v_corridor.seats_booked + p_quantity::integer;
    v_cargo_booked := v_corridor.cargo_booked_kg;
  else
    v_seats_booked := v_corridor.seats_booked;
    v_cargo_booked := v_corridor.cargo_booked_kg + p_quantity;
  end if;

  v_capacity_base := greatest(
    case when p_type = 'seat' then v_corridor.seats_total else v_corridor.cargo_total_kg end,
    1
  );
  v_quantity_share := p_quantity / v_capacity_base;
  v_utilization := (v_seats_booked + v_cargo_booked)
                   / greatest(v_corridor.seats_total + v_corridor.cargo_total_kg, 1);
  v_directional_bias := case when p_type = 'seat' then 0.05 else 0.03 end;
  v_new_demand := round(least(greatest(
    v_corridor.demand_index * 0.74
      + v_quantity_share * 0.16
      + v_utilization * 0.10
      + v_directional_bias,
    0.18
  ), 1.85), 4);

  v_new_seat_price := round(
    v_corridor.base_price_seat * (1 + (v_new_demand * (1 + v_utilization)) * v_utilization),
    2
  );

  v_demand_history := coalesce((
    select jsonb_agg(value order by ord)
      from (
        select value, ord
          from (
            select e.value as value, e.ord as ord
              from jsonb_array_elements(coalesce(v_corridor.demand_history, '[]'::jsonb))
              with ordinality as e(value, ord)
            union all
            select to_jsonb(v_new_demand) as value, 1000000 as ord
          ) u
         order by ord desc
         limit 12
      ) t
  ), '[]'::jsonb);

  v_price_history := coalesce((
    select jsonb_agg(value order by ord)
      from (
        select value, ord
          from (
            select e.value as value, e.ord as ord
              from jsonb_array_elements(coalesce(v_corridor.price_history, '[]'::jsonb))
              with ordinality as e(value, ord)
            union all
            select to_jsonb(v_new_seat_price) as value, 1000000 as ord
          ) u
         order by ord desc
         limit 12
      ) t
  ), '[]'::jsonb);

  update public.mobility_corridors
     set seats_booked     = v_seats_booked,
         cargo_booked_kg  = v_cargo_booked,
         demand_index     = v_new_demand,
         demand_history   = v_demand_history,
         price_history    = v_price_history,
         updated_at       = v_now
   where id = p_corridor_id;

  insert into public.event_outbox (aggregate_type, aggregate_id, event_type, trace_id, payload)
  values (
    'mobility_booking',
    v_booking_id::text,
    'mobility_booking.created',
    p_trace_id,
    jsonb_build_object(
      'booking_id', v_booking_id,
      'corridor_id', p_corridor_id,
      'type', p_type,
      'quantity', p_quantity,
      'unit_price', v_unit_price,
      'total_price', v_total_price
    )
  );

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'corridor_id', p_corridor_id,
    'type', p_type,
    'quantity', p_quantity,
    'unit_price', v_unit_price,
    'total_price', v_total_price,
    'booking_timestamp', v_now
  );
end;
$$;

revoke all on function public.app_create_mobility_booking(text, uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.app_create_mobility_booking(text, uuid, text, numeric, text)
  to service_role;