const APP_ROUTE_PREFIX = '/app' as const;

function defineAppRoute<Child extends string>(child: Child) {
  return {
    child,
    full: (child ? `${APP_ROUTE_PREFIX}/${child}` : APP_ROUTE_PREFIX) as Child extends ''
      ? typeof APP_ROUTE_PREFIX
      : `${typeof APP_ROUTE_PREFIX}/${Child}`,
  };
}

export const APP_ROUTES = {
  root: defineAppRoute(''),
  auth: defineAppRoute('auth'),
  authCallback: defineAppRoute('auth/callback'),
  profile: defineAppRoute('profile'),
  notifications: defineAppRoute('notifications'),
  findRide: defineAppRoute('find-ride'),
  rideDetails: defineAppRoute('find-ride/:rideId'),
  offerRide: defineAppRoute('offer-ride'),
  createRide: defineAppRoute('create-ride'),
  myTrips: defineAppRoute('my-trips'),
  tripsLegacy: defineAppRoute('trips'),
  packages: defineAppRoute('packages'),
  bus: defineAppRoute('bus'),
  driver: defineAppRoute('driver'),
  trust: defineAppRoute('trust'),
  safety: defineAppRoute('safety'),
  mobilityOs: defineAppRoute('mobility-os'),
  wallet: defineAppRoute('wallet'),
  payments: defineAppRoute('payments'),
  settings: defineAppRoute('settings'),
  analytics: defineAppRoute('analytics'),
  moderation: defineAppRoute('moderation'),
  aiIntelligence: defineAppRoute('ai-intelligence'),
  executionOs: defineAppRoute('execution-os'),
  servicesCorporate: defineAppRoute('services/corporate'),
  servicesSchool: defineAppRoute('services/school'),
  admin: defineAppRoute('admin'),
  privacy: defineAppRoute('privacy'),
  terms: defineAppRoute('terms'),
  dashboard: defineAppRoute('dashboard'),
  home: defineAppRoute('home'),
  postRide: defineAppRoute('post-ride'),
  newRide: defineAppRoute('new-ride'),
  routes: defineAppRoute('routes'),
  packageDelivery: defineAppRoute('package-delivery'),
} as const;

const canonicalBarePrefixes = Object.values(APP_ROUTES)
  .map((route) => route.child)
  .filter((child) => child.length > 0)
  .map((child) => `/${child}`);

export const APP_ROUTE_BARE_PREFIXES: readonly string[] = [
  ...canonicalBarePrefixes,
  '/booking-requests',
  '/live-trip',
  '/awasel',
  '/raje3',
  '/services',
  '/legal',
];

export function stripAppRoutePrefix(path: string): string {
  if (path === APP_ROUTE_PREFIX) {
    return '/';
  }

  return path.startsWith(`${APP_ROUTE_PREFIX}/`)
    ? path.slice(APP_ROUTE_PREFIX.length)
    : path;
}
