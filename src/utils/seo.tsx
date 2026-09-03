import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SeoMeta {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export function useSeo(meta: SeoMeta) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  useEffect(() => {
    if (typeof document === 'undefined') {return;}

    const title = ar ? meta.titleAr : meta.title;
    const description = ar ? meta.descriptionAr : meta.description;

    if (title) {
      document.title = title;
    }

    const updateMeta = (attr: 'name' | 'property', key: string, content?: string) => {
      if (!content) {return;}
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('name', 'description', description);
    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:url', meta.canonical || window.location.href);
    if (meta.ogImage) {
      updateMeta('property', 'og:image', meta.ogImage);
    }
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);
    if (meta.ogImage) {
      updateMeta('name', 'twitter:image', meta.ogImage);
    }

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

    if (meta.noIndex) {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    }
  }, [ar, meta]);
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Wasel',
        alternateName: 'واصل',
        url: 'https://wasel14.online',
        logo: 'https://wasel14.online/brand/og/og-default.png',
        sameAs: [
          'https://www.facebook.com/wasel.jo',
          'https://twitter.com/waseljo',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@wasel.jo',
          availableLanguage: ['English', 'Arabic'],
        },
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
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://wasel14.online/app/find-ride?q={search_term_string}',
          'query-input': 'required name=search_term_string',
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
