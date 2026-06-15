/**
 * Legacy compatibility barrel for routes or imports that still reference
 * WaselServicePage. Core customer pages now live in dedicated feature files.
 */

export { FindRidePage, OfferRidePage, PackagesPage } from './WaselCorePages';
export { BusPage } from '../features/bus/BusPage';
export { default as DriverPage } from '../features/driver/DriverPage';
export { default as SafetyPage } from '../features/safety/SafetyPage';
export { default as WaselPlusPage } from '../features/plus/WaselPlusPage';
export { default as ProfilePage } from '../features/profile/ProfilePage';
