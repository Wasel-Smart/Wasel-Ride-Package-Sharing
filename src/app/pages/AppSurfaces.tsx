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

export { LandingPage } from './surfaces/LandingPageSurface';
export { AuthPage } from './surfaces/AuthPageSurface';
export { ProfilePage } from './surfaces/ProfilePageSurface';
