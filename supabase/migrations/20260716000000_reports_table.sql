-- Issue reports submitted from the mobile app (ReportIssueScreen) and web.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid null references public.bookings(id) on delete set null,
  issue_type text not null,
  description text null,
  status text not null default 'open'
    check (status in ('open', 'triaged', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_reports_booking on public.reports(booking_id);
create index if not exists idx_reports_reporter on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status, created_at desc);

alter table public.reports enable row level security;

create policy "Reporters can insert their own reports"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "Reporters can view their own reports"
  on public.reports for select
  using (reporter_id = auth.uid());

grant select, insert on public.reports to authenticated;
