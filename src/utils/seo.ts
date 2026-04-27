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
    description: 'Book a ride, offer a ride, or send a package in the Wasel marketplace.',
  },
  '/app/auth': {
    title: 'Sign In',
    description: 'Secure sign-in for the Wasel ride and package marketplace.',
  },
  '/app/auth/callback': {
    title: 'Authentication Callback',
    description: 'Completes secure Wasel sign-in and returns you to your trip or package flow.',
  },
  '/app/find-ride': {
    title: 'Book a Ride',
    description: 'Search routes, compare trip details, and book a ride in Wasel.',
  },
  '/app/offer-ride': {
    title: 'Offer a Ride',
    description: 'Post your trip, share seats, and manage ride requests in Wasel.',
  },
  '/app/my-trips': {
    title: 'My Trips',
    description: 'Review your booked rides, offered rides, and trip updates in Wasel.',
  },
  '/app/packages': {
    title: 'Send a Package',
    description: 'Create a package delivery, review details, and track status in Wasel.',
  },
  '/app/wallet': {
    title: 'Wallet',
    description: 'Review backend-confirmed balance, payment methods, and payment status in Wasel.',
  },
  '/app/payments': {
    title: 'Payments',
    description: 'Review payment status and retry failed payments when needed.',
  },
  '/app/privacy': {
    title: 'Privacy Policy',
    description:
      'Wasel privacy policy covering data handling, security, and communication practices.',
    robots: 'index, follow',
    indexable: true,
  },
  '/app/terms': {
    title: 'Terms of Service',
    description:
      'Wasel terms of service covering access, usage rules, payments, and account responsibilities.',
    robots: 'index, follow',
    indexable: true,
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
    about:
      pathname === '/app/privacy'
        ? { '@type': 'Thing', name: 'Privacy Policy' }
        : pathname === '/app/terms'
          ? { '@type': 'Thing', name: 'Terms of Service' }
          : undefined,
  };
}

export function upsertMeta(selector: string, attribute: 'name' | 'property', value: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(
      attribute,
      selector.includes('"') ? (selector.split('"')[1] ?? attribute) : attribute,
    );
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
    description: 'Book rides and send packages in the Wasel marketplace.',
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
