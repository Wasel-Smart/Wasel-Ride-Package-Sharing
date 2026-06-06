# Wasel Production Gate Report

Generated: 2026-06-06T10:27:25.028Z
Evidence-based score: 5.6/10
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

### FAIL - frontend-direct-db-access

14 direct frontend DB/client access findings

```text
mobile\src\services\ride.ts:80:    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
mobile\src\services\ride.ts:177:      const { error } = await this.supabase.from('ride_ratings').insert({
mobile\src\services\auth.ts:29:    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
src\utils\gdpr.ts:45:      const { error } = await supabase.from('user_consents').insert({
src\utils\gdpr.ts:112:      const { error } = await supabase.from('data_export_requests').insert({
src\utils\gdpr.ts:145:        supabase.from('users').select('*').eq('id', userId).single(),
src\utils\gdpr.ts:146:        supabase.from('ride_bookings').select('*').eq('passenger_id', userId),
src\utils\gdpr.ts:147:        supabase.from('packages').select('*').eq('sender_id', userId),
src\utils\gdpr.ts:148:        supabase.from('wallet_transactions').select('*').eq('user_id', userId),
src\utils\gdpr.ts:149:        supabase.from('user_consents').select('*').eq('user_id', userId),
src\utils\gdpr.ts:213:      const { error } = await supabase.from('data_deletion_requests').insert({
src\services\cancellation.ts:80:    await supabase.from('notifications').insert({
src\services\cancellation.ts:163:        await supabase.from('notifications').insert({
src\services\ratings.ts:87:    await supabase.from('notifications').insert({
```

### PASS - mock-fallback-runtime-paths

no disallowed mock/fallback/demo runtime paths found

### FAIL - load-test-execution-ready

k6 is unavailable; scripts present: true
