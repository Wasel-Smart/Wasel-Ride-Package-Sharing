# Observability

Wasel should be explainable in production under failure, latency, and scale pressure. That requires logs, metrics, tracing, and error reporting that align with the service boundaries.

## Current repo posture

- Structured log entry helper: `src/platform/observability.ts`
- Runtime monitoring and Sentry integration: `src/utils/monitoring.ts`
- API timing breadcrumbs: `trackAPICall`
- Domain event breadcrumbs: `trackDomainEvent`
- Client-side performance hooks: `src/utils/performance.ts`

## Recommended production stack

- Logs: Loki or ELK
- Metrics: Prometheus + Grafana
- Traces: OpenTelemetry
- Errors: Sentry
- Dashboards: route latency, matching lag, payment failures, location-stream throttling, notification delivery

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

## Trace model

Every request should carry:

- `requestId`
- `traceId`
- service name
- route or operation name
- user role when safe
- entity id when safe

The client already adds request IDs to outbound API calls. The server-side gateway should preserve them across every downstream hop.

## Logging rules

- Emit structured JSON, not plain text blobs.
- Never log secrets, tokens, payment instruments, or personal identity documents.
- Prefer event names and entity IDs over long message strings.
- Treat every async worker as its own logging producer.

## Failure triage

1. Check API gateway latency and error rates.
2. Check ride and package queue lag.
3. Check notification worker delivery failures.
4. Check payment authorization and capture error spikes.
5. Check location-stream throttling and GPS drop patterns.

## Minimal SLO starter set

- API availability: `99.9%`
- Ride request acceptance path: `p95 < 700ms`
- Package tracking update ingestion: `p95 < 400ms`
- Notification enqueue after domain event: `p95 < 2s`

See [reliability-slos.md](./reliability-slos.md) for the service-by-service objective sheet and error-budget rules.
