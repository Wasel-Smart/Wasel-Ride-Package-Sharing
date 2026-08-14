# Workers And Queues

Wasel processes ride matching, package coordination, payments, and notifications server-side in the Supabase Edge Function rather than as separate worker services. This document describes the async topology used in production.

## Queue topics

The typed queue contract lives in `src/platform/queue-contracts.ts`.

### Core topics

- `rides.requested`
- `rides.assigned`
- `rides.completed`
- `packages.created`
- `packages.location-updated`
- `packages.delivered`
- `payments.authorized`
- `payments.captured`
- `notifications.dispatch`

Every topic includes:
- owning worker
- retry policy
- dead-letter queue suffix

## Worker ownership

### Matching worker

- **Production implementation**: Edge function assigns driver synchronously during `POST /v1/bookings`
- **Legacy**: In-browser worker consumed `rides.requested` from broker; retained for backward compatibility but not started in production
- Handles driver supply and route matching

### Package worker

- **Production implementation**: Edge function assigns package to trip synchronously during `POST /v1/packages`
- **Legacy**: In-browser worker consumed `packages.created` and `packages.location-updated`; retained for backward compatibility but not started in production
- Handles package assignment, handoff, and live logistics state

### Payment worker

- **Production implementation**: Edge function handles Stripe webhooks (`/v1/payments/webhooks/stripe`) and updates `transactions` status
- Handles escrow settlement, refund orchestration, and reconciliation

### Notification worker

- **Production implementation**: Edge function delivers notifications directly via Twilio/Resend/SendGrid in request handlers
- **Legacy**: In-browser worker consumed `rides.assigned`, `packages.delivered`, `notifications.dispatch`; retained for backward compatibility but not started in production
- Sends push, email, SMS, and WhatsApp events

### Ops worker

- **Production implementation**: Edge function and growth engine update `ops_aggregates` on ride completion and payment capture
- Handles reporting, corridor intelligence, and operational aggregates

## Failure handling

- All edge function handlers use structured error responses with request tracing
- Matching and notification retries use exponential backoff at the client level
- Analytics and settlement rollups use fixed backoff
- Every job carries trace metadata and the original entity id

## Deployment

Kubernetes worker deployment scaffolding lives under `k8s/`. The current production deployment uses Supabase Edge Functions with synchronous request handling.
