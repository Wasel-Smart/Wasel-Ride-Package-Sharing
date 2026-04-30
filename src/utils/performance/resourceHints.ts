/**
 * Resource Hints Manager — Performance Optimization
 * 
 * Manages preload, prefetch, preconnect, and dns-prefetch hints
 * for optimal resource loading.
 */

export type HintType = 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch';

export interface ResourceHint {
  href: string;
  as?: string;
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

class ResourceHintsManager {
  private addedHints = new Set<string>();

  addHint(type: HintType, hint: ResourceHint): void {
    const key = `${type}:${hint.href}`;
    if (this.addedHints.has(key)) return;

    const link = document.createElement('link');
    link.rel = type;
    link.href = hint.href;
    
    if (hint.as) link.setAttribute('as', hint.as);
    if (hint.type) link.setAttribute('type', hint.type);
    if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin;
    
    document.head.appendChild(link);
    this.addedHints.add(key);
  }

  preloadScript(src: string): void {
    this.addHint('preload', { href: src, as: 'script' });
  }

  preloadStyle(href: string): void {
    this.addHint('preload', { href, as: 'style' });
  }

  preloadFont(href: string, type = 'font/woff2'): void {
    this.addHint('preload', { href, as: 'font', type, crossOrigin: 'anonymous' });
  }

  preloadImage(src: string): void {
    this.addHint('preload', { href: src, as: 'image' });
  }

  prefetchPage(href: string): void {
    this.addHint('prefetch', { href, as: 'document' });
  }

  preconnect(origin: string): void {
    this.addHint('preconnect', { href: origin, crossOrigin: 'anonymous' });
  }

  dnsPrefetch(origin: string): void {
    this.addHint('dns-prefetch', { href: origin });
  }

  preconnectCriticalOrigins(): void {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      this.preconnect(new URL(supabaseUrl).origin);
    }

    const cdnOrigins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ];
    
    cdnOrigins.forEach(origin => {
      this.preconnect(origin);
      this.dnsPrefetch(origin);
    });
  }

  prefetchCriticalRoutes(): void {
    const criticalRoutes = [
      '/app/find-ride',
      '/app/wallet',
      '/app/my-trips',
    ];
    
    criticalRoutes.forEach(route => this.prefetchPage(route));
  }
}

export const resourceHints = new ResourceHintsManager();
