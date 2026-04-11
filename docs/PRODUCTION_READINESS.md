# Wasel — Production Readiness Checklist

> **CTO sign-off gate.** Every item must be ✅ before deploying to production.  
> Owner: Engineering Lead. Review cadence: before every release.

---

## 1 · Environment variables

| Variable | Required | Status |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Confirm production project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Confirm publishable key (not service role) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Switch from `pk_test_` to `pk_live_` |
| `VITE_SENTRY_DSN` | ✅ | Create production project in Sentry |
| `VITE_APP_URL` | ✅ | Set to `https://wasel14.online` |
| `VITE_SUPPORT_WHATSAPP_NUMBER` | ✅ | Real WhatsApp Business number |
| `VITE_GOOGLE_MAPS_API_KEY` | ✅ | Browser-restricted key, Jordan billing active |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | OAuth client with production redirect URIs |

---

## 2 · Supabase database

- [ ] All 25+ migrations applied in order on the production project
- [ ] Row-Level Security (RLS) enabled and verified on every table
- [ ] `web_vitals` table created and anonymous insert policy active
- [ ] `verify:supabase-rollout` script passes against production
- [ ] Supabase Storage buckets created for profile photos and documents

---

## 3 · Authentication & Security

- [ ] Google OAuth redirect URIs updated to production domain
- [ ] Facebook OAuth redirect URIs updated to production domain
- [ ] Supabase Auth email templates customised (Wasel branding)
- [ ] Auth callback path (`/app/auth/callback`) reachable and tested
- [ ] HTTPS forced on all environments
- [ ] All security headers verified via `securityheaders.com` (target: A+)

---

## 4 · Payment (Stripe)

- [ ] Stripe live mode keys in production environment
- [ ] Stripe webhook endpoint registered and secret saved to Edge Function env
- [ ] Test a real CliQ payment end-to-end on staging
- [ ] Escrow hold/release flow verified
- [ ] Refund flow verified end-to-end

---

## 5 · Monitoring & Observability

- [ ] Sentry DSN active and errors flowing in dashboard
- [ ] Source maps uploaded to Sentry (hidden sourcemap in build)
- [ ] `web_vitals` table receiving data from production sessions
- [ ] Lighthouse CI baseline established (`npm run test:lhci`)
- [ ] Uptime monitoring configured (UptimeRobot or similar)

---

## 6 · CI / Quality gates

- [ ] All CI jobs green on `main` branch:
  - [ ] `verify` (types · lint · unit tests · build · bundle size · security headers · PWA manifest)
  - [ ] `e2e-core` (Chromium core flows)
  - [ ] `e2e-a11y` (WCAG 2.1 AA — all key pages)
  - [ ] `e2e-rtl` (Arabic RTL layout)
  - [ ] `lighthouse` (performance budget: LCP < 2.8s, CLS < 0.1, a11y ≥ 0.95)
- [ ] `npm audit` passes with zero high/critical vulnerabilities
- [ ] Coverage thresholds met (lines ≥ 85 %, functions ≥ 85 %)

---

## 7 · SEO & Discoverability

- [ ] Sitemap submitted to Google Search Console
- [ ] `robots.txt` verified at `https://wasel14.online/robots.txt`
- [ ] OG image (`/brand/og-social-card.png`) renders correctly in opengraph.xyz
- [ ] JSON-LD structured data verified via Google Rich Results Test
- [ ] Canonical URL set to `https://wasel14.online` in `index.html`

---

## 8 · PWA & Offline

- [ ] Service worker registers successfully in Chrome DevTools
- [ ] Install prompt appears on Chrome Android
- [ ] Offline fallback (`/offline.html`) loads when network is disconnected
- [ ] Manifest `screenshots` field renders in Chrome install dialog
- [ ] Push notification permissions prompt working on mobile

---

## 9 · Localisation & Accessibility

- [ ] Arabic (RTL) layout verified on iPhone 14 and Pixel 7
- [ ] English layout verified on iPad and desktop (1440px)
- [ ] `axe-playwright` accessibility suite passes (zero WCAG 2.1 AA violations)
- [ ] SkipToContent link visible on Tab keypress
- [ ] All images have `alt` text
- [ ] All interactive elements have accessible names
- [ ] Focus ring visible and consistent across themes

---

## 10 · Business readiness

- [ ] Support WhatsApp number responds within 1 business hour
- [ ] At least one test ride offered and booked on production corridors
- [ ] Privacy Policy reviewed by legal (GDPR + Jordan PDPL compliant)
- [ ] Terms of Service reviewed and signed off
- [ ] GDPR/PDPL consent banner functional and logged to Supabase
- [ ] Emergency incident runbook documented in Notion/Confluence

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| CTO / Engineering Lead | | | |
| Product Lead | | | |
| Legal / Compliance | | | |

---

*Last updated: 2026-04-11 by automated CTO audit.*
