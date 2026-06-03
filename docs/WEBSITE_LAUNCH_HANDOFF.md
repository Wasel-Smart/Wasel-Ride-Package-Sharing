# Wasel14.online Phase 1 Website Launch Handoff

Last updated: 2026-06-02

## What is included

The public website now includes the Phase 1 MVP launch surfaces:

- Home landing page with the value proposition: **Share Rides. Split Costs. Travel Smarter Across Jordan.**
- Bilingual English/Arabic copy with RTL layout support.
- Public navigation: Home, How it Works, For Drivers, For Passengers, Cities, About, Contact.
- Login and Sign Up pages with Driver/Passenger user type selection.
- Find a Ride route search form.
- Offer a Ride driver intake form.
- Contact form, phone, WhatsApp, email, and social links.
- Popular route content for Amman–Zarqa, Amman–Irbid, Amman–Dead Sea, Amman–Airport, Amman–Aqaba, and Salt–Amman.
- Safety, trust, testimonials, FAQ, mobile app coming-soon CTA, privacy policy, and terms pages.
- SEO metadata, Open Graph/Twitter cards, JSON-LD organization data, sitemap, robots, and optional Google Analytics.

## Required production environment variables

Set these in the production hosting provider before deploying `wasel14.online`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Do **not** expose service-role keys to the browser. Service-role keys should only live in server-side automation or Supabase dashboard/admin tooling.

## Supabase launch steps

1. Apply `src/supabase/migrations/20260602153000_website_mvp_intake_tables.sql` to the production Supabase project.
2. Confirm RLS is enabled for:
   - `public.mvp_ride_searches`
   - `public.mvp_ride_offers`
   - `public.mvp_contact_messages`
3. Confirm `anon` and `authenticated` can only `INSERT` into those tables through the Data API.
4. Confirm public reads fail for the three intake tables.
5. Configure Supabase Auth email settings and callback URLs:
   - `https://wasel14.online/app/auth/callback`
   - local preview callback if needed for QA.

## Admin access handoff

This website does not add a browser-exposed admin secret. For launch operations:

- Create production operators in Supabase Auth using the dashboard.
- Grant operational/admin privileges through existing server-side or dashboard-only processes.
- Keep service-role credentials out of `.env` files that are shipped to the client.
- Use the Supabase dashboard to export MVP leads until a dedicated internal admin surface is approved.

## Domain and SSL checklist

1. Point `wasel14.online` DNS to the hosting provider.
2. Enable managed SSL/TLS at the hosting provider.
3. Verify canonical URL: `https://wasel14.online`.
4. Verify these public routes return HTTP 200 after deployment:
   - `/`
   - `/how-it-works`
   - `/for-drivers`
   - `/for-passengers`
   - `/cities`
   - `/about`
   - `/contact`
   - `/login`
   - `/register`
   - `/privacy-policy`
   - `/terms-and-conditions`
5. Verify legacy `/privacy` and `/terms` redirect to the public legal pages.

## QA checklist

- Submit a route search and confirm a row appears in `mvp_ride_searches`.
- Submit an offer-a-ride form and confirm a row appears in `mvp_ride_offers`.
- Submit a contact form and confirm a row appears in `mvp_contact_messages`.
- Register a passenger and driver account and confirm Supabase Auth receives the user metadata.
- Toggle Arabic/English and check RTL/LTR layout on mobile and desktop widths.
- Run Lighthouse on mobile and desktop once production dependencies are available in CI.
