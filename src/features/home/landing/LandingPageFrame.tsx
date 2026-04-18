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
          background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, rgba(22,199,242,0.18), rgba(4,18,30,0) 26%), radial-gradient(circle at 72% 68%, rgba(199,255,26,0.14), rgba(4,18,30,0) 18%)`,
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
          maxWidth: 1380,
          margin: '0 auto',
          padding: '28px 20px 84px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
