# Communications Delivery Runbook

This runbook covers production delivery for SMS, email, push, and in-app notifications.

## Signals

- Delivery success rate.
- Provider error rate.
- Retry queue depth.
- Oldest pending delivery age.
- Duplicate idempotency keys.

## Triage

1. Check provider status pages for Stripe, Twilio, SendGrid, and push notification services.
2. Inspect recent rows in `communication_deliveries`.
3. Confirm `attempts_count`, `idempotency_key`, and retry timestamps are updating.
4. Check worker logs for provider-specific error codes.
5. Verify rate limits and sender reputation.

## Recovery

```sql
select channel, status, count(*)
from public.communication_deliveries
group by channel, status
order by channel, status;
```

- For transient provider failures, allow retries to drain.
- For invalid templates or credentials, pause the affected channel and rotate the secret or template.
- For duplicate sends, verify idempotency keys before replaying.
- For queue backlog, scale notification workers and monitor oldest pending age.

## Escalation

- Escalate payment-related notifications immediately if receipts or refunds are affected.
- Escalate auth or OTP delivery failures as P1.
- Escalate marketing-only delivery degradation as P2 unless it affects transactional flows.
