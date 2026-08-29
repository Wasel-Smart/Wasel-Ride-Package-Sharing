# Infra

Honest status of everything in this folder — read before trusting anything here as production-ready.

## `redis/redis.conf`

A real, usable Redis config (maxmemory policy, RDB snapshotting). Wired into
[`docker-compose.redis.yml`](../docker-compose.redis.yml) at the repo root as
an **optional local dev addon**, not part of the default `docker compose up`
stack and not referenced by CI. Use it to build and test the PostGIS -> Redis
GEO migration path described in `docs/implementation-status.md` before
scheduling a real cutover.

## `k8s-draft/`

Kubernetes manifests for `notification-worker`, `ops-analytics-worker`,
`payment-reconciliation-service`, and `ride-matching-service`, plus
`deploy-kubernetes.sh` and `deploy-backend-services.sh`. These were found
sitting in a folder named `_DEAD_INFRA_REVIEW` — written at some point but
never reviewed, never deployed, and not something this pass can responsibly
certify as safe to apply to a real cluster without a human reviewing image
references, secrets handling, and resource limits first.

**Do not `kubectl apply` these without a review.** They're kept here (renamed
from "dead" to "draft" to reflect what they actually are) because throwing
away real engineering work isn't the fix for undocumented status — mislabeling
it as done was the bug. Treat this as the starting point for the "separate
worker services" roadmap item, not a finished deliverable.

## What's still genuinely not here

Kafka / Redis Streams: no config, no compose service, nothing. The production
event transport remains `SupabaseEventBroker` (Postgres outbox + Realtime).
`EventBroker` is an interface specifically so this can be swapped later
without touching call sites — but the swap itself hasn't been started.
