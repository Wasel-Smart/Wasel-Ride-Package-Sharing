/**
 * landing/LandingPageFrame.tsx
 *
 * Root shell that wraps the entire landing page with the aurora background,
 * responsive styles, and the max-width container.
 */
import type { ReactNode } from 'react';
import { LANDING_FONT, LANDING_RESPONSIVE_STYLES } from '../landingConstants';
import { GRAD_AURORA, GRAD_HERO } from '../../../utils/wasel-ds';
import { LANDING_COLORS } from './landingTypes';

type LandingPageFrameProps = { children: ReactNode };

export function LandingPageFrame({ children }: LandingPageFrameProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--wasel-shell-background)',
        color: LANDING_COLORS.text,
        fontFamily: LANDING_FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{LANDING_RESPONSIVE_STYLES}</style>

      {/* Hero gradient layer */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: GRAD_HERO, pointerEvents: 'none' }}
      />

      {/* Aurora + radial accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--ds-accent, #f59a2c) 18%, transparent), transparent 26%), radial-gradient(circle at 72% 68%, color-mix(in srgb, var(--ds-accent-strong, #ffb357) 14%, transparent), transparent 18%)`,
          pointerEvents: 'none',
          opacity: 0.96,
        }}
      />

      {/* Edge screen-blend vignette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 84%, rgba(255,255,255,0.03) 100%)',
          opacity: 0.28,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      <div
        className="landing-shell"
        style={{
          position: 'relative',
          maxWidth: 'var(--wasel-layout-max-width)',
          margin: '0 auto',
          padding:
            'var(--wasel-layout-top) var(--wasel-layout-inline) var(--wasel-layout-bottom)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
