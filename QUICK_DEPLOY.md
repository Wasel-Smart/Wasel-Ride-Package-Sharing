# Wasel - Quick Deployment Commands

## Project Reference: zexlxabdcsjefptmjhuq

### 1. Link Supabase Project
```bash
npx supabase link --project-ref zexlxabdcsjefptmjhuq
```

### 2. Apply Database Migrations
```bash
npx supabase db push --project-ref zexlxabdcsjefptmjhuq
```

Or manually apply the migration:
```bash
npx supabase db execute --file supabase/migrations/20250115_ratings_refunds_chat.sql --project-ref zexlxabdcsjefptmjhuq
```

### 3. Deploy Edge Functions

#### Payment Sheet
```bash
npx supabase functions deploy payment-sheet --project-ref zexlxabdcsjefptmjhuq
```

#### Refund Processing
```bash
npx supabase functions deploy refund --project-ref zexlxabdcsjefptmjhuq
```

#### Webhook Handler
```bash
npx supabase functions deploy webhook --project-ref zexlxabdcsjefptmjhuq
```

### 4. Set Secrets
```bash
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_51SZmpKENhKSYxMCX03sEOKEiljDGWYTX0ZKTVmqKM0NeNH60jWc6pzyW8vaMHr7ahEKfKRNG24UqNrlsELnEGvHZ004Ec5d33u" --project-ref zexlxabdcsjefptmjhuq

npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here" --project-ref zexlxabdcsjefptmjhuq

npx supabase secrets set SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co" --project-ref zexlxabdcsjefptmjhuq

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here" --project-ref zexlxabdcsjefptmjhuq
```

### 5. Configure Stripe Webhook

**Webhook URL:**
```
https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/webhook
```

**Events to Subscribe:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `refund.updated`

**Steps:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Paste webhook URL above
4. Select the 3 events
5. Copy the signing secret
6. Update the `STRIPE_WEBHOOK_SECRET` above

### 6. Enable Realtime

Go to: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/database/replication

Enable replication for:
- `messages`
- `notifications`
- `bookings`
- `trips`

### 7. Configure OAuth Providers

Go to: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/auth/providers

#### Google OAuth
- Client ID: `235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com`
- Client Secret: (Get from Google Cloud Console)
- Redirect URL: `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback`

#### Update Google Cloud Console
Add authorized redirect URI:
```
https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback
```

### 8. Start Development
```bash
npm run dev
```

### 9. Test Endpoints

#### Health Check
```bash
curl https://zexlxabdcsjefptmjhuq.supabase.co/rest/v1/
```

#### Payment Sheet (requires auth)
```bash
curl -X POST https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/payment-sheet \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "currency": "jod",
    "bookingId": "test-booking-id",
    "userId": "test-user-id"
  }'
```

### 10. Verify Database Tables

```bash
npx supabase db diff --project-ref zexlxabdcsjefptmjhuq
```

Check tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ratings', 'refunds', 'messages', 'notifications');
```

---

## Quick Troubleshooting

### Edge Function Not Working
```bash
# Check logs
npx supabase functions logs payment-sheet --project-ref zexlxabdcsjefptmjhuq

# Redeploy
npx supabase functions deploy payment-sheet --project-ref zexlxabdcsjefptmjhuq --no-verify-jwt
```

### Database Migration Failed
```bash
# Check current migrations
npx supabase migration list --project-ref zexlxabdcsjefptmjhuq

# Repair if needed
npx supabase migration repair --project-ref zexlxabdcsjefptmjhuq
```

### Secrets Not Set
```bash
# List current secrets
npx supabase secrets list --project-ref zexlxabdcsjefptmjhuq

# Unset and reset
npx supabase secrets unset STRIPE_SECRET_KEY --project-ref zexlxabdcsjefptmjhuq
npx supabase secrets set STRIPE_SECRET_KEY="new_value" --project-ref zexlxabdcsjefptmjhuq
```

---

## Production Checklist

- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Secrets configured
- [ ] Stripe webhook configured
- [ ] Realtime enabled
- [ ] OAuth providers configured
- [ ] RLS policies active
- [ ] Test payment flow
- [ ] Test cancellation flow
- [ ] Test chat functionality
- [ ] Test ratings system
- [ ] Performance verified
- [ ] Error monitoring active

---

## Support URLs

- **Supabase Dashboard**: https://app.supabase.com/project/zexlxabdcsjefptmjhuq
- **Database**: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/editor
- **Auth**: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/auth/users
- **Functions**: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/functions
- **Logs**: https://app.supabase.com/project/zexlxabdcsjefptmjhuq/logs/edge-functions

---

**Project Ready! 🚀**
