# Observability

Wasel should be explainable in production under failure, latency, and scale pressure. That requires logs, metrics, tracing, and error reporting that align with the service boundaries.

---

## Actual production stack

| Signal | Tool | Source |
|---|---|---|
| Runtime errors | Sentry | `src/utils/monitoring.ts` |
| Client metrics & breadcrumbs | App Insights | `src/utils/appInsights.ts` |
| Structured log entries | Custom helper | `src/platform/observability.ts` |
| API timing breadcrumbs | `trackAPICall` | `src/platform/observability.ts` |
| Domain event breadcrumbs | `trackDomainEvent` | `src/platform/observability.ts` |
| Performance hooks | Web Vitals | `src/utils/performance.ts` |
| Grafana dashboard | Wasel Overview | `.github/workflows/grafana-dashboard-wasel-overview.json` |
| Uptime + broker health | `GET /v1/health` | Returns `broker.outboxPending` + `broker.deadLetterCount` |

## Recommended production stack additions

- Logs: Loki or ELK
- Metrics: Prometheus + Grafana
- Traces: OpenTelemetry collector
- Errors: Sentry (already wired)
- Dashboards: route latency, matching lag, payment failures, location-stream throttling, notification delivery

---

## Golden signals

### Ride matching

- `ride_request_count`
- `ride_match_latency_ms`
- `ride_acceptance_rate`
- `ride_cancellation_rate`
- `driver_supply_available`

### Package delivery

- `package_created_count`
- `package_pickup_latency_ms`
- `package_delivery_latency_ms`
- `package_delivery_success_rate`
- `package_location_update_drop_rate`

### Payments

- `payment_authorization_success_rate`
- `payment_capture_success_rate`
- `refund_rate`

### Platform

- `api_p95_latency_ms`
- `rate_limit_rejections`
- `worker_queue_depth`
- `websocket_connections_active`
- `trace_sampling_rate`

---

## Alert thresholds

| Metric | Warning | Critical |
|---|---|---|
| API error rate | > 1% for 10 min | > 5% |
| API p95 latency | > 500ms | > 1000ms |
| Queue lag (`rides.requested`) | > 30s | > 60s |
| Package location update drop rate | > 3% | > 5% |
| Payment capture failure rate | > 1% | > 2% |
| Notification delivery delay | > 15s | > 30s |
| DB connection pool usage | > 80% | > 95% |
| Worker circuit breaker open | any | — |
| DLQ depth (any topic) | > 10 | > 50 |

---

## DLQ monitoring

Every queue topic has a typed DLQ suffix defined in `src/platform/queue-contracts.ts` (e.g. `rides.requested.dlq`). The health endpoint at `GET /v1/health` exposes `broker.deadLetterCount`. Alert when this exceeds 10 on any topic.

Dead-letter messages carry:
- original `traceId`
- original entity ID
- failure reason and attempt count

This allows safe replay without re-triggering side effects.

---

## Trace model

Every request should carry:

- `requestId`
- `traceId`
- service name
- route or operation name
- user role when safe
- entity ID when safe

The client already adds request IDs to outbound API calls via `src/platform/observability.ts`. The server-side gateway preserves them across every downstream hop.

---

## Logging rules

- Emit structured JSON, not plain text blobs
- Never log secrets, tokens, payment instruments, or personal identity documents
- Prefer event names and entity IDs over long message strings
- Treat every async worker as its own logging producer

---

## Failure triage order

1. Check API gateway latency and error rates
2. Check ride and package queue lag
3. Check DLQ depth on all topics
4. Check notification worker delivery failures
5. Check payment authorization and capture error spikes
6. Check location-stream throttling and GPS drop patterns

---

## SLO starter set

| Service | Availability | Latency / Freshness |
|---|---|---|
| API gateway | 99.9% | p95 < 250ms |
| Identity service | 99.95% | p95 < 200ms |
| Ride matching | 99.9% | p95 < 700ms |
| Package delivery | 99.9% | p95 < 400ms, freshness < 5s |
| Payment service | 99.95% | p95 < 350ms |
| Notification worker | 99.9% | freshness < 2s |
| Ops worker | 99.5% | freshness < 5m |

See [reliability-slos.md](./reliability-slos.md) for the service-by-service objective sheet and error-budget rules.
