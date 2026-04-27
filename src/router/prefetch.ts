const routeModuleLoaders = {
  auth: () => import('../pages/WaselAuth'),
  findRide: () => import('../features/rides/FindRidePage'),
  offerRide: () => import('../features/rides/OfferRidePage'),
  packages: () => import('../features/packages/PackagesPage'),
  payments: () => import('../features/payments/PaymentsPage'),
  settings: () => import('../features/preferences/SettingsPage'),
  wallet: () => import('../features/wallet'),
} as const;

export type PrefetchableRouteModule = keyof typeof routeModuleLoaders;

const prefetchedModules = new Set<PrefetchableRouteModule>();

export async function prefetchRouteModule(routeModule: PrefetchableRouteModule) {
  if (prefetchedModules.has(routeModule)) {
    return;
  }

  await routeModuleLoaders[routeModule]();
  prefetchedModules.add(routeModule);
}

export async function prefetchRouteModules(routeModules: readonly PrefetchableRouteModule[]) {
  await Promise.allSettled(routeModules.map((routeModule) => prefetchRouteModule(routeModule)));
}
