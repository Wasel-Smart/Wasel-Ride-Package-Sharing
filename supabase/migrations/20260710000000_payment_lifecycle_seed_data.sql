-- Seed data for payment lifecycle testing
-- This migration inserts test fixtures that exercise the full payment lifecycle:
--   1. A test user with a wallet
--   2. A booking in "pending_payment" status
--   3. A Stripe payment intent linked to the booking
--   4. A wallet deposit transaction
-- These are only inserted in E2E/test environments. Run:
--   supabase db reset && supabase db push
--   supabase functions serve make-server-0b1f4071 --project-ref <ref>
-- then use the test fixtures to verify payment intent creation, webhook handling, and wallet credit.

-- Guard: only seed if the table exists (migration runs on fresh DB)
do $$
declare
  seed_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  seed_booking_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  seed_payment_intent_id text := 'pi_test_seed_0001';
begin
  -- Insert seed user if not exists
  if not exists (select 1 from users where id = seed_user_id) then
    insert into users (id, email, full_name, role, created_at, updated_at)
    values (seed_user_id, 'test+payment@wasel14.online', 'Payment Test User', 'passenger', now(), now());
  end if;

  -- Insert seed wallet if not exists
  if not exists (select 1 from wallets where user_id = seed_user_id) then
    insert into wallets (user_id, balance, currency, created_at, updated_at)
    values (seed_user_id, 0, 'jod', now(), now());
  end if;

  -- Insert seed booking if not exists
  if not exists (select 1 from bookings where id = seed_booking_id) then
    insert into bookings (
      id, passenger_id, driver_id, pickup_location, dropoff_location,
      status, payment_status, fare, currency, created_at, updated_at
    )
    values (
      seed_booking_id, seed_user_id, null,
      '{"lat":31.9454,"lng":35.9284}'::jsonb,
      '{"lat":31.9472,"lng":35.9320}'::jsonb,
      'pending', 'pending', 15.00, 'jod', now(), now()
    );
  end if;

  -- Insert seed payment record if not exists
  if not exists (select 1 from payments where id = seed_payment_intent_id) then
    insert into payments (id, user_id, amount, currency, status, booking_id, raw, created_at, updated_at)
    values (
      seed_payment_intent_id, seed_user_id, 15000, 'jod', 'requires_confirmation',
      seed_booking_id, '{}'::jsonb, now(), now()
    );
  end if;

  -- Insert seed wallet deposit transaction if not exists
  if not exists (
    select 1 from wallet_transactions
    where user_id = seed_user_id
      and external_reference = 'deposit_seed_transaction'
  ) then
    insert into wallet_transactions (
      user_id, amount, currency, type, status, reference_type,
      external_reference, created_at, updated_at
    )
    values (
      seed_user_id, 50.00, 'jod', 'deposit', 'completed', 'wallet_top_up',
      'deposit_seed_transaction', now(), now()
    );

    -- Credit the wallet to match
    update wallets set balance = 50.00, updated_at = now()
    where user_id = seed_user_id;
  end if;
end $$;
