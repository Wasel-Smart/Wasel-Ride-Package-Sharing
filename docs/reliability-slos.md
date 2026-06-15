# Reliability SLOs

These objectives make the platform measurable instead of aspirational.

## Service objectives

| Service | Availability | Latency / Freshness | Notes |
| --- | --- | --- | --- |
| API gateway | 99.9% | p95 < 250ms | Enforces auth, versioning, and rate limits |
| Identity service | 99.95% | p95 < 200ms | Session issuance and refresh rotation |
| Ride matching service | 99.9% | p95 < 700ms | Request intake and ride state transitions |
| Package delivery service | 99.9% | p95 < 400ms, freshness < 5s | Tracking ingestion and lifecycle updates |
| Payment service | 99.95% | p95 < 350ms | Auth, capture, refund orchestration |
| Notification worker | 99.9% | freshness < 2s | Dispatch after ride/package domain events |
| Ops worker | 99.5% | freshness < 5m | Reporting and corridor analytics |

The in-repo source of truth for these targets is `src/platform/service-topology.ts`.

## Error-budget rules

- Burn rate above 2x for two consecutive hours should page the on-call operator.
- Release promotions should pause when the current week burns more than 25% of the monthly error budget.
- Package tracking freshness breaches should block customer-visible "live tracking" claims until recovered.

## Alerting starter set

- API 5xx rate above 1% for 10 minutes
- Queue lag above 60 seconds on `rides.requested`
- Package location update drop rate above 5%
- Payment capture failure rate above 2%
- Notification delivery delay above 30 seconds
