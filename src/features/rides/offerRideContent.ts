export const OFFER_RIDE_SUMMARY_METRICS = [
  { label: 'Posted rides', detail: 'Connected across the app', colorKey: 'cyan' },
  { label: 'Package-ready rides', detail: 'Visible to package search', colorKey: 'gold' },
  { label: 'Packages matched', detail: 'Matched through ride routes', colorKey: 'green' },
  { label: 'Network activity', detail: 'Tracked requests created', colorKey: 'blue' },
] as const;

export const OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS = ['small', 'medium', 'large'] as const;
