# Wasel Production Gate Report

Generated: 2026-06-06T15:06:14.883Z
Evidence-based score: 7.8/10
10/10 certified: no

## Checks

### PASS - backend-production-build

backend TypeScript production service build passed

### FAIL - docker-runtime-available

docker CLI is not installed or not on PATH

### FAIL - kubernetes-runtime-available

kubectl is not installed or not on PATH

### PASS - independent-service-dockerfiles

production Dockerfiles exist for core backend services

### PASS - redis-streams-durable-contract

production Redis broker includes publish, consumer groups, ack, pending recovery, claim, and DLQ

### PASS - payment-lifecycle-contract

payment service contains Stripe capture, refund, and idempotency contract

### PASS - frontend-direct-db-access

no frontend direct Supabase query paths found

### PASS - mock-fallback-runtime-paths

no disallowed mock/fallback/demo runtime paths found

### PASS - load-test-execution-ready

k6 available: k6.exe v1.7.1 (commit/9f82e6f1fc, go1.26.1, windows/amd64)
