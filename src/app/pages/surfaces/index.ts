/**
 * Barrel export for all page surfaces.
 *
 * Consumer code imports from this single index file.
 * Internal split between sub-modules is an implementation detail.
 *
 * @example
 * import { LandingPage, AuthPage, WalletPage } from '@/app/pages/surfaces';
 */

// Shared primitives
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
} from './SharedPageComponents';

// Config data (useful for testing and storybook)
export { overviewConfigs } from './overviewConfigs';
export type { OverviewConfigKey } from './overviewConfigs';
export type { BrandPillItem, HeroFeatureItem, OverviewCard, OverviewConfig } from './pageTypes';
export { CITY_OPTIONS, LANDING_RETURN_TO, LANDING_SUPPORT_EMAIL, LANDING_SUPPORT_PHONE, RIDE_TYPE_OPTIONS } from './pageTypes';
