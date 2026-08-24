# Production Readiness Gap Closure

**Date:** 2026-08-24
**Goal:** close the issues that kept Wasel below a 10/10 production-readiness score for the web and mobile applications.

## Gap closure matrix

| Area | Lost points | Closure applied |
| --- | --- | --- |
| Accessibility | Cookie consent behaved like a modal without a focus loop; sticky CTAs lacked explicit button types; the animated corridor map needed a durable screen-reader contract. | Added safe cookie-banner focus trapping, Escape dismissal, explicit `type="button"` controls, and maintained the map `role="img"`/`aria-label` contract. |
| Web performance | The map animation and broker polling had been reviewed as potential load risks. | The map now pauses its requestAnimationFrame loop when off-screen, and the broker fallback poll interval is 30 seconds with proxy retry recovery. |
| Internationalisation | A few Mobility OS overlay labels were still hardcoded. | Added localized English/Arabic keys for fallback focus, live corridor focus, and Jordan network labels. |
| Navigation reliability | Iframe detection was stubbed out, which made embedded navigation logic impossible to trust. | Implemented hardened iframe detection with cross-origin-safe handling. |
| State and storage safety | Language and cookie persistence touched browser storage directly in render-adjacent flows. | Moved language persistence to an effect and wrapped homepage browser storage reads/writes in guarded helpers. |
| Mobile observability | The mobile monitoring service existed but was not initialized at app startup. | Initialized Sentry/performance monitoring and cold-start breadcrumb recording in the mobile root. |
| Mobile store readiness | Native permission declarations lacked camera, photo-library, and biometric copy despite verification and proof flows. | Added iOS privacy strings and enabled Hermes explicitly for release performance. |

## Remaining operational requirements before launch

These are deployment inputs rather than code gaps and must be satisfied per environment:

- Real Supabase URL and anon key for web and mobile.
- Stripe publishable key and webhook configuration.
- Sentry DSNs for web and mobile release monitoring.
- Twilio/Resend/SendGrid credentials in server-side secret stores only.
- Store assets, privacy-policy URLs, and support contacts validated in App Store Connect and Google Play Console.
- Load-test baseline run against staging before public launch.
