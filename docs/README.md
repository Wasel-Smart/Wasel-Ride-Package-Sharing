# Docs Index

This folder is the engineering handoff for Wasel: architecture, contracts, observability, testing, and release operations.

## Core platform docs

- [architecture.md](./architecture.md): bounded contexts, target topology, events, lifecycle states, and deployment posture
- [api-contract.md](./api-contract.md): versioning, response envelope, RBAC, and service surface
- [security-and-identity.md](./security-and-identity.md): auth posture, abuse controls, and secrets handling
- [observability.md](./observability.md): logs, metrics, tracing, SLOs, and failure triage
- [reliability-slos.md](./reliability-slos.md): service objectives, alert thresholds, and error-budget rules
- [circuit-breaker-recovery.md](./circuit-breaker-recovery.md): troubleshooting and recovery guide for circuit breaker issues
- [scaling-and-tradeoffs.md](./scaling-and-tradeoffs.md): architectural rationale and scale assumptions
- [workers-and-queues.md](./workers-and-queues.md): async topology, queue ownership, and worker responsibilities
- [testing.md](./testing.md): local verification and test-layer guidance
- [openapi/wasel-v1.yaml](./openapi/wasel-v1.yaml): OpenAPI scaffold for backend implementation and review
- [adrs/](./adrs/0001-service-boundaries.md): architecture decisions for service boundaries and async workers

## Delivery and launch docs

- [FINAL_DELIVERY_SUMMARY.md](./FINAL_DELIVERY_SUMMARY.md)
- [LAUNCH_REHEARSAL_CHECKLIST.md](./LAUNCH_REHEARSAL_CHECKLIST.md)
- [PRODUCTION_CUTOVER_CHECKLIST.md](./PRODUCTION_CUTOVER_CHECKLIST.md)
- [COMMUNICATIONS_DELIVERY_RUNBOOK.md](./COMMUNICATIONS_DELIVERY_RUNBOOK.md)

## Product and operational references

- [DATABASE_SCORECARD.md](./DATABASE_SCORECARD.md)
- [MOCK_ENGINE_LAUNCH_PACK.md](./MOCK_ENGINE_LAUNCH_PACK.md)
- [REAL_USER_TEST_MATRIX.md](./REAL_USER_TEST_MATRIX.md)

## Suggested reading order

1. [architecture.md](./architecture.md)
2. [api-contract.md](./api-contract.md)
3. [security-and-identity.md](./security-and-identity.md)
4. [observability.md](./observability.md)
5. [testing.md](./testing.md)
