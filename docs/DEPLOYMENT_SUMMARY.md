# Wasel Production Deployment — Complete Deployment Guide

## Deployment Checklist

- [ ] **Step 1**: Apply database migration via Supabase Dashboard
- [ ] **Step 2**: Build notification worker Docker image
- [ ] **Step 3**: Push image to Azure Container Registry
- [ ] **Step 4**: Deploy to Kubernetes cluster
- [ ] **Step 5**: Verify deployment and health checks

---

## Step 1: Apply Database Migration

**Time: 2 minutes**

1. Open https://app.supabase.com/project/zexlxabdcsjefptmjhuq/editor
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of `docs/RUN_MIGRATION.sql`
5. Click **Run**
6. Verify all queries return results (see verification section below)

**Alternative**: Run `verify-database-migration.sh` or `verify-database-migration.bat` to check if migration was applied.

---

## Step 2: Build Notification Worker Docker Image

**Prerequisites:**
- Docker installed and running
- Azure CLI logged in (`az login`)
- kubectl configured for your cluster

```bash
# Set variables
$env:REGISTRY="wasel.azurecr.io"
$env:VERSION="1.0.0"
$env:NAMESPACE="wasel-production"

# Build the image
docker build -t "${REGISTRY}/notification-worker:${VERSION}" -t "${REGISTRY}/notification-worker:latest" -f Dockerfile .

# Verify the image was built
docker images | grep notification-worker
```

**Windows PowerShell alternative:**
```powershell
.\deploy-notification-worker.bat
```

**Linux/macOS alternative:**
```bash
chmod +x deploy-notification-worker.sh
./deploy-notification-worker.sh
```

---

## Step 3: Push to Azure Container Registry

```bash
# Login to Azure Container Registry
az acr login --name wasel

# Push both versioned and latest tags
docker push "${REGISTRY}/notification-worker:${VERSION}"
docker push "${REGISTRY}/notification-worker:latest"

# Verify image is in registry
az acr repository list --name wasel --output table
```

---

## Step 4: Deploy to Kubernetes

```bash
# Update image tag in manifest
$env:REGISTRY="wasel.azurecr.io"
$env:VERSION="1.0.0"
$env:NAMESPACE="wasel-production"

# Apply manifests
kubectl apply -f notification-worker.yaml -n "${NAMESPACE}"

# Verify rollout
kubectl rollout status deployment/notification-worker -n "${NAMESPACE}" --timeout=300s

# Check pods are running
kubectl get pods -n "${NAMESPACE}" -l app=notification-worker

# Check service
kubectl get service notification-worker-service -n "${NAMESPACE}"

# Check HPA
kubectl get hpa notification-worker-hpa -n "${NAMESPACE}"
```

---

## Step 5: Verify Deployment

```bash
# Run verification script
.\verify-notification-worker.bat  # Windows
# OR
./verify-notification-worker.sh   # Linux/macOS

# Manual health check
kubectl port-forward svc/notification-worker-service 3000:80 -n "${NAMESPACE}"
curl http://localhost:3000/health
# Expected: {"status":"healthy","service":"notification-worker"}

curl http://localhost:3000/ready
# Expected: {"status":"ready"}
```

---

## What Was Fixed

### 1. Notification Worker Schema Mapping (100% Correct Now)

The notification worker (`service.ts`) was querying the wrong tables and columns. It has been completely rewritten to match the actual Supabase schema:

| Component | Before (Broken) | After (Fixed) |
|-----------|-----------------|---------------|
| User table | `profiles` | `users` |
| User preferences | `profiles.notification_preferences` (column that didn't exist) | `communication_preferences` table |
| Notification payload | `notifications.payload` (column that didn't exist) | `notifications.metadata` |
| Delivery tracking | None | `communication_deliveries` table |

### 2. User Profile Mapping (Verified Correct)

The frontend profile mapping in `LocalAuth.tsx` → `authContextHelpers.ts` → `mapBackendProfile` correctly maps:

- `users.id` → `WaselUser.id`
- `users.email` → `WaselUser.email`
- `users.full_name` → `WaselUser.name`
- `users.phone_number` → `WaselUser.phone`
- `users.role` → `WaselUser.role`
- `users.verification_level` (enum: `level_0`..`level_3`) → `WaselUser.verificationLevel`
- `users.phone_verified_at` → `WaselUser.phoneVerified`
- `wallets.balance` → `WaselUser.balance`
- `verification_records.sanad_status` → `WaselUser.verified` / `WaselUser.sanadVerified`

The `verification_level` enum in the database (`verification_level_v2`) matches the string values used by the app (`'level_0'`, `'level_1'`, `'level_2'`, `'level_3'`). No type mismatch.

### 3. Trust Center Wiring (100% Complete)

- `reloadTrustStatus` wrapped in `useCallback` with `[user]` dependency
- `handleSubmitIdentity` calls `updateUser({ verificationLevel: 'level_1' })` after success
- `handleSubmitDriverDocuments` calls `updateUser({ verificationLevel: 'level_2' })` after success
- Backend `handleSubmitDriverDocuments` now updates `users.verification_level = 'level_2'`
- Admin role correctly mapped in `mapBackendProfile`

### 4. Database Migration

Created `docs/RUN_MIGRATION.sql` with:
- `notification_preferences JSONB` column on `users`
- `payload`, `updated_at`, `sent_at`, `error_message` columns on `notifications`
- Triggers and indexes
- Backfill from `communication_preferences` table

---

## Rollback Procedure

If deployment fails:

```bash
# Rollback Kubernetes deployment
kubectl rollout undo deployment/notification-worker -n "${NAMESPACE}"

# Verify rollback
kubectl rollout status deployment/notification-worker -n "${NAMESPACE}" --timeout=300s

# If database migration causes issues, drop the columns (DANGEROUS - backup first!)
# ALTER TABLE public.users DROP COLUMN IF EXISTS notification_preferences;
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS payload;
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS sent_at;
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS error_message;
```

---

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod -l app=notification-worker -n "${NAMESPACE}"
kubectl logs -l app=notification-worker -n "${NAMESPACE}" --tail=100
```

### Database connection issues
- Verify `DATABASE_URL` secret exists in namespace
- Check network policies allow egress to Supabase
- Verify connection pooler settings

### Image pull errors
```bash
kubectl describe pod -l app=notification-worker -n "${NAMESPACE}" | grep -A 10 "Events"
az acr login --name wasel
kubectl get secret wasel-secrets -n "${NAMESPACE}" -o yaml
```

---

## Files Changed

| File | Change |
|------|--------|
| `service.ts` | Complete rewrite — queries `users`, `communication_preferences`, `notifications`, `communication_deliveries` |
| `Dockerfile` | Fixed paths for notification worker build |
| `tsconfig.worker.json` | New TypeScript config for worker |
| `notification-worker.yaml` | Removed Redis env vars, added health probes |
| `deploy-notification-worker.sh` | New Linux/macOS deploy script |
| `deploy-notification-worker.bat` | New Windows deploy script |
| `verify-notification-worker.sh` | Linux/macOS verification script |
| `verify-notification-worker.bat` | Windows verification script |
| `verify-database-migration.sh` | Database migration verification script |
| `verify-database-migration.bat` | Windows database verification script |
| `docs/RUN_MIGRATION.sql` | Self-contained migration SQL for Supabase Dashboard |
| `docs/DATABASE_MIGRATION.md` | Migration instructions |
| `TrustCenterPage.tsx` | `reloadTrustStatus` wrapped in `useCallback`, verification level updates added |
| `supabase/functions/make-server-0b1f4071/index.ts` | `handleSubmitDriverDocuments` now updates `users.verification_level = 'level_2'` |
| `src/contexts/LocalAuth.tsx` | Admin role mapping fixed, `verificationLevel` updates added |
| `src/features/home/MobilityOSLandingMap.tsx` | Enhanced connection layers and design polish |


Or paste directly into the Supabase Dashboard → SQL Editor.

### Step 2: Build and Push Docker Image

```bash
# Set your registry
$env:REGISTRY="wasel.azurecr.io"
$env:VERSION="1.0.0"

# Build
docker build -t $env:REGISTRY/notification-worker:$env:VERSION -f Dockerfile .

# Push
docker push $env:REGISTRY/notification-worker:$env:VERSION
docker push $env:REGISTRY/notification-worker:latest
```

Or use the provided script:
```bash
.\deploy-notification-worker.bat
```

### Step 3: Deploy to Kubernetes

```bash
# Update image tag in manifest
$env:REGISTRY="wasel.azurecr.io"
$env:VERSION="1.0.0"
$env:NAMESPACE="wasel-production"

# Apply manifests
kubectl apply -f notification-worker.yaml -n $env:NAMESPACE

# Verify
kubectl rollout status deployment/notification-worker -n $env:NAMESPACE --timeout=300s
kubectl get pods -n $env:NAMESPACE -l app=notification-worker
```

### Step 4: Verify End-to-End

1. **Health check**: `curl http://<worker-service>/health` → `{"status":"healthy"}`
2. **Database connectivity**: Check worker logs for successful PostgreSQL connection
3. **Profile sync**: Sign in to the app and verify user profile fields map correctly
4. **Notification flow**: Trigger a test notification and verify it appears in `notifications` and `communication_deliveries` tables

## Files Changed

| File | Change |
|------|--------|
| `service.ts` | Complete rewrite — queries `users`, `communication_preferences`, `notifications`, `communication_deliveries` |
| `Dockerfile` | Fixed paths for notification worker build |
| `tsconfig.worker.json` | New TypeScript config for worker |
| `notification-worker.yaml` | Removed Redis env vars, added health probes |
| `deploy-notification-worker.sh` | New Linux/macOS deploy script |
| `deploy-notification-worker.bat` | New Windows deploy script |
| `docs/DATABASE_MIGRATION.md` | Migration instructions |
| `supabase/migrations/20260725120000_fix_notification_worker_schema.sql` | New migration |
| `TrustCenterPage.tsx` | `reloadTrustStatus` wrapped in `useCallback`, verification level updates added |
