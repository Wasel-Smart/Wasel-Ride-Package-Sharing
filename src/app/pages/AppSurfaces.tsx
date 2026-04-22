/**
 * AppSurfaces - re-export barrel.
 *
 * This keeps existing import paths stable while the page surfaces live in
 * focused modules under `./surfaces/`.
 */

export {
  ActionCards,
  BrandPillRow,
  HeroFeatureGrid,
  HeroStats,
  MapHeroPanel,
  MetricGrid,
  NotFoundPage,
  PageHeading,
  PrivacyPage,
  ProtectedPage,
  RouteErrorPage,
  SimpleOverviewPage,
  SupportActions,
  TermsPage,
} from './surfaces/SharedPageComponents';

import { SimpleOverviewPage } from './surfaces/SharedPageComponents';

export function AnalyticsPage() {
  return <SimpleOverviewPage configKey="analytics" />;
}

export function ExecutionPage() {
  return <SimpleOverviewPage configKey="execution" />;
}

export function MobilityPage() {
  return <SimpleOverviewPage configKey="mobility" />;
}

export function IntelligencePage() {
  return <SimpleOverviewPage configKey="intelligence" />;
}

export function TrustPage() {
  return <SimpleOverviewPage configKey="trust" />;
}

export function SafetyPage() {
  return <SimpleOverviewPage configKey="safety" />;
}

export function PlusPage() {
  return <SimpleOverviewPage configKey="plus" />;
}

export function DriverPage() {
  return <SimpleOverviewPage configKey="driver" />;
}

export function InnovationPage() {
  return <SimpleOverviewPage configKey="innovation" />;
}

export function ModerationPage() {
  return <SimpleOverviewPage configKey="moderation" />;
}

export function NotificationsPage() {
  return <SimpleOverviewPage configKey="notifications" />;
}

export { LandingPage } from './surfaces/LandingPageSurface';
export { AuthPage } from './surfaces/AuthPageSurface';
export { WalletPage } from './surfaces/WalletPageSurface';
export { PaymentsPage } from './surfaces/PaymentsPageSurface';
export { SettingsPage } from './surfaces/SettingsPageSurface';
export { ProfilePage } from './surfaces/ProfilePageSurface';
