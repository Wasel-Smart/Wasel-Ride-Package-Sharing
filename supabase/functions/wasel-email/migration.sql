-- Wasel Email Delivery Log Table
-- Run this migration in your Supabase SQL editor BEFORE deploying the edge function.
-- This table records every email send attempt for audit, debugging, and retry logic.

create table if not exists public.communication_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  channel             text not null check (channel in ('email', 'sms', 'whatsapp', 'push', 'in_app')),
  destination         text not null,          -- email address or phone number
  subject             text,                   -- email subject line
  notification_id     text,                   -- links back to notifications table
  status              text not null default 'pending'
                          check (status in ('pending', 'sent', 'failed', 'bounced', 'unsubscribed')),
  provider            text,                   -- 'resend' | 'sendgrid' | 'twilio' | 'none'
  provider_message_id text,                   -- message ID from the provider
  error_detail        text,                   -- failure reason if status = 'failed'
  attempt_count       integer not null default 1,
  metadata            jsonb default '{}'
);

-- Index for fast lookups by notification_id and destination
create index if not exists idx_comm_deliveries_notification_id
  on public.communication_deliveries (notification_id)
  where notification_id is not null;

create index if not exists idx_comm_deliveries_destination
  on public.communication_deliveries (destination, created_at desc);

create index if not exists idx_comm_deliveries_status
  on public.communication_deliveries (status, created_at desc);

-- RLS: only service role can write; authenticated users can read their own rows
alter table public.communication_deliveries enable row level security;

create policy "Service role full access"
  on public.communication_deliveries
  as permissive for all
  to service_role
  using (true)
  with check (true);

create policy "Users read own deliveries"
  on public.communication_deliveries
  as permissive for select
  to authenticated
  using (
    destination = (select email from auth.users where id = auth.uid())
  );
