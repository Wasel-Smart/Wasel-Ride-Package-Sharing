# ADR 0002: Async Workers For Heavy Flows

## Status

Accepted

## Decision

Ride assignment, package lifecycle side effects, payment reconciliation, notifications, and reporting are treated as async worker concerns instead of one synchronous request chain.

## Why

- Ride and logistics systems degrade badly under synchronous fan-out
- Notification and payment retries need DLQ-safe behavior
- Queue ownership clarifies which worker owns which failure mode

## Consequences

- Queue topics and worker manifests are contract assets
- CI validates worker naming, queue documentation, and deployment overlays
- Browser code should emit traceable events and rely on eventual consistency where appropriate
