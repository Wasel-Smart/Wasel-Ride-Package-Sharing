import { common } from './chunks/common';
import { auth } from './chunks/auth';
import { landing } from './chunks/landing';
import { dashboard } from './chunks/dashboard';
import { header } from './chunks/header';
import { sidebar } from './chunks/sidebar';
import { services } from './chunks/services';
import { trips } from './chunks/trips';
import { messages } from './chunks/messages';
import { notifications } from './chunks/notifications';
import { payments } from './chunks/payments';
import { settings } from './chunks/settings';
import { profile } from './chunks/profile';
import { verification } from './chunks/verification';
import { admin } from './chunks/admin';
import { legal } from './chunks/legal';
import { support } from './chunks/support';
import { errors } from './chunks/errors';
import { success } from './chunks/success';
import { onboarding } from './chunks/onboarding';
import { cliq } from './chunks/cliq';
import { iraq } from './chunks/iraq';
import { system } from './chunks/system';
import { driverPageExpanded } from './chunks/driverPageExpanded';
import { profileExpanded } from './chunks/profileExpanded';
import { settingsExpanded } from './chunks/settingsExpanded';
import { homeSections } from './chunks/homeSections';
import { offerRide } from './chunks/offerRide';
import { activity } from './chunks/activity';
import { trustCenterExpanded } from './chunks/trustCenterExpanded';
import { app } from './chunks/app';
import { errorBoundary } from './chunks/errorBoundary';
import { accountDeletionDialog } from './chunks/accountDeletionDialog';
import { cookieConsentBanner } from './chunks/cookieConsentBanner';
import { imageWithFallback } from './chunks/imageWithFallback';
import { liveTripTracking } from './chunks/liveTripTracking';
import { mapWrapper } from './chunks/mapWrapper';
import { pWAInstallPrompt } from './chunks/pWAInstallPrompt';
import { popularRoutes } from './chunks/popularRoutes';
import { rateDriverModal } from './chunks/rateDriverModal';
import { appErrorBoundary } from './chunks/appErrorBoundary';
import { sessionTimeoutWarning } from './chunks/sessionTimeoutWarning';
import { tripChat } from './chunks/tripChat';
import { tripProgressCard } from './chunks/tripProgressCard';
import { oAuthStatus } from './chunks/oAuthStatus';
import { waselMap } from './chunks/waselMap';
import { adminDashboardPage } from './chunks/adminDashboardPage';
import { busPage } from './chunks/busPage';
import { driverPage } from './chunks/driverPage';
import { mobilityOSLandingMap } from './chunks/mobilityOSLandingMap';
import { homeContent } from './chunks/homeContent';
import { conversionSections } from './chunks/conversionSections';
import { homeHeroSection } from './chunks/homeHeroSection';
import { privacyPolicy } from './chunks/privacyPolicy';
import { securityPage } from './chunks/securityPage';
import { termsOfService } from './chunks/termsOfService';
import { corridorCard } from './chunks/corridorCard';
import { mobilityOSCore } from './chunks/mobilityOSCore';
import { mobilityOSPage } from './chunks/mobilityOSPage';
import { observabilityDashboard } from './chunks/observabilityDashboard';
import { operationsOverviewPage } from './chunks/operationsOverviewPage';
import { packageReturnsPanel } from './chunks/packageReturnsPanel';
import { packageSendPanel } from './chunks/packageSendPanel';
import { packageTrackPanel } from './chunks/packageTrackPanel';
import { packagesPage } from './chunks/packagesPage';
import { waselPlusPage } from './chunks/waselPlusPage';
import { settingsPage } from './chunks/settingsPage';
import { privacySettings } from './chunks/privacySettings';
import { returnMatching } from './chunks/returnMatching';
import { findRideCard } from './chunks/findRideCard';
import { findRideTripDetailModal } from './chunks/findRideTripDetailModal';
import { offerRideFormPanel } from './chunks/offerRideFormPanel';
import { offerRideIncomingRequests } from './chunks/offerRideIncomingRequests';
import { findRidePage } from './chunks/findRidePage';
import { offerRidePage } from './chunks/offerRidePage';
import { pageShared } from './chunks/pageShared';
import { serviceFlowPlaybook } from './chunks/serviceFlowPlaybook';
import { supportPage } from './chunks/supportPage';
import { myTripsPage } from './chunks/myTripsPage';
import { insightsTab } from './chunks/insightsTab';
import { overviewTab } from './chunks/overviewTab';
import { walletActionModals } from './chunks/walletActionModals';
import { walletShared } from './chunks/walletShared';
import { configErrorPage } from './chunks/configErrorPage';
import { pageUtils } from './chunks/pageUtils';
import { waselAuth } from './chunks/waselAuth';
import { waselAuthCallback } from './chunks/waselAuthCallback';
import { waselServiceShared } from './chunks/waselServiceShared';
import { worldClassAuthPage } from './chunks/worldClassAuthPage';
import { liveGeoTracking } from './chunks/liveGeoTracking';
import { protectedOutlet } from './chunks/protectedOutlet';

export type Language = 'en' | 'ar';

export type TranslationNode = string | { [key: string]: TranslationNode };

export const translations: Record<Language, TranslationNode> = {
  en: {
    ...common.en,
    ...auth.en,
    ...landing.en,
    ...dashboard.en,
    ...header.en,
    ...sidebar.en,
    ...services.en,
    ...trips.en,
    ...messages.en,
    ...notifications.en,
    ...payments.en,
    ...settings.en,
    ...profile.en,
    ...verification.en,
    ...admin.en,
    ...legal.en,
    ...support.en,
    ...errors.en,
    ...success.en,
    ...onboarding.en,
    ...cliq.en,
    ...iraq.en,
    ...system.en,
    ...driverPageExpanded.en,
    ...profileExpanded.en,
    ...settingsExpanded.en,
    ...homeSections.en,
    ...offerRide.en,
    ...activity.en,
    ...trustCenterExpanded.en,
    ...app.en,
    ...errorBoundary.en,
    ...accountDeletionDialog.en,
    ...cookieConsentBanner.en,
    ...imageWithFallback.en,
    ...liveTripTracking.en,
    ...mapWrapper.en,
    ...pWAInstallPrompt.en,
    ...popularRoutes.en,
    ...rateDriverModal.en,
    ...appErrorBoundary.en,
    ...sessionTimeoutWarning.en,
    ...tripChat.en,
    ...tripProgressCard.en,
    ...oAuthStatus.en,
    ...waselMap.en,
    ...adminDashboardPage.en,
    ...busPage.en,
    ...driverPage.en,
    ...mobilityOSLandingMap.en,
    ...homeContent.en,
    ...conversionSections.en,
    ...homeHeroSection.en,
    ...privacyPolicy.en,
    ...securityPage.en,
    ...termsOfService.en,
    ...corridorCard.en,
    ...mobilityOSCore.en,
    ...mobilityOSPage.en,
    ...observabilityDashboard.en,
    ...operationsOverviewPage.en,
    ...packageReturnsPanel.en,
    ...packageSendPanel.en,
    ...packageTrackPanel.en,
    ...packagesPage.en,
    ...waselPlusPage.en,
    ...settingsPage.en,
    ...privacySettings.en,
    ...returnMatching.en,
    ...findRideCard.en,
    ...findRideTripDetailModal.en,
    ...offerRideFormPanel.en,
    ...offerRideIncomingRequests.en,
    ...findRidePage.en,
    ...offerRidePage.en,
    ...pageShared.en,
    ...serviceFlowPlaybook.en,
    ...supportPage.en,
    ...myTripsPage.en,
    ...insightsTab.en,
    ...overviewTab.en,
    ...walletActionModals.en,
    ...walletShared.en,
    ...configErrorPage.en,
    ...pageUtils.en,
    ...waselAuth.en,
    ...waselAuthCallback.en,
    ...waselServiceShared.en,
    ...worldClassAuthPage.en,
    ...liveGeoTracking.en,
    ...protectedOutlet.en,
  },
  ar: {
    ...common.ar,
    ...auth.ar,
    ...landing.ar,
    ...dashboard.ar,
    ...header.ar,
    ...sidebar.ar,
    ...services.ar,
    ...trips.ar,
    ...messages.ar,
    ...notifications.ar,
    ...payments.ar,
    ...settings.ar,
    ...profile.ar,
    ...verification.ar,
    ...admin.ar,
    ...legal.ar,
    ...support.ar,
    ...errors.ar,
    ...success.ar,
    ...onboarding.ar,
    ...cliq.ar,
    ...iraq.ar,
    ...system.ar,
    ...driverPageExpanded.ar,
    ...profileExpanded.ar,
    ...settingsExpanded.ar,
    ...homeSections.ar,
    ...offerRide.ar,
    ...activity.ar,
    ...trustCenterExpanded.ar,
    ...app.ar,
    ...errorBoundary.ar,
    ...accountDeletionDialog.ar,
    ...cookieConsentBanner.ar,
    ...imageWithFallback.ar,
    ...liveTripTracking.ar,
    ...mapWrapper.ar,
    ...pWAInstallPrompt.ar,
    ...popularRoutes.ar,
    ...rateDriverModal.ar,
    ...appErrorBoundary.ar,
    ...sessionTimeoutWarning.ar,
    ...tripChat.ar,
    ...tripProgressCard.ar,
    ...oAuthStatus.ar,
    ...waselMap.ar,
    ...adminDashboardPage.ar,
    ...busPage.ar,
    ...driverPage.ar,
    ...mobilityOSLandingMap.ar,
    ...homeContent.ar,
    ...conversionSections.ar,
    ...homeHeroSection.ar,
    ...privacyPolicy.ar,
    ...securityPage.ar,
    ...termsOfService.ar,
    ...corridorCard.ar,
    ...mobilityOSCore.ar,
    ...mobilityOSPage.ar,
    ...observabilityDashboard.ar,
    ...operationsOverviewPage.ar,
    ...packageReturnsPanel.ar,
    ...packageSendPanel.ar,
    ...packageTrackPanel.ar,
    ...packagesPage.ar,
    ...waselPlusPage.ar,
    ...settingsPage.ar,
    ...privacySettings.ar,
    ...returnMatching.ar,
    ...findRideCard.ar,
    ...findRideTripDetailModal.ar,
    ...offerRideFormPanel.ar,
    ...offerRideIncomingRequests.ar,
    ...findRidePage.ar,
    ...offerRidePage.ar,
    ...pageShared.ar,
    ...serviceFlowPlaybook.ar,
    ...supportPage.ar,
    ...myTripsPage.ar,
    ...insightsTab.ar,
    ...overviewTab.ar,
    ...walletActionModals.ar,
    ...walletShared.ar,
    ...configErrorPage.ar,
    ...pageUtils.ar,
    ...waselAuth.ar,
    ...waselAuthCallback.ar,
    ...waselServiceShared.ar,
    ...worldClassAuthPage.ar,
    ...liveGeoTracking.ar,
    ...protectedOutlet.ar,
  },
};

export { type Language, type TranslationNode };
