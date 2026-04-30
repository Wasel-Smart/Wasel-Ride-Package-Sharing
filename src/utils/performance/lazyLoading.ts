/**
 * Lazy Loading Utilities — Performance Optimization
 * 
 * Utilities for lazy loading images, components, and resources
 * using Intersection Observer API.
 */

export interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private loadedElements = new WeakSet<Element>();

  initialize(options: LazyLoadOptions = {}): void {
    if (this.observer || typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
            this.loadElement(entry.target as HTMLElement, options);
            this.loadedElements.add(entry.target);
          }
        });
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.01,
      },
    );
  }

  observe(element: HTMLElement): void {
    if (!this.observer) this.initialize();
    this.observer?.observe(element);
  }

  unobserve(element: HTMLElement): void {
    this.observer?.unobserve(element);
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private loadElement(element: HTMLElement, options: LazyLoadOptions): void {
    if (element.tagName === 'IMG') {
      this.loadImage(element as HTMLImageElement, options);
    } else if (element.dataset.lazySrc) {
      this.loadBackground(element, options);
    }
  }

  private loadImage(img: HTMLImageElement, options: LazyLoadOptions): void {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src) return;

    img.onload = () => {
      img.classList.add('loaded');
      options.onLoad?.();
    };

    img.onerror = () => {
      img.classList.add('error');
      options.onError?.(new Error(`Failed to load image: ${src}`));
    };

    if (srcset) img.srcset = srcset;
    img.src = src;
  }

  private loadBackground(element: HTMLElement, options: LazyLoadOptions): void {
    const src = element.dataset.lazySrc;
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      element.style.backgroundImage = `url(${src})`;
      element.classList.add('loaded');
      options.onLoad?.();
    };

    img.onerror = () => {
      element.classList.add('error');
      options.onError?.(new Error(`Failed to load background: ${src}`));
    };

    img.src = src;
  }
}

export const lazyLoader = new LazyLoader();

export function useLazyImage(ref: React.RefObject<HTMLImageElement>): void {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    lazyLoader.observe(element);
    return () => lazyLoader.unobserve(element);
  }, [ref]);
}

export function preloadCriticalImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
          img.src = url;
        }),
    ),
  );
}

import React from 'react';
