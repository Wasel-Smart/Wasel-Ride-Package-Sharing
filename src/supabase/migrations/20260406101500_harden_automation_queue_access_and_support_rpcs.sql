-- Harden client automation queue access and make support ticket writes atomic.

drop policy if exists automation_jobs_insert_own on public.automation_jobs;
drop policy if exists support_tickets_insert_own on public.support_tickets;
drop policy if exists support_tickets_update_own on public.support_tickets;
drop policy if exists support_ticket_events_insert_own on public.support_ticket_events;

create or replace function public.app_enqueue_automation_job(
  p_job_type text,
  p_corridor_id text default null,
  p_corridor_key text default null,
  p_route_scope text default null,
  p_origin_location text default null,
  p_destination_location text default null,
  p_payload jsonb default '{}'::jsonb,
  p_run_after timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_corridor_id text;
  v_corridor_key text;
  v_origin_location text;
  v_destination_location text;
  v_payload jsonb := '{}'::jsonb;
  v_existing public.automation_jobs%rowtype;
  v_job public.automation_jobs%rowtype;
  v_open_jobs integer := 0;
  v_type_open_jobs integer := 0;
  v_reminder_id text;
  v_ticket_id text;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null then
    raise exception 'Authentication required to enqueue automation jobs';
  end if;

  if p_job_type not in (
    'demand_recovery',
    'corridor_conversion',
    'pricing_refresh',
    'retention_nudge',
    'reminder_dispatch',
    'support_sla',
    'support_follow_up',
    'revenue_observe'
  ) then
    raise exception 'Unsupported automation job type: %', p_job_type;
  end if;

  if p_route_scope is not null
    and p_route_scope not in (
      'city_to_city',
      'city_to_governorate',
      'governorate_to_city',
      'governorate_to_governorate'
    ) then
    raise exception 'Unsupported route scope: %', p_route_scope;
  end if;

  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Automation payload must be a JSON object';
  end if;

  v_corridor_id := nullif(trim(coalesce(p_corridor_id, '')), '');
  v_corridor_key := nullif(trim(coalesce(p_corridor_key, p_corridor_id, '')), '');
  v_origin_location := nullif(trim(coalesce(p_origin_location, '')), '');
  v_destination_location := nullif(trim(coalesce(p_destination_location, '')), '');

  v_payload := case
    when p_job_type in ('demand_recovery', 'corridor_conversion', 'pricing_refresh', 'revenue_observe') then
      jsonb_strip_nulls(
        jsonb_build_object(
          'eventName', nullif(trim(coalesce(p_payload ->> 'eventName', '')), ''),
          'funnelStage', nullif(trim(coalesce(p_payload ->> 'funnelStage', '')), ''),
          'serviceType', nullif(trim(coalesce(p_payload ->> 'serviceType', '')), ''),
          'corridorKey', nullif(trim(coalesce(p_payload ->> 'corridorKey', v_corridor_key, '')), ''),
          'pricePressure', nullif(trim(coalesce(p_payload ->> 'pricePressure', '')), ''),
          'priceQuote', case when jsonb_typeof(p_payload -> 'priceQuote') = 'object' then p_payload -> 'priceQuote' else null end,
          'valueJod', case when jsonb_typeof(p_payload -> 'valueJod') = 'number' then p_payload -> 'valueJod' else null end
        )
      )
    when p_job_type in ('retention_nudge', 'reminder_dispatch') then
      jsonb_strip_nulls(
        jsonb_build_object(
          'reminderId', nullif(trim(coalesce(p_payload ->> 'reminderId', '')), ''),
          'label', nullif(trim(coalesce(p_payload ->> 'label', '')), ''),
          'frequency', nullif(trim(coalesce(p_payload ->> 'frequency', '')), ''),
          'preferredTime', nullif(trim(coalesce(p_payload ->> 'preferredTime', '')), ''),
          'deliveredAt', case when jsonb_typeof(p_payload -> 'deliveredAt') = 'string' then p_payload -> 'deliveredAt' else null end
        )
      )
    when p_job_type in ('support_sla', 'support_follow_up') then
      jsonb_strip_nulls(
        jsonb_build_object(
          'ticketId', nullif(trim(coalesce(p_payload ->> 'ticketId', '')), ''),
          'topic', nullif(trim(coalesce(p_payload ->> 'topic', '')), ''),
          'priority', nullif(trim(coalesce(p_payload ->> 'priority', '')), ''),
          'relatedId', nullif(trim(coalesce(p_payload ->> 'relatedId', '')), ''),
          'subject', nullif(trim(coalesce(p_payload ->> 'subject', '')), ''),
          'routeLabel', nullif(trim(coalesce(p_payload ->> 'routeLabel', '')), '')
        )
      )
    else '{}'::jsonb
  end;

  if octet_length(v_payload::text) > 4096 then
    raise exception 'Automation payload exceeds the 4 KB limit';
  end if;

  v_reminder_id := nullif(v_payload ->> 'reminderId', '');
  v_ticket_id := nullif(v_payload ->> 'ticketId', '');

  if v_reminder_id is not null then
    select *
    into v_existing
    from public.automation_jobs
    where user_id = v_user_id
      and job_type = p_job_type
      and job_status in ('queued', 'processing')
      and payload ->> 'reminderId' = v_reminder_id
    order by created_at desc
    limit 1;
  elsif v_ticket_id is not null then
    select *
    into v_existing
    from public.automation_jobs
    where user_id = v_user_id
      and job_type = p_job_type
      and job_status in ('queued', 'processing')
      and payload ->> 'ticketId' = v_ticket_id
    order by created_at desc
    limit 1;
  elsif v_corridor_key is not null then
    select *
    into v_existing
    from public.automation_jobs
    where user_id = v_user_id
      and job_type = p_job_type
      and job_status in ('queued', 'processing')
      and corridor_key = v_corridor_key
    order by created_at desc
    limit 1;
  end if;

  if v_existing.job_id is not null then
    return to_jsonb(v_existing);
  end if;

  select count(*)
  into v_open_jobs
  from public.automation_jobs
  where user_id = v_user_id
    and job_status in ('queued', 'processing');

  if v_open_jobs >= 25 then
    raise exception 'Automation queue is at capacity for this account';
  end if;

  select count(*)
  into v_type_open_jobs
  from public.automation_jobs
  where user_id = v_user_id
    and job_type = p_job_type
    and job_status in ('queued', 'processing');

  if v_type_open_jobs >= 5 then
    raise exception 'Too many pending automation jobs for %', p_job_type;
  end if;

  insert into public.automation_jobs (
    user_id,
    job_type,
    corridor_id,
    corridor_key,
    route_scope,
    origin_location,
    destination_location,
    job_status,
    payload,
    run_after
  )
  values (
    v_user_id,
    p_job_type,
    v_corridor_id,
    v_corridor_key,
    p_route_scope,
    v_origin_location,
    v_destination_location,
    'queued',
    v_payload,
    coalesce(p_run_after, timezone('utc', now()))
  )
  returning *
  into v_job;

  return to_jsonb(v_job);
end;
$$;

create or replace function public.app_create_support_ticket(
  p_topic text,
  p_subject text,
  p_detail text,
  p_related_id text default null,
  p_route_label text default null,
  p_status text default 'open',
  p_priority text default 'low',
  p_channel text default 'in_app',
  p_note text default 'Support ticket created and waiting for review.'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_status text;
  v_priority text;
  v_channel text;
  v_note text;
  v_subject text;
  v_detail text;
  v_ticket public.support_tickets%rowtype;
  v_event public.support_ticket_events%rowtype;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null then
    raise exception 'Authentication required to create support tickets';
  end if;

  v_subject := nullif(trim(coalesce(p_subject, '')), '');
  v_detail := nullif(trim(coalesce(p_detail, '')), '');
  if v_subject is null then
    raise exception 'Support subject is required';
  end if;
  if v_detail is null then
    raise exception 'Support detail is required';
  end if;

  v_status := case
    when p_status in ('investigating', 'waiting_on_user', 'resolved', 'closed') then p_status
    else 'open'
  end;
  v_priority := case
    when p_priority in ('normal', 'high', 'urgent') then p_priority
    else 'low'
  end;
  v_channel := case
    when p_channel in ('operations', 'phone', 'email') then p_channel
    else 'in_app'
  end;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is null then
    v_note := 'Support ticket created and waiting for review.';
  end if;

  insert into public.support_tickets (
    user_id,
    topic,
    subject,
    detail,
    related_id,
    route_label,
    status,
    priority,
    channel,
    latest_note,
    sla_due_at
  )
  values (
    v_user_id,
    coalesce(nullif(trim(coalesce(p_topic, '')), ''), 'general'),
    v_subject,
    v_detail,
    nullif(trim(coalesce(p_related_id, '')), ''),
    nullif(trim(coalesce(p_route_label, '')), ''),
    v_status,
    v_priority,
    v_channel,
    v_note,
    case v_priority
      when 'urgent' then timezone('utc', now()) + interval '2 hours'
      when 'high' then timezone('utc', now()) + interval '12 hours'
      when 'normal' then timezone('utc', now()) + interval '24 hours'
      else timezone('utc', now()) + interval '48 hours'
    end
  )
  returning *
  into v_ticket;

  insert into public.support_ticket_events (
    ticket_id,
    status,
    note,
    actor_type
  )
  values (
    v_ticket.ticket_id,
    v_status,
    v_note,
    'system'
  )
  returning *
  into v_event;

  return jsonb_build_object(
    'ticket', to_jsonb(v_ticket),
    'events', jsonb_build_array(to_jsonb(v_event))
  );
end;
$$;

create or replace function public.app_update_support_ticket_status(
  p_ticket_id uuid,
  p_status text,
  p_note text,
  p_resolution_summary text default null,
  p_priority text default null,
  p_channel text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_status text;
  v_priority text;
  v_channel text;
  v_note text;
  v_resolution_summary text;
  v_ticket public.support_tickets%rowtype;
  v_event public.support_ticket_events%rowtype;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null and not public.is_admin() then
    raise exception 'Authentication required to update support tickets';
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where ticket_id = p_ticket_id
    and (user_id = v_user_id or public.is_admin())
  for update;

  if v_ticket.ticket_id is null then
    raise exception 'Support ticket not found';
  end if;

  v_status := case
    when p_status in ('investigating', 'waiting_on_user', 'resolved', 'closed') then p_status
    else 'open'
  end;
  v_priority := case
    when p_priority in ('low', 'normal', 'high', 'urgent') then p_priority
    else null
  end;
  v_channel := case
    when p_channel in ('in_app', 'operations', 'phone', 'email') then p_channel
    else null
  end;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is null then
    v_note := format('Ticket moved to %s.', v_status);
  end if;
  v_resolution_summary := case
    when p_resolution_summary is null then v_ticket.resolution_summary
    else nullif(trim(p_resolution_summary), '')
  end;

  update public.support_tickets
  set
    status = v_status,
    priority = coalesce(v_priority, priority),
    channel = coalesce(v_channel, channel),
    latest_note = v_note,
    resolution_summary = v_resolution_summary,
    updated_at = timezone('utc', now())
  where ticket_id = p_ticket_id
  returning *
  into v_ticket;

  insert into public.support_ticket_events (
    ticket_id,
    status,
    note,
    actor_type
  )
  values (
    v_ticket.ticket_id,
    v_status,
    v_note,
    'system'
  )
  returning *
  into v_event;

  return jsonb_build_object(
    'ticket', to_jsonb(v_ticket),
    'events', jsonb_build_array(to_jsonb(v_event))
  );
end;
$$;

revoke all on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) from public;

grant execute on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) to authenticated;

grant execute on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) to service_role;
