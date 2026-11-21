import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const SITE_NAME = 'Wasel';
const OG_IMAGE = 'https://wasel14.online/brand/assets/og/og-default.png';

export interface SeoMeta {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

/** Branded, bilingual page title: "Find Ride | Wasel" / "ابحث عن رحلة | واصل". */
export function formatSeoTitle(rawTitle: string | undefined, ar: boolean): string | undefined {
  if (!rawTitle) {return undefined;}
  return ar ? `${rawTitle} | واصل` : `${rawTitle} | ${SITE_NAME}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content?: string) {
  if (!content) {return;}
  let element = document.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertHreflang(hreflang: string, href: string) {
  let element = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'alternate');
    document.head.appendChild(element);
  }
  element.setAttribute('hreflang', hreflang);
  element.setAttribute('href', href);
}

export function useSeo(meta?: SeoMeta) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  useEffect(() => {
    if (!meta || typeof document === 'undefined') {return;}

    const title = formatSeoTitle(ar ? meta.titleAr : meta.title, ar);
    const description = ar ? meta.descriptionAr : meta.description;
    const canonical = meta.canonical || window.location.href;

    if (title) {
      document.title = title;
    }

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', meta.ogImage || OG_IMAGE);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', meta.ogImage || OG_IMAGE);

    // Locale-aware social metadata so share cards render in the active language.
    upsertMeta('property', 'og:locale', ar ? 'ar_JO' : 'en_JO');
    upsertMeta('property', 'og:locale:alternate', ar ? 'en_JO' : 'ar_JO');

    // hreflang alternates follow the canonical URL (the SPA serves EN/AR from
    // one URL, switched client-side).
    upsertHreflang('en', canonical);
    upsertHreflang('ar', canonical);
    upsertHreflang('x-default', canonical);

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (meta.canonical) {
      if (canonicalEl) {
        canonicalEl.setAttribute('href', meta.canonical);
      } else {
        const link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', meta.canonical);
        document.head.appendChild(link);
      }
    }

    const robotsContent = meta.noIndex ? 'noindex, nofollow' : 'index, follow';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', robotsContent);
  }, [ar, meta]);
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  // sameAs, contact email and social profiles are intentionally omitted until
  // they are real, verifiable channels — mirrors the policy in
  // src/features/home/sections/StructuredData.tsx.
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Wasel',
        alternateName: 'واصل',
        url: 'https://wasel14.online',
        logo: 'https://wasel14.online/brand/assets/logos/primary/logo-dark.png',
        areaServed: { '@type': 'Country', name: 'Jordan' },
        description: 'Wasel connects riders and drivers through shared routes to reduce travel cost across Jordan.',
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Wasel',
        alternateName: 'واصل',
        url: 'https://wasel14.online',
        inLanguage: ['en', 'ar'],
        potentialAction: {
          '@type': 'SearchAction',
          // /app/routes is the public route explorer; the search form is EN + AR.
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://wasel14.online/app/routes?from={from}&to={to}',
          },
          'query-input': 'required name=from, name=to',
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}
