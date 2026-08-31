import React, { useState } from 'react';
import { tx } from '../locales/tx';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

function generateModernSrcSet(baseSrc: string): { avif?: string; webp?: string; original: string } {
  if (!baseSrc || baseSrc.startsWith('data:')) {
    return { original: baseSrc };
  }

  const hasExtension = /\.[a-z0-9]+(?:[?#]|$)/i.test(baseSrc);
  const extension = hasExtension ? baseSrc.match(/\.([a-z0-9]+)(?:[?#]|$)/i)?.[1]?.toLowerCase() : null;
  const supportedExtensions = ['jpg', 'jpeg', 'png', 'svg', 'webp'];

  if (extension && !supportedExtensions.includes(extension)) {
    return { original: baseSrc };
  }

  const baseWithoutExt = hasExtension ? baseSrc.replace(/\.[a-z0-9]+(?:[?#]|$)/i, '') : baseSrc;
  const suffix = hasExtension ? baseSrc.match(/([?#].*)$/)?.[1] ?? '' : '';

  return {
    avif: `${baseWithoutExt}.avif${suffix}`,
    webp: `${baseWithoutExt}.webp${suffix}`,
    original: baseSrc,
  };
}

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
}

export function ImageWithFallback({
  src,
  alt,
  loading = 'lazy',
  fetchpriority = 'auto',
  style,
  className,
  ...rest
}: OptimizedImageProps) {
  const [didError, setDidError] = useState(false);
  const [useAvif, setUseAvif] = useState(true);

  const handleError = () => {
    setDidError(true);
  };

  const loadingAlt = tx('imageWithFallback.error_loading_image');
  const { avif, webp, original } = generateModernSrcSet(src);
  const hasModernFormats = Boolean(avif || webp);

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={ERROR_IMG_SRC}
            alt={loadingAlt}
            {...rest}
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  if (hasModernFormats) {
    return (
      <picture>
        {avif && useAvif && (
          <source srcSet={avif} type="image/avif" />
        )}
        {webp && (
          <source srcSet={webp} type="image/webp" />
        )}
        <img
          src={original}
          alt={alt ?? loadingAlt}
          loading={loading}
          fetchPriority={fetchpriority}
          className={className}
          style={style}
          {...rest}
          onError={() => {
            if (useAvif && avif) {
              setUseAvif(false);
            } else {
              handleError();
            }
          }}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? loadingAlt}
      loading={loading}
      fetchPriority={fetchpriority}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}
