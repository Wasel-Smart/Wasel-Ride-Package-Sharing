alter table public.communication_deliveries
  add column if not exists idempotency_key text,
  add column if not exists attempts_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz null,
  add column if not exists next_attempt_at timestamptz null,
  add column if not exists locked_at timestamptz null,
  add column if not exists processed_by text null;

create unique index if not exists communication_deliveries_idempotency_key_idx
  on public.communication_deliveries (idempotency_key)
  where idempotency_key is not null;

create index if not exists communication_deliveries_retry_queue_idx
  on public.communication_deliveries (delivery_status, next_attempt_at, queued_at);

create index if not exists communication_deliveries_provider_ref_idx
  on public.communication_deliveries (provider_name, external_reference)
  where external_reference is not null;
