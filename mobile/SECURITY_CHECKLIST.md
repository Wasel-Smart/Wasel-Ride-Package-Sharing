# Mobile Security Checklist

## Authentication
- [x] Supabase Auth with email/password
- [x] OAuth sign-in (Google, Facebook)
- [x] Phone OTP authentication
- [x] Biometric authentication (Face ID / Fingerprint)
- [x] Session persistence via secure storage
- [x] Auto-refresh of expired tokens
- [x] Rate limiting on sign-in attempts
- [x] Password strength validation on sign-up

## Data Protection
- [x] Secure token storage via Expo SecureStore
- [x] HTTPS-only API communication
- [x] Idempotent offline actions with deduplication
- [x] Encrypted local cache (MMKV)
- [x] No plaintext secrets in AsyncStorage

## Account Security
- [x] Two-factor authentication (2FA) setup and verification
- [x] Password reset flow
- [x] Account deletion flow
- [x] Sign out from all devices
- [x] Session management

## Network Security
- [x] API URL allowlist for network requests
- [x] Private IP address blocking in offline queue
- [x] Idempotency key header on mutating requests
- [x] 409 Conflict handling for duplicate requests

## Device Security
- [x] Biometric enrollment check before enabling
- [x] Secure session restoration on app launch
- [x] Deep link validation for OAuth callbacks
- [x] Error boundary for auth state errors

## Privacy
- [x] No PII in logs
- [x] Secure cookie handling
- [x] GDPR-compliant account deletion
- [x] Notification preference controls