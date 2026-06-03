-- Align the runtime user settings table with the frontend/Edge Function contract.
-- The web app persists notification channel preferences alongside display/privacy.

alter table public.user_settings
  add column if not exists notifications jsonb not null default jsonb_build_object(
    'email', true,
    'push', true,
    'sms', false,
    'whatsapp', false,
    'preferredLanguage', 'en'
  );

alter table public.user_settings
  drop constraint if exists user_settings_preferred_language_check;

alter table public.user_settings
  add constraint user_settings_preferred_language_check
  check ((notifications ->> 'preferredLanguage') in ('en', 'ar'));
