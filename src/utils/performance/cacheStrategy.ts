/**
 * Cache Strategy — Wasel | واصل
 *
 * Centralised React Query cache configurations for every domain.
 * Rules:
 *   • Trip search results: 30s (real-time seat updates)
 *   • Popular routes: 24h (rarely change)
 *   • User profile: 5min
 *   • Package listings: 60s
 *   • Prayer times: 24h
 *   • Exchange rates: 1h
 *   • Admin dashboards: 15s (near-real-time)
 *
 * All stale times are defined here — never hardcoded in components.
 */

// ─── Stale Times (ms) ─────────────────────────────────────────────────────────

export const STALE_TIMES = {
  // Real-time data — refresh aggressively
  TRIP_SEARCH:         30_000,      // 30s — seats change fast
  PACKAGE_LISTINGS:    60_000,      // 1min
  ADMIN_DASHBOARDS:    15_000,      // 15s — operational monitoring
  BOOKING_STATUS:      20_000,      // 20s — time-sensitive

  // Semi-static data — moderate refresh
  USER_PROFILE:        5 * 60_000,  // 5min
  MY_TRIPS:            2 * 60_000,  // 2min
  MY_PACKAGES:         2 * 60_000,  // 2min
  NOTIFICATIONS:       60_000,      // 1min
  WALLET_BALANCE:      60_000,      // 1min
  TRIP_DETAILS:        2 * 60_000,  // 2min

  // Stable data — refresh infrequently
  POPULAR_ROUTES:      24 * 60 * 60_000,  // 24h
  PRAYER_TIMES:        24 * 60 * 60_000,  // 24h
  EXCHANGE_RATES:      60 * 60_000,        // 1h
  COUNTRY_CONFIG:      24 * 60 * 60_000,  // 24h
  SUBSCRIPTION_PLANS:  60 * 60_000,        // 1h
  REGION_CONFIG:       24 * 60 * 60_000,  // 24h
  TRUST_SCORE:         10 * 60_000,        // 10min
} as const;

// ─── GC Times (ms — how long data stays in cache after becoming unused) ───────

export const GC_TIMES = {
  TRIP_SEARCH:         5 * 60_000,   // 5min — garbage collect search results
  PACKAGE_LISTINGS:    5 * 60_000,
  POPULAR_ROUTES:      24 * 60 * 60_000,
  PRAYER_TIMES:        24 * 60 * 60_000,
  USER_PROFILE:        30 * 60_000,
  ADMIN_DASHBOARDS:    2 * 60_000,
  DEFAULT:             10 * 60_000,
} as const;

// ─── Retry Config ─────────────────────────────────────────────────────────────

export const RETRY_CONFIG = {
  /** Default: retry once with 1s delay */
  DEFAULT: { retry: 1, retryDelay: 1000 },
  /** Critical flows: retry 3 times (payment, booking) */
  CRITICAL: { retry: 3, retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000) },
  /** Read-only: retry twice */
  READ: { retry: 2, retryDelay: 500 },
  /** No retry (auth, safety SOS) */
  NONE: { retry: 0 },
} as const;

// ─── Query Key Factory ────────────────────────────────────────────────────────

/**
 * Centralised query key factory.
 * Prevents key collisions and ensures consistent invalidation.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trips.all() })
 *   useQuery({ queryKey: QUERY_KEYS.trips.search(filters), ... })
 */
export const QUERY_KEYS = {
  // ── Carpooling / Trips ──────────────────────────────────────────────────────
  trips: {
    all:        ()               => ['trips'] as const,
    search:     (filters: unknown) => ['trips', 'search', filters] as const,
    detail:     (id: string)     => ['trips', 'detail', id] as const,
    myDriverTrips:   (userId: string) => ['trips', 'driver', userId] as const,
    myPassengerTrips:(userId: string) => ['trips', 'passenger', userId] as const,
    calendar:   (userId: string, month: string) => ['trips', 'calendar', userId, month] as const,
    popular:    (country: string) => ['trips', 'popular', country] as const,
  },

  // ── Bookings ────────────────────────────────────────────────────────────────
  bookings: {
    all:        ()               => ['bookings'] as const,
    forTrip:    (tripId: string) => ['bookings', 'trip', tripId] as const,
    forUser:    (userId: string) => ['bookings', 'user', userId] as const,
    detail:     (id: string)     => ['bookings', 'detail', id] as const,
    requests:   (tripId: string) => ['bookings', 'requests', tripId] as const,
  },

  // ── Package Delivery / Packages ────────────────────────────────────────────────────────
  packages: {
    all:        ()               => ['packages'] as const,
    search:     (filters: unknown) => ['packages', 'search', filters] as const,
    detail:     (id: string)     => ['packages', 'detail', id] as const,
    sent:       (userId: string) => ['packages', 'sent', userId] as const,
    delivering: (userId: string) => ['packages', 'delivering', userId] as const,
    forTrip:    (tripId: string) => ['packages', 'trip', tripId] as const,
    tracking:   (id: string)     => ['packages', 'tracking', id] as const,
  },

  // ── User / Profile ──────────────────────────────────────────────────────────
  profile: {
    all:        ()               => ['profile'] as const,
    detail:     (userId: string) => ['profile', userId] as const,
    trustScore: (userId: string) => ['profile', 'trust', userId] as const,
    reviews:    (userId: string) => ['profile', 'reviews', userId] as const,
  },

  // ── Payments / Finance ──────────────────────────────────────────────────────
  payments: {
    methods:    (userId: string) => ['payments', 'methods', userId] as const,
    history:    (userId: string) => ['payments', 'history', userId] as const,
    wallet:     (userId: string) => ['payments', 'wallet', userId] as const,
  },

  // ── Routes / Region ─────────────────────────────────────────────────────────
  routes: {
    popular:    (country: string) => ['routes', 'popular', country] as const,
    detail:     (routeId: string) => ['routes', 'detail', routeId] as const,
    mosques:    (routeId: string) => ['routes', 'mosques', routeId] as const,
  },

  // ── Cultural / Prayer ───────────────────────────────────────────────────────
  prayer: {
    times:      (city: string, date: string) => ['prayer', city, date] as const,
    stops:      (routeId: string, departureTime: string) =>
                  ['prayer', 'stops', routeId, departureTime] as const,
  },

  // ── Region / Country ────────────────────────────────────────────────────────
  region: {
    all:        ()               => ['region'] as const,
    config:     (iso: string)    => ['region', 'config', iso] as const,
    currencies: ()               => ['region', 'currencies'] as const,
    exchangeRates: ()            => ['region', 'exchange-rates'] as const,
  },

  // ── Admin ───────────────────────────────────────────────────────────────────
  admin: {
    stats:      ()               => ['admin', 'stats'] as const,
    users:      (filters: unknown) => ['admin', 'users', filters] as const,
    liquidity:  (country: string) => ['admin', 'liquidity', country] as const,
    fraud:      ()               => ['admin', 'fraud'] as const,
    revenue:    (period: string) => ['admin', 'revenue', period] as const,
    systemHealth: ()             => ['admin', 'system-health'] as const,
  },

  // ── Notifications ───────────────────────────────────────────────────────────
  notifications: {
    all:        (userId: string) => ['notifications', userId] as const,
    unread:     (userId: string) => ['notifications', 'unread', userId] as const,
  },
} as const;

// ─── Prefetch Strategies ──────────────────────────────────────────────────────

/**
 * Routes that should be prefetched on app startup (warm critical paths).
 * Import and call `prefetchCriticalData(queryClient)` in App.tsx useEffect.
 */
export interface PrefetchTask {
  queryKey: readonly unknown[];
  staleTime: number;
  fetchFn: () => Promise<unknown>;
}

/**
 * Build the list of critical prefetch tasks.
 * Caller provides the fetch functions to avoid circular imports.
 */
export function buildCriticalPrefetchTasks(fetchers: {
  fetchPopularRoutes: (country: string) => () => Promise<unknown>;
  fetchExchangeRates: () => Promise<unknown>;
  fetchRegionConfigs: () => Promise<unknown>;
  country: string;
}): PrefetchTask[] {
  return [
    {
      queryKey: QUERY_KEYS.routes.popular(fetchers.country),
      staleTime: STALE_TIMES.POPULAR_ROUTES,
      fetchFn: fetchers.fetchPopularRoutes(fetchers.country),
    },
    {
      queryKey: QUERY_KEYS.region.exchangeRates(),
      staleTime: STALE_TIMES.EXCHANGE_RATES,
      fetchFn: fetchers.fetchExchangeRates,
    },
    {
      queryKey: QUERY_KEYS.region.all(),
      staleTime: STALE_TIMES.REGION_CONFIG,
      fetchFn: fetchers.fetchRegionConfigs,
    },
  ];
}

// ─── Mutation Side-effect Invalidations ──────────────────────────────────────

/**
 * Which query keys to invalidate after each mutation.
 * Import in mutation onSuccess handlers for consistent cache invalidation.
 */
export const MUTATION_INVALIDATIONS = {
  /** After a trip is posted */
  postTrip: (userId: string, country: string) => [
    QUERY_KEYS.trips.all(),
    QUERY_KEYS.trips.myDriverTrips(userId),
    QUERY_KEYS.routes.popular(country),
    QUERY_KEYS.admin.liquidity(country),
  ],

  /** After a booking is made */
  bookTrip: (tripId: string, userId: string) => [
    QUERY_KEYS.trips.detail(tripId),
    QUERY_KEYS.bookings.forTrip(tripId),
    QUERY_KEYS.bookings.forUser(userId),
    QUERY_KEYS.trips.myPassengerTrips(userId),
  ],

  /** After a package is posted */
  sendPackage: (userId: string, tripId?: string) => [
    QUERY_KEYS.packages.all(),
    QUERY_KEYS.packages.sent(userId),
    ...(tripId ? [QUERY_KEYS.packages.forTrip(tripId)] : []),
  ],

  /** After a package is delivered */
  deliverPackage: (packageId: string, userId: string) => [
    QUERY_KEYS.packages.detail(packageId),
    QUERY_KEYS.packages.delivering(userId),
    QUERY_KEYS.profile.trustScore(userId),
  ],

  /** After trip cancellation */
  cancelTrip: (tripId: string, userId: string, country: string) => [
    QUERY_KEYS.trips.detail(tripId),
    QUERY_KEYS.trips.myDriverTrips(userId),
    QUERY_KEYS.bookings.forTrip(tripId),
    QUERY_KEYS.admin.liquidity(country),
  ],

  /** After profile update */
  updateProfile: (userId: string) => [
    QUERY_KEYS.profile.detail(userId),
    QUERY_KEYS.profile.trustScore(userId),
  ],
} as const;

// ─── Default Query Options ────────────────────────────────────────────────────

/** Use in QueryClientProvider defaultOptions */
export const DEFAULT_QUERY_OPTIONS = {
  queries: {
    staleTime: STALE_TIMES.MY_TRIPS,
    gcTime: GC_TIMES.DEFAULT,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: RETRY_CONFIG.READ.retry,
    retryDelay: RETRY_CONFIG.READ.retryDelay,
  },
  mutations: {
    retry: RETRY_CONFIG.CRITICAL.retry,
    retryDelay: RETRY_CONFIG.CRITICAL.retryDelay,
  },
} as const;
