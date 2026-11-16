-- Allow bookings.payment_status = 'partially_refunded'.
--
-- The refund paths (admin refund endpoint and the Stripe `charge.refunded` webhook)
-- record a partly refunded booking as 'partially_refunded' instead of misreporting
-- it as fully 'refunded'. Whether the live column accepts that value depends on how
-- it was created (a native enum, or a text column with a CHECK list), and no
-- migration in this repository defines it, so this migration inspects the live
-- column and widens exactly what is there. It does nothing when the value is
-- already accepted, and it never removes an allowed value.

do $$
declare
  v_udt        text;
  v_is_enum    boolean;
  v_constraint record;
begin
  select c.udt_name
    into v_udt
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name   = 'bookings'
     and c.column_name  = 'payment_status';

  if v_udt is null then
    raise notice 'public.bookings.payment_status does not exist; nothing to widen';
    return;
  end if;

  select exists (
    select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
     where t.typname = v_udt
  ) into v_is_enum;

  if v_is_enum then
    execute format('alter type %I add value if not exists %L', v_udt, 'partially_refunded');
  end if;

  for v_constraint in
    select con.conname, pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
     where con.conrelid = 'public.bookings'::regclass
       and con.contype  = 'c'
       and pg_get_constraintdef(con.oid) ilike '%payment_status%'
       and pg_get_constraintdef(con.oid) ilike '%''refunded''%'
       and pg_get_constraintdef(con.oid) not ilike '%partially_refunded%'
  loop
    -- The definition lists the allowed values. Adding one next to 'refunded' keeps
    -- every existing value valid, so existing rows cannot violate the new check.
    execute format('alter table public.bookings drop constraint %I', v_constraint.conname);
    execute format(
      'alter table public.bookings add constraint %I %s',
      v_constraint.conname,
      replace(v_constraint.definition, '''refunded''', '''refunded'', ''partially_refunded''')
    );
  end loop;
end
$$;
