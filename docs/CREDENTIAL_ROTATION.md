# Credential Rotation Guide

This document outlines the required manual actions for rotating credentials used by the Wasel application. These credentials cannot be auto-rotated and require manual intervention.

## Critical Credentials Requiring Manual Rotation

### 1. Supabase Service Role Key
- **Location**: `SUPABASE_SERVICE_ROLE_KEY` environment variable
- **Rotation Frequency**: Every 90 days (recommended)
- **Process**:
  1. Go to Supabase Dashboard → Settings → API
  2. Generate new service role key
  3. Update in all deployment environments (Vercel, Azure, local .env)
  4. Restart all edge functions and workers
  5. Verify all services can connect to Supabase

### 2. Supabase Anon/Public Key
- **Location**: `SUPABASE_ANON_KEY` environment variable
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Go to Supabase Dashboard → Settings → API
  2. Generate new anon key
  3. Update in frontend build (Vercel, mobile app)
  4. Redeploy frontend applications

### 3. Database Password (PostgreSQL)
- **Location**: Supabase project settings
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Go to Supabase Dashboard → Settings → Database
  2. Reset database password
  3. Update connection strings in all services
  4. Restart all services

### 4. Stripe API Keys
- **Location**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Go to Stripe Dashboard → Developers → API Keys
  2. Roll secret key (creates new one, old one valid for 24h)
  3. Update in all environments
  4. Update webhook signing secret if rotating

### 5. SendGrid API Key
- **Location**: `SENDGRID_API_KEY`
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Go to SendGrid Dashboard → Settings → API Keys
  2. Create new key with same permissions
  3. Update in all environments
  4. Delete old key after verification

### 6. Twilio Credentials
- **Location**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Go to Twilio Console → Account → API Keys & Tokens
  2. Create new API key/secret
  3. Update in all environments
  4. Delete old key after verification

### 7. Clerk/JWT Signing Keys
- **Location**: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Go to Clerk Dashboard → API Keys
  2. Rotate secret key
  3. Update in all environments
  4. Update JWT template if needed

### 8. Azure/Cloud Provider Credentials
- **Location**: Various (Azure CLI, GitHub Actions secrets, Vercel env vars)
- **Rotation Frequency**: Per provider recommendations
- **Process**:
  1. Follow provider-specific rotation procedures
  2. Update in CI/CD pipelines
  3. Update in deployment environments

### 9. Edge Function Secrets
- **Location**: Supabase Dashboard → Edge Functions → Secrets
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Update each secret in Supabase Dashboard
  2. Redeploy affected edge functions
  3. Verify function logs for errors

### 10. Worker Secrets
- **Location**: `OUTBOX_WORKER_SECRET`, `EVENT_BROKER_WORKER_SECRET`
- **Rotation Frequency**: Every 90 days
- **Process**:
  1. Generate new secure random strings
  2. Update in Supabase Edge Function secrets
  3. Update in worker deployment configs
  4. Restart workers

## Rotation Checklist

- [ ] Inventory all credentials in use
- [ ] Set calendar reminders for 90-day rotations
- [ ] Document rotation procedure for each credential
- [ ] Test rotation in staging first
- [ ] Coordinate rotation across all environments
- [ ] Verify all services work post-rotation
- [ ] Update documentation with new rotation dates
- [ ] Audit access logs for unusual activity post-rotation

## Emergency Rotation

If a credential is compromised:
1. Immediately revoke the compromised credential
2. Generate replacement
3. Deploy replacement to all environments
4. Monitor for unauthorized access attempts
5. Rotate all related credentials as precaution
6. Document incident and response

## Automation Opportunities

While full auto-rotation isn't possible for all credentials, these can be partially automated:
- Use HashiCorp Vault or Azure Key Vault for secret storage
- Implement secret rotation operators for Kubernetes workloads
- Use Supabase Management API for programmatic key rotation
- Set up monitoring alerts for credential expiration