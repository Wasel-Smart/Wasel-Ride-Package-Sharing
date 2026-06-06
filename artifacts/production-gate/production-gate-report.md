# Wasel Production Gate Report

Generated: 2026-06-06T10:33:58.819Z
Evidence-based score: 6.7/10
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

### FAIL - load-test-execution-ready

k6 is unavailable; scripts present: true
