/**
 * AppSurfaces — re-export barrel
 *
 * BEFORE: This file was a single 88 KB module containing all page
 * component logic, all static config data, and all shared UI primitives.
 *
 * AFTER: Each concern lives in its own focused module under `./surfaces/`.
 * This file re-exports every public symbol so that all existing import
 * paths (`import { LandingPage } from './app/pages/AppSurfaces'`) keep
 * working with zero changes to callers.
 *
 * To add a new page surface:
 *  1. Add its config to `./surfaces/overviewConfigs.ts` (if it's an
 *     overview-style page), or create a focused file in `./surfaces/`.
 *  2. Re-export the new component below.
 *  3. Add the route in `wasel-routes.tsx`.
 *
 * @see ./surfaces/overviewConfigs.ts   — static page config data
 * @see ./surfaces/SharedPageComponents.tsx — shared UI primitives
 * @see ./surfaces/pageTypes.ts          — shared TypeScript types
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export {
  ActionCards,
  BrandPillRow,
  HeroFeatureGrid,
  HeroStats,
  MapHeroPanel,
  MetricGrid,
  PageHeading,
  ProtectedPage,
  SimpleOverviewPage,
  SupportActions,
} from './surfaces/SharedPageComponents';

// ─── Utility pages ────────────────────────────────────────────────────────────

export {
  NotFoundPage,
  PrivacyPage,
  RouteErrorPage,
  TermsPage,
} from './surfaces/SharedPageComponents';

// ─── Overview pages (all share SimpleOverviewPage template) ──────────────────
//
// These are thin wrappers that pass a config key to SimpleOverviewPage.
// Adding a new overview page = adding a key to overviewConfigs.ts and
// one export here. No new component code required.

import { SimpleOverviewPage } from './surfaces/SharedPageComponents';

export function AnalyticsPage()     { return <SimpleOverviewPage configKey="analytics" />; }
export function ExecutionPage()     { return <SimpleOverviewPage configKey="execution" />; }
export function MobilityPage()      { return <SimpleOverviewPage configKey="mobility" />; }
export function IntelligencePage()  { return <SimpleOverviewPage configKey="intelligence" />; }
export function TrustPage()         { return <SimpleOverviewPage configKey="trust" />; }
export function SafetyPage()        { return <SimpleOverviewPage configKey="safety" />; }
export function PlusPage()          { return <SimpleOverviewPage configKey="plus" />; }
export function DriverPage()        { return <SimpleOverviewPage configKey="driver" />; }
export function InnovationPage()    { return <SimpleOverviewPage configKey="innovation" />; }
export function ModerationPage()    { return <SimpleOverviewPage configKey="moderation" />; }
export function NotificationsPage() { return <SimpleOverviewPage configKey="notifications" />; }

// ─── Full-feature pages (kept in their own files) ─────────────────────────────
//
// These pages contain significant per-page logic and live in
// dedicated surface files. Import them directly from those files
// when you need to work on one specifically.

export { LandingPage }   from './surfaces/LandingPageSurface';
export { AuthPage }      from './surfaces/AuthPageSurface';
export { WalletPage }    from './surfaces/WalletPageSurface';
export { PaymentsPage }  from './surfaces/PaymentsPageSurface';
export { SettingsPage }  from './surfaces/SettingsPageSurface';
export { ProfilePage }   from './surfaces/ProfilePageSurface';
