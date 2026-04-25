/**
 * Static configuration for any remaining generic overview surfaces.
 *
 * Only core marketplace flows belong here.
 */
import type { OverviewConfig } from './pageTypes';

export const overviewConfigs = {
  rides: {
    eyebrow: 'Ride',
    title: 'Book a ride',
    description: 'Find a ride, compare trip details, and confirm from one place.',
    ctaLabel: 'Find a ride',
    ctaPath: '/app/find-ride',
    cards: [
      { title: 'Search routes', detail: 'Choose your cities and check live ride availability.' },
      { title: 'Review trip details', detail: 'Compare time, price, and seat availability before booking.' },
      { title: 'Confirm booking', detail: 'Book only when the backend confirms the trip.' },
    ],
  },
  packages: {
    eyebrow: 'Package',
    title: 'Send a package',
    description: 'Create a package request, review delivery details, and track the handoff.',
    ctaLabel: 'Send a package',
    ctaPath: '/app/packages',
    cards: [
      { title: 'Create delivery', detail: 'Add pickup, drop-off, and recipient details.' },
      { title: 'Match a ride', detail: 'Use active routes when delivery is available.' },
      { title: 'Track status', detail: 'See delivery updates without leaving the marketplace.' },
    ],
  },
  wallet: {
    eyebrow: 'Wallet',
    title: 'Wallet',
    description: 'Review balance, payment methods, and payment status from the backend.',
    ctaLabel: 'Open wallet',
    ctaPath: '/app/wallet',
    cards: [
      { title: 'Check balance', detail: 'See live wallet data from the backend.' },
      { title: 'Review payment methods', detail: 'Use saved cards or wallet balance when available.' },
      { title: 'Retry failed payments', detail: 'If a payment fails, stop and retry instead of simulating success.' },
    ],
  },
} as const satisfies Record<string, OverviewConfig>;

export type OverviewConfigKey = keyof typeof overviewConfigs;
