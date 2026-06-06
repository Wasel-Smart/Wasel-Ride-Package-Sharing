import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { C, SectionHeader, glass } from '../HomePageShared';
import { R, SH } from '../../../utils/wasel-ds';
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
        title={ar ? 'مسارات جاهزة الآن' : 'Corridors ready now'}
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
            type="button"
            key={card.key}
            onClick={() => onNavigate(card.path)}
            style={{
              textAlign: 'left',
              borderRadius: R.xxl,
              padding: '20px 18px 18px',
              background: card.featured
                ? `linear-gradient(180deg, ${C.cyanDim}, ${C.card})`
                : glass(0.52),
              border: `1px solid ${card.featured ? C.cyanDim : C.border}`,
              cursor: 'pointer',
              boxShadow: card.featured ? SH.card : SH.none,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: R.full,
                  background: C.elevated,
                  border: `1px solid ${C.borderFaint}`,
                  color: card.accent,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
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
                {card.featured ? (ar ? 'أفضل الآن' : 'Best now') : card.meta}
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: '1.05rem',
                fontWeight: 900,
                lineHeight: 1.18,
                letterSpacing: '-0.02em',
                color: C.text,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                marginTop: 8,
                color: C.textMuted,
                lineHeight: 1.65,
                fontSize: '0.84rem',
              }}
            >
              {card.detail}
            </div>
            {card.insight ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${C.borderFaint}`,
                  color: C.textSub,
                  fontSize: '0.76rem',
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
                fontSize: '0.78rem',
              }}
            >
              {ar ? 'افتح هذا المسار' : 'Open this corridor'}
              <ArrowRight size={13} />
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
