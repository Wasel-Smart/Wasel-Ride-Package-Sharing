# ADR 0001: Explicit Service Boundaries

## Status

Accepted

## Decision

Wasel keeps the current web repo, but its platform contract is modeled as separate services for identity, ride matching, packages, payments, and notifications.

## Why

- Prevents route/controller logic from becoming the only architecture
- Makes scaling and ownership legible in code review
- Gives infra, observability, and queue assets a stable target topology

## Consequences

- Some capabilities remain represented as contracts and deployment assets rather than full server implementations in this repo
- New features should map to a bounded context before adding endpoints or workers
