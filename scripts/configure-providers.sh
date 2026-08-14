#!/usr/bin/env bash

# Interactive provider setup. Secrets are supplied only at runtime (from the
# terminal or environment) and are never persisted or printed by this script.

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-zexlxabdcsjefptmjhuq}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command is not available: %s\n' "$1" >&2
    exit 1
  }
}

prompt_value() {
  local label="$1"
  local fallback="${2:-}"
  local value=""

  if [[ -t 0 ]]; then
    if [[ -n "$fallback" ]]; then
      printf '%s is set from the environment. Press Enter to keep it, or enter a replacement: ' "$label" >&2
    else
      printf '%s (leave blank to skip): ' "$label" >&2
    fi
    IFS= read -r value || true
  fi
  printf '%s' "${value:-$fallback}"
}

prompt_secret() {
  local label="$1"
  local fallback="${2:-}"
  local value=""

  if [[ -t 0 ]]; then
    if [[ -n "$fallback" ]]; then
      printf '%s is set from the environment. Press Enter to keep it, or enter a replacement: ' "$label" >&2
    else
      printf '%s (leave blank to skip): ' "$label" >&2
    fi
    IFS= read -r -s value || true
    printf '\n' >&2
  fi
  printf '%s' "${value:-$fallback}"
}

set_secret_if_present() {
  local name="$1"
  local value="$2"
  if [[ -n "$value" ]]; then
    supabase secrets set "$name=$value"
    printf 'Configured %s.\n' "$name"
  else
    printf 'Skipped %s.\n' "$name"
  fi
}

require_command supabase
if ! supabase projects list >/dev/null 2>&1; then
  printf 'Supabase CLI is not authenticated. Run supabase login or provide SUPABASE_ACCESS_TOKEN.\n' >&2
  exit 1
fi
supabase link --project-ref "$PROJECT_REF"

google_client_id="$(prompt_value 'Google OAuth client ID' "${GOOGLE_CLIENT_ID:-}")"
google_client_secret="$(prompt_secret 'Google OAuth client secret' "${GOOGLE_CLIENT_SECRET:-}")"
if [[ -n "$google_client_id" && -n "$google_client_secret" ]]; then
  set_secret_if_present SUPABASE_AUTH_GOOGLE_CLIENT_ID "$google_client_id"
  set_secret_if_present SUPABASE_AUTH_GOOGLE_CLIENT_SECRET "$google_client_secret"
else
  printf 'Skipped Google OAuth: both client ID and client secret are required.\n'
fi

facebook_app_id="$(prompt_value 'Facebook app ID' "${FACEBOOK_APP_ID:-}")"
facebook_app_secret="$(prompt_secret 'Facebook app secret' "${FACEBOOK_APP_SECRET:-}")"
if [[ -n "$facebook_app_id" && -n "$facebook_app_secret" ]]; then
  set_secret_if_present SUPABASE_AUTH_FACEBOOK_CLIENT_ID "$facebook_app_id"
  set_secret_if_present SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET "$facebook_app_secret"
else
  printf 'Skipped Facebook OAuth: both app ID and app secret are required.\n'
fi

stripe_secret_key="$(prompt_secret 'Stripe secret key' "${STRIPE_SECRET_KEY:-}")"
stripe_webhook_secret="$(prompt_secret 'Stripe webhook secret' "${STRIPE_WEBHOOK_SECRET:-}")"
stripe_price_id="$(prompt_value 'Wasel Plus Stripe price ID' "${STRIPE_WASEL_PLUS_PRICE_ID:-}")"
set_secret_if_present STRIPE_SECRET_KEY "$stripe_secret_key"
set_secret_if_present STRIPE_WEBHOOK_SECRET "$stripe_webhook_secret"
set_secret_if_present STRIPE_WASEL_PLUS_PRICE_ID "$stripe_price_id"

twilio_account_sid="$(prompt_value 'Twilio account SID' "${TWILIO_ACCOUNT_SID:-}")"
twilio_auth_token="$(prompt_secret 'Twilio auth token' "${TWILIO_AUTH_TOKEN:-}")"
twilio_messaging_sid="$(prompt_value 'Twilio messaging service SID' "${TWILIO_MESSAGING_SID:-}")"
twilio_sms_from="$(prompt_value 'Twilio SMS sender' "${TWILIO_SMS_FROM:-}")"
set_secret_if_present TWILIO_ACCOUNT_SID "$twilio_account_sid"
set_secret_if_present TWILIO_AUTH_TOKEN "$twilio_auth_token"
set_secret_if_present TWILIO_MESSAGING_SERVICE_SID "$twilio_messaging_sid"
set_secret_if_present TWILIO_SMS_FROM "$twilio_sms_from"

email_provider="$(prompt_value 'Email provider (resend, sendgrid, or blank to skip)' "${EMAIL_PROVIDER:-}")"
case "${email_provider,,}" in
  resend)
    resend_api_key="$(prompt_secret 'Resend API key' "${RESEND_API_KEY:-}")"
    resend_from="$(prompt_value 'Resend from address' "${RESEND_FROM_EMAIL:-}")"
    resend_reply_to="$(prompt_value 'Resend reply-to address' "${RESEND_REPLY_TO_EMAIL:-}")"
    set_secret_if_present RESEND_API_KEY "$resend_api_key"
    set_secret_if_present RESEND_FROM_EMAIL "$resend_from"
    set_secret_if_present RESEND_REPLY_TO_EMAIL "$resend_reply_to"
    ;;
  sendgrid)
    sendgrid_api_key="$(prompt_secret 'SendGrid API key' "${SENDGRID_API_KEY:-}")"
    sendgrid_from="$(prompt_value 'SendGrid from address' "${SENDGRID_FROM_EMAIL:-}")"
    set_secret_if_present SENDGRID_API_KEY "$sendgrid_api_key"
    set_secret_if_present SENDGRID_FROM_EMAIL "$sendgrid_from"
    ;;
  '') printf 'Skipped email provider configuration.\n' ;;
  *) printf 'Unsupported email provider: %s\n' "$email_provider" >&2; exit 1 ;;
esac

sentry_dsn="$(prompt_secret 'Sentry DSN' "${SENTRY_DSN:-}")"
if [[ -n "$sentry_dsn" ]]; then
  printf 'Sentry DSN was received. Configure it in the web hosting environment as VITE_SENTRY_DSN.\n'
else
  printf 'Skipped Sentry DSN.\n'
fi

printf 'Provider configuration completed. No credential values were displayed or stored locally.\n'
