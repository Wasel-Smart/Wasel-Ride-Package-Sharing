-- Package hand-off tracking: persist the pickup/delivery verification codes,
-- verification flags, proof photos, and an escrow lifecycle column that
-- previously lived only in an in-memory client Map (packageTrackingService.ts).
-- On a page refresh that state was lost, so a package could show "delivered"
-- with no server record of who verified it or when.
--
-- This migration is purely additive: new columns only. Existing insert/read
-- paths are unchanged, so nothing that works today breaks.
--
-- The verification codes are single-use, per-package 6-digit hand-off secrets.
-- A future hardening pass should hash them (pgcrypto digest) the way
-- otp_sessions stores otp_hash; they are kept plain here so the verify endpoints
-- can compare on first ship without a crypto dependency in the edge runtime.
--
-- escrow_status is a lifecycle label driven by the payment layer (wallet/stripe),
-- NOT by the verify endpoints: pending -> escrowed (sender charged) ->
-- released (driver paid on verified delivery). The verify endpoints only flip the
-- pickup/delivery flags and move the package status; money stays in the payment
-- path so this migration introduces no new money flow.

begin;

alter table public.packages
  add column if not exists pickup_verification_code text,
  add column if not exists delivery_verification_code text,
  add column if not exists pickup_verified boolean not null default false,
  add column if not exists delivery_verified boolean not null default false,
  add column if not exists pickup_verified_at timestamptz,
  add column if not exists delivery_verified_at timestamptz,
  add column if not exists pickup_photo text,
  add column if not exists delivery_photo text,
  add column if not exists escrow_status text not null default 'pending';

alter table public.packages
  drop constraint if exists packages_escrow_status_check;
alter table public.packages
  add constraint packages_escrow_status_check
  check ( escrow_status in ( 'pending', 'escrowed', 'released', 'refunded' ) );

comment on column public.packages.pickup_verification_code is
  'Single-use 6-digit code the carrier matches to prove the package was collected.';
comment on column public.packages.delivery_verification_code is
  'Single-use 6-digit code the receiver matches to prove the package was delivered.';
comment on column public.packages.escrow_status is
  'pending -> escrowed (sender charged) -> released (driver paid on verified delivery). Driven by the payment layer.';

commit;
