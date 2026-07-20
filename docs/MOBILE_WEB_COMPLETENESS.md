# Wasel Mobile + Web Completeness Checklist

Wasel is shipped as a responsive web app and installable PWA today, with a native bridge contract ready for Capacitor builds. This checklist is the release gate for a 10/10 mobile + web frontend.

## Web/PWA gates

- Production build emits `dist/` and mirrors to `build/`.
- `public/manifest.json` uses `standalone`, portrait orientation, app shortcuts, and Wasel brand icons.
- `public/sw.js` precaches the app shell, manifest, icons, offline page, and brand assets.
- `index.html` includes mobile viewport, theme color, social metadata, manifest link, and SVG favicon.
- Arabic and English UI strings must not contain mojibake markers such as known mojibake markers in source files.

## Native mobile bridge gates

- `capacitor.config.json` defines the Wasel app id, app name, production web output directory, Android HTTPS scheme, splash screen, status bar, and push notification presentation defaults.
- Native shells can be generated from the built web app with Capacitor using the checked-in config.
- Android/iOS projects should be generated in release infrastructure and should not drift from this config.
- Store assets must use the canonical Wasel brand mark from `public/brand/wasel-mark-clean.svg`.

## Backend/runtime gates

- `npm run verify:supabase-rollout` must pass against the target Supabase project.
- `npm run verify:auth:production` must pass against the production OAuth callback URL.
- Edge function health must return OK for the URL resolved by `src/services/core.ts`.
- Mobile push, web push, email, SMS, WhatsApp, wallet, payments, and maps providers must be configured per environment before production launch.

## Release scoring rule

A release can be called 10/10 only when all of these are true:

1. Type-check, unit/integration tests, production build, and E2E tests pass.
2. Mobile readiness verification passes.
3. Lighthouse/accessibility/PWA checks pass on preview or production.
4. Production Supabase rollout and auth verification pass.
5. Android/iOS native shells are generated from the Capacitor config for store release, or the release is explicitly scoped as PWA-only.
