# Wasel phone verification rollout

Wasel phone verification now uses **Twilio Verify**. The Edge Function no longer generates or stores OTPs. Twilio owns code generation, delivery, expiry, and verification.

## Required Edge Function secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

- \`TWILIO_ACCOUNT_SID\`
- \`TWILIO_AUTH_TOKEN\`
- \`TWILIO_VERIFY_SERVICE_SID\` (Twilio Verify Service SID, normally starts with \`VA\`)
- \`SUPABASE_PUBLISHABLE_KEYS\` and \`SUPABASE_SECRET_KEYS\` are provisioned by Supabase for projects using the new key format. The function retains compatibility fallbacks to \`SUPABASE_ANON_KEY\` and \`SUPABASE_SERVICE_ROLE_KEY\`.

Do not add secret values to Git, Vite variables, client bundles, issue comments, or logs. The existing \`TWILIO_MESSAGING_SERVICE_SID\` / \`TWILIO_SMS_FROM\` settings remain in use by the separate communications worker; they are not used for phone verification.

## Twilio Verify service setup

1. Create a Verify Service in the Twilio Console.
2. Enable SMS as a verification channel and configure the service for a six-digit code.
3. Enable the destination-country permissions needed for Wasel users, including Jordan.
4. Configure fraud prevention / service rate limits in Twilio as an additional provider-side control.
5. Copy the Verify Service SID into \`TWILIO_VERIFY_SERVICE_SID\`.
6. Confirm the Twilio account is enabled for production traffic and has the required billing/payment configuration.

## Application-side limits

The database migration adds atomic, server-only limits per authenticated user and phone number:

- Up to 3 SMS sends per phone number per 15 minutes.
- Up to 5 SMS sends per user per 15 minutes.
- Up to 5 verification checks per phone number per 15 minutes.
- Up to 10 verification checks per user per 15 minutes.

Twilio's own service limits and fraud controls should remain enabled as a second layer.

## Deployment order

1. Configure and verify the Twilio Verify Service and Edge Function secrets.
2. Apply the migration \`20261120000000_secure_phone_verification.sql\`.
3. Deploy the updated \`sms-verification\` Edge Function with JWT verification enabled.
4. Deploy the updated web frontend.
5. Test an authenticated Jordanian mobile number end-to-end in a controlled test account.
6. Confirm the profile's \`phone_verified\` field and the latest \`user_verifications\` phone record are updated only after Twilio returns \`approved\`.
7. Confirm invalid codes, expired codes, rate limits, unauthenticated requests, and disallowed browser origins fail safely.

The migration deletes legacy rows from \`phone_verifications\`, because they contain plaintext OTPs and are no longer used. It removes client access to that legacy table and installs an atomic database confirmation function plus private rate-limit storage.

## Operational notes

- The Edge Function expects E.164 phone numbers. The Jordan-specific UI normalizes local mobile numbers to \`+9627XXXXXXXX\`.
- The API response never returns Twilio's raw error body.
- Application logs record provider status/error codes only, not phone numbers, OTPs, or credentials.
- If the Twilio Verify service is unavailable or not configured, the function fails closed with a generic error.
- Do not disable Edge Function JWT verification to work around authentication errors.
