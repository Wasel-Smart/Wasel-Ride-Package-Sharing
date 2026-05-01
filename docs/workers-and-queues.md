# Workers And Queues

Wasel should not process ride matching, package coordination, payments, and notifications as one synchronous request chain. This document defines the async topology expected in production.

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

- Consumes `rides.requested`
- Produces `rides.assigned`
- Handles driver supply and route matching

### Package worker

- Consumes `packages.created`
- Consumes `packages.location-updated`
- Produces `packages.delivered`
- Handles package assignment, handoff, and live logistics state

### Payment worker

- Consumes `payments.authorized`
- Produces `payments.captured`
- Handles escrow settlement, refund orchestration, and reconciliation

### Notification worker

- Consumes `rides.assigned`
- Consumes `packages.delivered`
- Consumes `notifications.dispatch`
- Sends push, email, SMS, and WhatsApp events

### Ops worker

- Consumes `rides.completed`
- Consumes `payments.captured`
- Builds reporting, corridor intelligence, and operational aggregates

## Failure handling

- All workers must use dead-letter queues for terminal message failures.
- Matching and notification retries should use exponential backoff.
- Analytics and settlement rollups can use simpler fixed backoff.
- Every job must carry trace metadata and the original entity id.

## Deployment

Kubernetes worker deployment scaffolding lives under `infra/kubernetes/workers`.
