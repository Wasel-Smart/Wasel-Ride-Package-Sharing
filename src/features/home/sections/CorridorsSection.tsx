import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { C, SectionHeader, glass } from '../HomePageShared';
import type { CorridorCard } from './types';

interface CorridorsSectionProps {
  ar: boolean;
  corridorCards: CorridorCard[];
  onNavigate: (path: string) => void;
}

export function CorridorsSection({ ar, corridorCards, onNavigate }: CorridorsSectionProps) {
  return (
    <motion.section initial={false} style={{ marginTop: 38 }}>
      <SectionHeader
        title={ar ? 'مسارات شائعة وأسعار واضحة' : 'Popular routes with clear prices'}
        icon="R"
        action={ar ? 'عرض الرحلات' : 'Browse rides'}
        onAction={() => onNavigate('/find-ride')}
      />
      <div
        className="wasel-home-route-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {corridorCards.map(card => (
          <button
            className="wasel-home-card wasel-home-corridor-card"
            key={card.key}
            onClick={() => onNavigate(card.path)}
            style={{
              textAlign: ar ? 'right' : 'left',
              borderRadius: 18,
              padding: '20px 18px 18px',
              background: card.featured
                ? 'linear-gradient(180deg, rgba(88,221,255,0.1), rgba(255,255,255,0.035))'
                : glass(0.52),
              border: `1px solid ${card.featured ? 'rgba(88,221,255,0.22)' : C.border}`,
              cursor: 'pointer',
              boxShadow: card.featured ? '0 14px 30px rgba(0,0,0,0.16)' : 'none',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 30,
                padding: '7px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: card.accent,
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                lineHeight: 1.25,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: card.accent,
                  boxShadow: `0 0 12px ${card.accent}55`,
                }}
              />
              {card.featured ? (ar ? 'الأفضل الآن' : 'Best now') : card.meta}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: '1.06rem',
                fontWeight: 900,
                lineHeight: 1.22,
                color: C.text,
              }}
            >
              {card.title}
            </div>
            <div style={{ marginTop: 8, color: C.textMuted, lineHeight: 1.65, fontSize: '0.86rem' }}>
              {card.detail}
            </div>
            {card.insight ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${C.borderFaint}`,
                  color: C.textSub,
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                }}
              >
                {card.insight}
              </div>
            ) : null}
            <div
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: card.accent,
                fontWeight: 800,
                fontSize: '0.8rem',
              }}
            >
              {ar ? 'افتح المسار' : 'Open route'}
              <ArrowRight size={13} style={{ transform: ar ? 'scaleX(-1)' : 'none' }} aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
