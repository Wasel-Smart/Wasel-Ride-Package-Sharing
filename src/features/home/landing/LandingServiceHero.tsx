import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { LANDING_COLORS, landingPanel } from './landingTypes';
import { LANDING_DISPLAY, LANDING_FONT } from '../landingConstants';

interface LandingServiceHeroItem {
  icon: ReactNode;
  title: string;
  detail: string;
}

interface LandingServiceHeroStat {
  label: string;
  value: string;
}

interface LandingServiceHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  highlights: LandingServiceHeroItem[];
  stats: LandingServiceHeroStat[];
  ctaLabel: string;
}

export function LandingServiceHero({
  eyebrow,
  title,
  description,
  highlights,
  stats,
  ctaLabel,
}: LandingServiceHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="landing-hero-shell"
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 22,
        alignItems: 'stretch',
      }}
    >
      <div
        className="landing-glow-card"
        style={{
          ...landingPanel(34),
          padding: 'clamp(24px, 4vw, 40px)',
          display: 'grid',
          gap: 18,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            width: 'fit-content',
            borderRadius: 999,
            border: `1px solid ${LANDING_COLORS.border}`,
            padding: '8px 14px',
            color: LANDING_COLORS.cyan,
            fontFamily: LANDING_FONT,
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          {eyebrow}
        </span>

        <div style={{ display: 'grid', gap: 12 }}>
          <h1
            style={{
              margin: 0,
              color: LANDING_COLORS.text,
              fontFamily: LANDING_DISPLAY,
              fontSize: 'clamp(2.3rem, 6vw, 4.8rem)',
              lineHeight: 0.96,
              letterSpacing: '-0.04em',
              maxWidth: 720,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              color: LANDING_COLORS.muted,
              fontFamily: LANDING_FONT,
              fontSize: '1.05rem',
              lineHeight: 1.75,
              maxWidth: 640,
            }}
          >
            {description}
          </p>
        </div>

        <div
          className="landing-hero-highlights"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {highlights.map((highlight, index) => (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.12 + index * 0.06 }}
              style={{
                borderRadius: 24,
                border: `1px solid ${LANDING_COLORS.border}`,
                background: 'rgba(255,255,255,0.04)',
                padding: 18,
                display: 'grid',
                gap: 10,
              }}
            >
              {highlight.icon}
              <div
                style={{
                  color: LANDING_COLORS.text,
                  fontFamily: LANDING_FONT,
                  fontSize: '0.92rem',
                  fontWeight: 800,
                }}
              >
                {highlight.title}
              </div>
              <div
                style={{
                  color: LANDING_COLORS.muted,
                  fontFamily: LANDING_FONT,
                  fontSize: '0.82rem',
                  lineHeight: 1.6,
                }}
              >
                {highlight.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div
        style={{
          ...landingPanel(34),
          padding: 'clamp(22px, 3vw, 30px)',
          display: 'grid',
          gap: 16,
          alignContent: 'start',
        }}
      >
        <div
          style={{
            color: LANDING_COLORS.soft,
            fontFamily: LANDING_FONT,
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Today on Wasel
        </div>
        {stats.map(metric => (
          <div
            key={metric.label}
            style={{
              borderRadius: 24,
              border: `1px solid ${LANDING_COLORS.border}`,
              background: 'rgba(255,255,255,0.05)',
              padding: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                color: LANDING_COLORS.muted,
                fontFamily: LANDING_FONT,
                fontSize: '0.84rem',
              }}
            >
              {metric.label}
            </span>
            <span
              style={{
                color: LANDING_COLORS.text,
                fontFamily: LANDING_DISPLAY,
                fontSize: '1.2rem',
                fontWeight: 700,
              }}
            >
              {metric.value}
            </span>
          </div>
        ))}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: LANDING_COLORS.cyan,
            fontFamily: LANDING_FONT,
            fontWeight: 800,
          }}
        >
          {ctaLabel}
          <ArrowRight size={16} />
        </div>
      </div>
    </motion.section>
  );
}
