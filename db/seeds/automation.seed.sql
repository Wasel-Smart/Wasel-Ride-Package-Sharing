begin;

do $$
begin
  raise notice 'Applying automation.seed.sql';
end $$;

insert into public.route_reminders (
  reminder_id,
  user_id,
  corridor_id,
  label,
  origin_location,
  destination_location,
  frequency,
  preferred_time,
  next_reminder_at,
  enabled
)
values
  (
    '51515151-5151-5151-5151-515151515151',
    '11111111-1111-1111-1111-111111111111',
    'amman-irbid',
    'Weekday study run',
    'Amman',
    'Irbid',
    'weekdays',
    '07:15',
    timezone('utc', now()) + interval '12 hours',
    true
  ),
  (
    '52525252-5252-5252-5252-525252525252',
    '44444444-4444-4444-4444-444444444444',
    'zarqa-amman',
    'Daily commuter run',
    'Zarqa',
    'Amman',
    'daily',
    '17:30',
    timezone('utc', now()) + interval '10 hours',
    true
  )
on conflict (user_id, corridor_id) do update
set
  label = excluded.label,
  origin_location = excluded.origin_location,
  destination_location = excluded.destination_location,
  frequency = excluded.frequency,
  preferred_time = excluded.preferred_time,
  next_reminder_at = excluded.next_reminder_at,
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());

insert into public.pricing_snapshots (
  snapshot_id,
  user_id,
  corridor_id,
  corridor_key,
  route_scope,
  origin_location,
  destination_location,
  base_price_jod,
  final_price_jod,
  demand_score,
  price_pressure,
  source_context,
  metadata
)
values
  (
    '61616161-6161-6161-6161-616161616161',
    null,
    'amman-zarqa',
    'amman-zarqa',
    'city_to_city',
    'Amman',
    'Zarqa',
    2.46,
    2.75,
    78.50,
    'balanced',
    'bootstrap-baseline',
    '{"ruleId":"pricing-amman-zarqa-wasel","generatedBy":"seed"}'::jsonb
  ),
  (
    '62626262-6262-6262-6262-626262626262',
    null,
    'amman-irbid',
    'amman-irbid',
    'city_to_city',
    'Amman',
    'Irbid',
    5.05,
    5.50,
    84.00,
    'balanced',
    'bootstrap-baseline',
    '{"ruleId":"pricing-amman-irbid-wasel","generatedBy":"seed"}'::jsonb
  ),
  (
    '63636363-6363-6363-6363-636363636363',
    null,
    'amman-aqaba',
    'amman-aqaba',
    'city_to_city',
    'Amman',
    'Aqaba',
    17.40,
    18.90,
    92.30,
    'surging',
    'bootstrap-baseline',
    '{"ruleId":"pricing-amman-aqaba-raje3","generatedBy":"seed"}'::jsonb
  )
on conflict (snapshot_id) do update
set
  user_id = excluded.user_id,
  corridor_id = excluded.corridor_id,
  corridor_key = excluded.corridor_key,
  route_scope = excluded.route_scope,
  origin_location = excluded.origin_location,
  destination_location = excluded.destination_location,
  base_price_jod = excluded.base_price_jod,
  final_price_jod = excluded.final_price_jod,
  demand_score = excluded.demand_score,
  price_pressure = excluded.price_pressure,
  source_context = excluded.source_context,
  metadata = excluded.metadata;

insert into public.demand_alerts (
  id,
  user_id,
  origin_city,
  destination_city,
  service_type,
  requested_date,
  seats_or_slots,
  status,
  corridor_key,
  route_scope
)
values
  (
    '71717171-7171-7171-7171-717171717171',
    '44444444-4444-4444-4444-444444444444',
    'Zarqa',
    'Amman',
    'ride',
    current_date + 1,
    1,
    'active',
    'zarqa-amman',
    'city_to_city'
  ),
  (
    '72727272-7272-7272-7272-727272727272',
    '11111111-1111-1111-1111-111111111111',
    'Amman',
    'Irbid',
    'ride',
    current_date + 2,
    1,
    'active',
    'amman-irbid',
    'city_to_city'
  ),
  (
    '73737373-7373-7373-7373-737373737373',
    '11111111-1111-1111-1111-111111111111',
    'Amman',
    'Aqaba',
    'package',
    current_date + 3,
    1,
    'active',
    'amman-aqaba',
    'city_to_city'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  origin_city = excluded.origin_city,
  destination_city = excluded.destination_city,
  service_type = excluded.service_type,
  requested_date = excluded.requested_date,
  seats_or_slots = excluded.seats_or_slots,
  status = excluded.status,
  corridor_key = excluded.corridor_key,
  route_scope = excluded.route_scope,
  updated_at = timezone('utc', now());

insert into public.growth_events (
  id,
  user_id,
  event_name,
  funnel_stage,
  service_type,
  route_from,
  route_to,
  monetary_value_jod,
  metadata,
  corridor_key,
  route_scope
)
values
  (
    '81818181-8181-8181-8181-818181818181',
    '11111111-1111-1111-1111-111111111111',
    'trip_search_submitted',
    'search',
    'ride',
    'Amman',
    'Irbid',
    0.00,
    '{"source":"seed","intent":"study"}'::jsonb,
    'amman-irbid',
    'city_to_city'
  ),
  (
    '82828282-8282-8282-8282-828282828282',
    '44444444-4444-4444-4444-444444444444',
    'route_reminder_opt_in',
    'activation',
    'ride',
    'Zarqa',
    'Amman',
    0.00,
    '{"source":"seed","channel":"in_app"}'::jsonb,
    'zarqa-amman',
    'city_to_city'
  ),
  (
    '83838383-8383-8383-8383-838383838383',
    '11111111-1111-1111-1111-111111111111',
    'booking_completed',
    'conversion',
    'ride',
    'Amman',
    'Irbid',
    5.50,
    '{"source":"seed","bookingId":"ddddddd1-dddd-dddd-dddd-ddddddddddd1"}'::jsonb,
    'amman-irbid',
    'city_to_city'
  ),
  (
    '84848484-8484-8484-8484-848484848484',
    '44444444-4444-4444-4444-444444444444',
    'package_request_started',
    'intent',
    'package',
    'Zarqa',
    'Aqaba',
    6.50,
    '{"source":"seed","packageId":"eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2"}'::jsonb,
    'amman-aqaba',
    'city_to_city'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  event_name = excluded.event_name,
  funnel_stage = excluded.funnel_stage,
  service_type = excluded.service_type,
  route_from = excluded.route_from,
  route_to = excluded.route_to,
  monetary_value_jod = excluded.monetary_value_jod,
  metadata = excluded.metadata,
  corridor_key = excluded.corridor_key,
  route_scope = excluded.route_scope;

insert into public.referrals (
  id,
  referrer_id,
  referee_id,
  referral_code,
  referrer_reward_jod,
  referee_reward_jod,
  referee_completed_first_trip,
  referrer_rewarded,
  redeemed_at,
  completed_at,
  rewarded_at
)
values
  (
    '85858585-8585-8585-8585-858585858585',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'LINA-WASEL',
    2.00,
    1.00,
    true,
    true,
    timezone('utc', now()) - interval '2 days',
    timezone('utc', now()) - interval '5 hours',
    timezone('utc', now()) - interval '4 hours'
  )
on conflict (referee_id) do update
set
  referrer_id = excluded.referrer_id,
  referral_code = excluded.referral_code,
  referrer_reward_jod = excluded.referrer_reward_jod,
  referee_reward_jod = excluded.referee_reward_jod,
  referee_completed_first_trip = excluded.referee_completed_first_trip,
  referrer_rewarded = excluded.referrer_rewarded,
  redeemed_at = excluded.redeemed_at,
  completed_at = excluded.completed_at,
  rewarded_at = excluded.rewarded_at;

insert into public.support_tickets (
  ticket_id,
  user_id,
  topic,
  subject,
  detail,
  related_id,
  route_label,
  status,
  priority,
  channel,
  resolution_summary,
  latest_note,
  sla_due_at
)
values
  (
    '91919191-9191-9191-9191-919191919191',
    '44444444-4444-4444-4444-444444444444',
    'verification',
    'Account verification still pending',
    'User completed profile but still sees verification gate on booking flow.',
    '44444444-4444-4444-4444-444444444444',
    'Zarqa -> Amman',
    'open',
    'high',
    'in_app',
    null,
    'Waiting for operations review.',
    timezone('utc', now()) + interval '6 hours'
  ),
  (
    '92929292-9292-9292-9292-929292929292',
    '11111111-1111-1111-1111-111111111111',
    'package_issue',
    'Need package ETA update',
    'Sender wants an ETA refresh for package en route to Aqaba.',
    'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2',
    'Amman -> Aqaba',
    'investigating',
    'normal',
    'operations',
    null,
    'Automation queued for follow-up.',
    timezone('utc', now()) + interval '12 hours'
  )
on conflict (ticket_id) do update
set
  user_id = excluded.user_id,
  topic = excluded.topic,
  subject = excluded.subject,
  detail = excluded.detail,
  related_id = excluded.related_id,
  route_label = excluded.route_label,
  status = excluded.status,
  priority = excluded.priority,
  channel = excluded.channel,
  resolution_summary = excluded.resolution_summary,
  latest_note = excluded.latest_note,
  sla_due_at = excluded.sla_due_at,
  updated_at = timezone('utc', now());

insert into public.support_ticket_events (
  event_id,
  ticket_id,
  status,
  note,
  actor_type
)
values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '91919191-9191-9191-9191-919191919191', 'open', 'Ticket created from in-app verification blocker.', 'user'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', '92929292-9292-9292-9292-929292929292', 'investigating', 'Operations requested status refresh for package corridor.', 'operations')
on conflict (event_id) do nothing;

insert into public.automation_jobs (
  job_id,
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
values
  (
    'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
    null,
    'pricing_refresh',
    'amman-irbid',
    'amman-irbid',
    'city_to_city',
    'Amman',
    'Irbid',
    'queued',
    '{"ruleId":"pricing-amman-irbid-wasel","source":"seed"}'::jsonb,
    timezone('utc', now()) - interval '5 minutes'
  ),
  (
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    '44444444-4444-4444-4444-444444444444',
    'demand_recovery',
    'zarqa-amman',
    'zarqa-amman',
    'city_to_city',
    'Zarqa',
    'Amman',
    'queued',
    '{"demandAlertId":"71717171-7171-7171-7171-717171717171","source":"seed"}'::jsonb,
    timezone('utc', now()) - interval '2 minutes'
  ),
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3',
    null,
    'corridor_conversion',
    'amman-aqaba',
    'amman-aqaba',
    'city_to_city',
    'Amman',
    'Aqaba',
    'queued',
    '{"growthEventId":"84848484-8484-8484-8484-848484848484","source":"seed"}'::jsonb,
    timezone('utc', now()) + interval '20 minutes'
  ),
  (
    'b4b4b4b4-b4b4-b4b4-b4b4-b4b4b4b4b4b4',
    null,
    'revenue_observe',
    null,
    'amman-irbid',
    'city_to_city',
    'Amman',
    'Irbid',
    'queued',
    '{"scope":"corridor","source":"seed"}'::jsonb,
    timezone('utc', now()) + interval '40 minutes'
  )
on conflict (job_id) do update
set
  user_id = excluded.user_id,
  job_type = excluded.job_type,
  corridor_id = excluded.corridor_id,
  corridor_key = excluded.corridor_key,
  route_scope = excluded.route_scope,
  origin_location = excluded.origin_location,
  destination_location = excluded.destination_location,
  job_status = excluded.job_status,
  payload = excluded.payload,
  run_after = excluded.run_after,
  updated_at = timezone('utc', now());

select public.app_backfill_automation_jobs(50);

insert into public.seed_execution_log (seed_name, details)
values (
  'automation.seed.sql',
  jsonb_build_object('route_reminders', 2, 'pricing_snapshots', 3, 'demand_alerts', 3, 'growth_events', 4, 'support_tickets', 2, 'manual_jobs', 4, 'layer', 'automation_intelligence')
);

commit;
