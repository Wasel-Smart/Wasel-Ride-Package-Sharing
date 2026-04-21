import { getConfig } from './env';

type RouteSeo = {
  title: string;
  description: string;
  robots: string;
  canonicalUrl: string;
  structuredData: Record<string, unknown> | null;
};

type StaticRouteSeoInput = {
  title: string;
  description: string;
  robots?: string;
  indexable?: boolean;
};

const APP_ROUTE_SEO: Record<string, StaticRouteSeoInput> = {
  '/app': {
    title: 'Wasel App',
    description: 'Authenticated Wasel workspace for mobility, payments, logistics, and profile operations.',
  },
  '/app/auth': {
    title: 'Sign In',
    description: 'Secure authentication gateway for Wasel riders, drivers, and operators.',
  },
  '/app/auth/callback': {
    title: 'Authentication Callback',
    description: 'Completes secure Wasel authentication and restores the intended route.',
  },
  '/app/find-ride': {
    title: 'Find Ride',
    description: 'Search shared routes, compare seat options, and continue inside the authenticated Wasel rider workspace.',
  },
  '/app/offer-ride': {
    title: 'Offer Ride',
    description: 'Publish shared route availability and manage departures inside the authenticated Wasel driver workspace.',
  },
  '/app/my-trips': {
    title: 'My Trips',
    description: 'Review ride bookings, package movements, and traveler activity inside the Wasel app.',
  },
  '/app/live-trip': {
    title: 'Live Trip',
    description: 'Track an active Wasel trip and related rider coordination details.',
  },
  '/app/routes': {
    title: 'Popular Routes',
    description: 'Review common Wasel corridors and network demand trends inside the authenticated experience.',
  },
  '/app/bus': {
    title: 'Bus Network',
    description: 'Manage and explore Wasel bus journeys, corridors, and availability.',
  },
  '/app/packages': {
    title: 'Packages',
    description: 'Coordinate parcel movements, tracking, and delivery states inside Wasel.',
  },
  '/app/package-delivery': {
    title: 'Package Delivery',
    description: 'Secure package delivery coordination with authenticated Wasel logistics workflows.',
  },
  '/app/innovation-hub': {
    title: 'Innovation Hub',
    description: 'Internal Wasel product and experimentation surface for authenticated operators.',
  },
  '/app/analytics': {
    title: 'Analytics',
    description: 'Operational analytics dashboard for Wasel internal teams.',
  },
  '/app/execution-os': {
    title: 'Execution OS',
    description: 'Internal Wasel execution workspace for operations monitoring and response.',
  },
  '/app/mobility-os': {
    title: 'Mobility OS',
    description: 'Authenticated Wasel mobility orchestration workspace.',
  },
  '/app/ai-intelligence': {
    title: 'AI Intelligence',
    description: 'Internal Wasel AI and automation control surface for authenticated teams.',
  },
  '/app/wallet': {
    title: 'Wallet',
    description: 'Secure stored-value, payout, and escrow controls for authenticated Wasel users.',
  },
  '/app/payments': {
    title: 'Payments',
    description: 'Backend-managed payment intents, verification, and settlement tracking for Wasel.',
  },
  '/app/plus': {
    title: 'Wasel Plus',
    description: 'Membership and subscription workspace for authenticated Wasel users.',
  },
  '/app/profile': {
    title: 'Profile',
    description: 'Manage verified identity, contact details, and trust posture inside Wasel.',
  },
  '/app/settings': {
    title: 'Settings',
    description: 'Adjust Wasel account settings, security preferences, and communication controls.',
  },
  '/app/notifications': {
    title: 'Notifications',
    description: 'Review alerts, payment notices, and operational messages inside Wasel.',
  },
  '/app/trust': {
    title: 'Trust Center',
    description: 'Wasel trust, safety, and verification guidance for authenticated users.',
  },
  '/app/driver': {
    title: 'Driver Workspace',
    description: 'Authenticated driver tools, status, and route readiness controls inside Wasel.',
  },
  '/app/safety': {
    title: 'Safety',
    description: 'Safety procedures, incident readiness, and protective controls inside the Wasel app.',
  },
  '/app/privacy': {
    title: 'Privacy Policy',
    description: 'Wasel privacy policy covering data handling, security, and communication practices.',
    robots: 'index, follow',
    indexable: true,
  },
  '/app/terms': {
    title: 'Terms of Service',
    description: 'Wasel terms of service covering access, usage rules, payments, and account responsibilities.',
    robots: 'index, follow',
    indexable: true,
  },
  '/app/moderation': {
    title: 'Moderation',
    description: 'Internal moderation workflow for Wasel trust and abuse response teams.',
  },
};

function normalizePath(pathname: string): string {
  if (!pathname) {
    return '/app';
  }

  const normalized = pathname.trim();
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1);
  }

  return normalized || '/app';
}

function toCanonicalUrl(pathname: string): string {
  const { appUrl } = getConfig();
  const baseUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;
  return new URL(pathname.replace(/^\//, ''), baseUrl).toString();
}

function buildStructuredData(pathname: string, seo: StaticRouteSeoInput, canonicalUrl: string) {
  if (!seo.indexable) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${seo.title} | Wasel`,
    description: seo.description,
    url: canonicalUrl,
    inLanguage: ['en-JO', 'ar-JO'],
    isPartOf: {
      '@id': `${getConfig().appUrl.replace(/\/$/, '')}/#website`,
    },
    about: pathname === '/app/privacy'
      ? { '@type': 'Thing', name: 'Privacy Policy' }
      : pathname === '/app/terms'
        ? { '@type': 'Thing', name: 'Terms of Service' }
        : undefined,
  };
}

function upsertMeta(selector: string, attribute: 'name' | 'property', value: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, selector.includes('"')
      ? selector.split('"')[1] ?? attribute
      : attribute);
    document.head.appendChild(element);
  }

  element.setAttribute('content', value);
}

function upsertNamedMeta(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertPropertyMeta(property: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertStructuredDataScript(data: Record<string, unknown> | null): void {
  const existing = document.getElementById('wasel-route-schema');
  if (!data) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.id = 'wasel-route-schema';
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(script);
  }
}

export function getAppRouteSeo(pathname: string): RouteSeo {
  const normalizedPath = normalizePath(pathname);
  const staticSeo = APP_ROUTE_SEO[normalizedPath] ?? {
    title: 'Wasel App',
    description: 'Authenticated Wasel application workspace.',
  };
  const canonicalUrl = toCanonicalUrl(normalizedPath);
  const robots = staticSeo.robots ?? 'noindex, nofollow';

  return {
    title: `${staticSeo.title} | Wasel`,
    description: staticSeo.description,
    robots,
    canonicalUrl,
    structuredData: buildStructuredData(normalizedPath, staticSeo, canonicalUrl),
  };
}

export function applyAppRouteSeo(pathname: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const seo = getAppRouteSeo(pathname);
  document.title = seo.title;
  upsertNamedMeta('description', seo.description);
  upsertNamedMeta('robots', seo.robots);
  upsertPropertyMeta('og:title', seo.title);
  upsertPropertyMeta('og:description', seo.description);
  upsertPropertyMeta('og:url', seo.canonicalUrl);
  upsertNamedMeta('twitter:title', seo.title);
  upsertNamedMeta('twitter:description', seo.description);
  upsertCanonical(seo.canonicalUrl);
  upsertStructuredDataScript(seo.structuredData);
}
