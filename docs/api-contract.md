# API Contract

The public API contract is versioned under `/v1/` and uses a standard response envelope for every backend-facing capability.

## Principles

- Version every externally consumed endpoint.
- Return one response shape for success and failure.
- Include request and trace metadata for support and observability.
- Keep controllers thin and move workflow logic into services and workers.

## Response envelope

Success:

```json
{
  "success": true,
  "data": {
    "id": "ride_123"
  },
  "metadata": {
    "requestId": "req_123",
    "timestamp": "2026-04-30T19:00:00.000Z",
    "version": "v1",
    "traceId": "trace_abc"
  }
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "message": "Driver supply is temporarily unavailable.",
    "code": "matching_unavailable",
    "details": {
      "retryAfterSeconds": 30
    }
  },
  "metadata": {
    "requestId": "req_123",
    "timestamp": "2026-04-30T19:00:00.000Z",
    "version": "v1",
    "traceId": "trace_abc"
  }
}
```

The browser envelope helpers live in `src/platform/api-envelope.ts`.

## Service surface

### Identity service

- `POST /v1/auth/signup`
- `POST /v1/auth/signin`
- `POST /v1/auth/refresh`
- `POST /v1/auth/signout`

### Ride matching service

- `POST /v1/rides`
- `GET /v1/rides/search`
- `GET /v1/rides/status/:id`
- `POST /v1/rides/schedule`
- `POST /v1/rides/cancel`
- `PATCH /v1/rides/:id`

### Package delivery service

- `POST /v1/packages`
- `GET /v1/packages/{packageId}`
- `POST /v1/packages/{packageId}/assign`
- `POST /v1/packages/{packageId}/pickup`
- `PATCH /v1/packages/{packageId}/location`
- `POST /v1/packages/{packageId}/deliver`

### Payment service

- `GET /v1/payments/methods/:id`
- `POST /v1/payments/charge`
- `POST /v1/payments/refund`
- `POST /v1/payments/verify`

### Operations and trust

- `GET /v1/ops/health`
- `GET /v1/ops/metrics`
- `GET /v1/trust/users/{userId}`
- `POST /v1/trust/users/{userId}/review`

## Validation and RBAC

- Validate all request DTOs before entering domain services.
- Enforce RBAC at the API gateway and the service boundary.
- Expected roles:
  - `admin`
  - `operator`
  - `driver`
  - `user`

The in-repo RBAC primitive lives in `src/platform/rbac.ts`.
The cross-service ownership model lives in `src/platform/service-topology.ts`.

## OpenAPI

See [`docs/openapi/wasel-v1.yaml`](./openapi/wasel-v1.yaml) for a concrete spec scaffold that can be imported into Swagger UI, Stoplight, or Postman.
