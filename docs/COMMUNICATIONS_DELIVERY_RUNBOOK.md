# Communications Delivery Runbook

This runbook turns Wasel communications from queued records into real provider-backed delivery.

## What is now included

- User communication preferences in `communication_preferences`
- Durable outbound queue in `communication_deliveries`
- Supabase Edge Function routes in `supabase/functions/make-server-0b1f4071/index.ts`
- Provider adapters for:
- Resend email
- SendGrid email fallback
- Twilio SMS
  - Twilio WhatsApp
- Queue processor route
- Provider webhook routes
- Retry and idempotency support

## Apply the new database migrations

Run these after the existing rollout pack:

1. `src/supabase/migrations/20260401223000_communications_runtime_contract.sql`
2. `src/supabase/migrations/20260401233000_communication_delivery_operations.sql`

## Required server secrets

Configure these in Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMMUNICATION_WORKER_SECRET`
- `COMMUNICATION_WEBHOOK_TOKEN`
- `COMMUNICATION_MAX_ATTEMPTS`
- `COMMUNICATION_PROCESS_INLINE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_SMS_FROM`
- `TWILIO_WHATSAPP_FROM`

## Exposed routes

The frontend already targets these routes through the edge function base:

- `GET /health`
- `GET /communications/preferences`
- `PATCH /communications/preferences`
- `POST /communications/deliver`

Operational routes:

- `POST /communications/process`
- `POST /communications/webhooks/resend?token=...`
- `POST /communications/webhooks/twilio?token=...`

## Queue processing

Run the processor on a schedule with the worker secret:

```bash
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-0b1f4071/communications/process" \
  -H "x-communication-worker-secret: $COMMUNICATION_WORKER_SECRET"
```

Recommended cadence:

- every 1 minute for production

## Webhook configuration

### Resend

Point your webhook to:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/make-server-0b1f4071/communications/webhooks/resend?token=YOUR_COMMUNICATION_WEBHOOK_TOKEN
```

### Twilio

Twilio status callbacks are attached automatically when the worker sends SMS or WhatsApp messages and `COMMUNICATION_WEBHOOK_TOKEN` is configured.

## Delivery lifecycle

- `queued`: waiting to be sent
- `processing`: currently being attempted by the worker
- `sent`: accepted by provider
- `delivered`: provider webhook confirmed final delivery
- `failed`: retries exhausted or terminal failure

## Production checklist

1. Apply both communication migrations.
2. Deploy the edge function.
3. Set all required secrets.
4. Verify your sending domain in Resend.
5. Verify your Twilio sender numbers and WhatsApp sender.
6. Configure the Resend webhook.
7. Trigger the worker manually.
8. Send one test email, SMS, and WhatsApp notification.
9. Confirm provider acceptance.
10. Confirm webhook receipt updates `communication_deliveries`.

## Monitoring queries

Queued backlog:

```sql
select delivery_status, channel, count(*)
from public.communication_deliveries
group by 1, 2
order by 1, 2;
```

Recent failures:

```sql
select delivery_id, channel, destination, error_message, attempts_count, updated_at
from public.communication_deliveries
where delivery_status = 'failed'
order by updated_at desc
limit 50;
```

Retry queue:

```sql
select delivery_id, channel, destination, next_attempt_at, attempts_count
from public.communication_deliveries
where delivery_status = 'queued'
  and next_attempt_at is not null
order by next_attempt_at asc;
```
