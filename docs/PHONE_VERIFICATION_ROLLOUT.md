# Wasel phone verification rollout

Wasel uses Twilio Verify for OTP generation, delivery, expiry, and verification. Wasel does not generate or store OTP values.

## Live backend architecture

The confirmed production project is KV-backed and exposes the `make-server-0b1f4071` Hono function. Phone verification is deployed separately as `sms-verification`; it must not replace the existing mobility function.

The additive database migration creates:
- `phone_verification_private.rate_limits`: atomic 15-minute per-user/per-phone counters.
- `phone_verification_private.verified_phones`: canonical verified phone assignment, unique by user and phone.
- Service-role-only SECURITY DEFINER RPCs for consuming limits and confirming a verified phone.
- RLS enabled with no client policies on both private tables. Only the function owner accesses these tables through the RPCs.

After Twilio approves a code, the function writes the canonical private record and mirrors `phone_number` and `phone_verified=true` into protected Auth app metadata using the Auth Admin API. It does not directly modify Supabase-managed `auth.users` tables.

## Required Supabase Edge Function secrets

Configure these in Supabase Dashboard → Edge Functions → Secrets:
- `TWILIO_VERIFY_SERVICE_SID` (Twilio Verify Service SID, normally starts with `VA`)
- Either `TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`, or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
- Supabase-provisioned `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, or the supported publishable/secret key-set variables.

Never place credentials in Vite variables, Git, browser code, logs, or support tickets.

## Twilio Verify setup

1. Create a Verify Service in Twilio Console.
2. Enable SMS and configure a six-digit code.
3. Enable destination-country permissions for Jordan.
4. Enable provider-side fraud prevention and rate limits.
5. Confirm production account status and billing.

## Application limits

- 3 SMS sends per phone number per 15 minutes.
- 5 SMS sends per authenticated user per 15 minutes.
- 5 verification checks per phone number per 15 minutes.
- 10 verification checks per authenticated user per 15 minutes.

Twilio's own limits are an additional layer.

## Deployment order

1. Confirm the migration is present in the live project and verify RLS and RPC grants.
2. Configure the Twilio Verify and Supabase secrets.
3. Deploy `sms-verification` with JWT verification enabled.
4. Deploy the frontend with authenticated requests to `/functions/v1/sms-verification`.
5. Test send, invalid code, expired code, rate limit, duplicate phone, unauthenticated request, disallowed origin, and successful confirmation.
6. Confirm both the private verified-phone record and protected Auth app metadata after approval.
7. Confirm the existing `make-server-0b1f4071` mobility API remains healthy.

## Security notes

- The frontend sends the active Supabase access token and public API key.
- The function independently validates the access token with Supabase Auth.
- Only allowlisted browser origins are accepted.
- Requests are size-limited and phone numbers must be E.164.
- No OTP or provider credential is stored or logged.
- Do not disable Edge Function JWT verification.
