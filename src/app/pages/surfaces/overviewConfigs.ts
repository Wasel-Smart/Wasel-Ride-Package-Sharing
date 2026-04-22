/**
 * Static configuration for every SimpleOverviewPage surface.
 *
 * Keeping this data separate from the components that render it
 * means adding or editing a page overview requires touching only
 * this file — no component logic changes needed.
 */
import type { OverviewConfig } from './pageTypes';

export const overviewConfigs = {
  analytics: {
    eyebrow: 'Corridor proof',
    title: 'Analytics dashboard',
    description: 'Read adoption, corridor pull, and route trust from one surface.',
    ctaLabel: 'Open trips',
    ctaPath: '/app/my-trips',
    cards: [
      { title: 'Demand view', detail: 'See where rides, packages, and supply keep stacking.' },
      { title: 'Proof loop', detail: 'Watch route clarity, fill rate, and repeat use in one frame.' },
      { title: 'Support load', detail: 'Track where customer friction is starting to build.' },
    ],
  },
  execution: {
    eyebrow: 'Operations',
    title: 'Execution OS',
    description: 'Coordinate field actions, support, and route decisions without changing language.',
    ctaLabel: 'Open notifications',
    ctaPath: '/app/notifications',
    cards: [
      { title: 'Field queue', detail: 'Keep the next operational move visible.' },
      { title: 'Support handoff', detail: 'Give support one source of truth for urgent cases.' },
      { title: 'Service rhythm', detail: 'Align riders, drivers, and operations around the same signal.' },
    ],
  },
  mobility: {
    eyebrow: 'Network',
    title: 'Mobility OS',
    description: 'Keep the Jordan corridor visible while you switch between flows.',
    ctaLabel: 'Open bus',
    ctaPath: '/app/bus',
    cards: [
      { title: 'Live map', detail: 'The route stays in the background instead of taking over the page.' },
      { title: 'Shared inventory', detail: 'Rides, buses, and packages read from the same network.' },
      { title: 'Decision clarity', detail: 'The next action stays obvious on every screen.' },
    ],
  },
  intelligence: {
    eyebrow: 'Signal layer',
    title: 'AI intelligence',
    description: 'Surface demand, timing, and route confidence in simple language.',
    ctaLabel: 'Open analytics',
    ctaPath: '/app/analytics',
    cards: [
      { title: 'Demand pulse', detail: 'Spot which corridor needs more supply now.' },
      { title: 'Price guide', detail: 'Keep fares understandable before a route opens.' },
      { title: 'Trust signal', detail: 'Show why one route is safer or stronger than another.' },
    ],
  },
  trust: {
    eyebrow: 'Trust',
    title: 'Trust center',
    description: 'Verification, support, and safety language now live in one system.',
    ctaLabel: 'Open settings',
    ctaPath: '/app/settings',
    cards: [
      { title: 'Verification', detail: 'Show readiness without adding extra friction.' },
      { title: 'Safety', detail: 'Keep urgent tools close to the main action.' },
      { title: 'Support', detail: 'Make the help path visible before a user asks.' },
    ],
  },
  safety: {
    eyebrow: 'Safety',
    title: 'Safety tools',
    description: 'Critical support stays visible and easy to reach across the app.',
    ctaLabel: 'Call support',
    ctaPath: '/app/settings',
    cards: [
      { title: 'Live alerts', detail: 'High-priority issues stand out fast.' },
      { title: 'Trusted contacts', detail: 'Keep emergency paths obvious.' },
      { title: 'Trip status', detail: 'Tie the safety message to the current route.' },
    ],
  },
  plus: {
    eyebrow: 'Membership',
    title: 'Wasel Plus',
    description: 'Rewards, priority support, and premium routing in the same visual language.',
    ctaLabel: 'Open wallet',
    ctaPath: '/app/wallet',
    cards: [
      { title: 'Priority help', detail: 'Reach support faster on busy corridors.' },
      { title: 'Reward loop', detail: 'Keep membership value easy to read.' },
      { title: 'Premium routing', detail: 'Show what a premium move gives the user.' },
    ],
  },
  profile: {
    eyebrow: 'Profile',
    title: 'Profile',
    description: 'Keep your account details short, trusted, and easy to update.',
    ctaLabel: 'Open settings',
    ctaPath: '/app/settings',
    cards: [
      { title: 'Account identity', detail: 'One account across rides, packages, bus, and wallet.' },
      { title: 'Verification state', detail: 'Show what is confirmed and what still needs work.' },
      { title: 'Support context', detail: 'Keep the contact path close to the profile summary.' },
    ],
  },
  notifications: {
    eyebrow: 'Alerts',
    title: 'Notifications',
    description: 'Trip, support, and wallet updates now use the same hierarchy.',
    ctaLabel: 'Open trips',
    ctaPath: '/app/my-trips',
    cards: [
      { title: 'Trip updates', detail: 'Live ride, bus, and package changes stay grouped.' },
      { title: 'Support actions', detail: 'Urgent replies stand above passive updates.' },
      { title: 'Wallet alerts', detail: 'Payment state stays direct and readable.' },
    ],
  },
  driver: {
    eyebrow: 'Driver mode',
    title: 'Driver dashboard',
    description: 'Supply, readiness, and upcoming rider actions in one place.',
    ctaLabel: 'Offer route',
    ctaPath: '/app/offer-ride',
    cards: [
      { title: 'Route supply', detail: 'Open the next route with one primary action.' },
      { title: 'Readiness', detail: 'Know what is still missing before going live.' },
      { title: 'Incoming demand', detail: 'Keep requests visible without clutter.' },
    ],
  },
  innovation: {
    eyebrow: 'Product',
    title: 'Innovation hub',
    description: 'Explore experiments without breaking the main system language.',
    ctaLabel: 'Back to landing',
    ctaPath: '/',
    cards: [
      { title: 'New patterns', detail: 'Test ideas inside the same shared structure.' },
      { title: 'Route concepts', detail: 'Keep prototypes tied to the core corridor story.' },
      { title: 'Feature proof', detail: 'Show why a new concept deserves to exist.' },
    ],
  },
  moderation: {
    eyebrow: 'Operations',
    title: 'Moderation',
    description: 'Review trust, quality, and support issues without visual noise.',
    ctaLabel: 'Open trust center',
    ctaPath: '/app/trust',
    cards: [
      { title: 'Queue first', detail: 'Make the next moderation action obvious.' },
      { title: 'Context nearby', detail: 'Put route, user, and support context together.' },
      { title: 'One decision path', detail: 'Reduce scattered moderation controls.' },
    ],
  },
} as const satisfies Record<string, OverviewConfig>;

export type OverviewConfigKey = keyof typeof overviewConfigs;
