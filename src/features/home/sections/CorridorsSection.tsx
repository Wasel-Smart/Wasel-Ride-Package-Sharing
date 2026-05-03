import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { C, SectionHeader, glass } from '../HomePageShared';
import type { CorridorCard } from './types';

interface CorridorsSectionProps {
  ar: boolean;
  corridorCards: CorridorCard[];
  onNavigate: (path: string) => void;
}

export function CorridorsSection({
  ar,
  corridorCards,
  onNavigate,
}: CorridorsSectionProps) {
  return (
    <motion.section
      initial={false}
      style={{ marginTop: 34 }}
    >
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
          gap: 12,
        }}
      >
        {corridorCards.map((card, index) => (
          <button
            key={card.key}
            onClick={() => onNavigate(card.path)}
            style={{
              textAlign: 'left',
              borderRadius: 22,
              padding: '18px 16px 16px',
              background:
                index === 0
                  ? 'linear-gradient(180deg, rgba(0,200,232,0.12), rgba(255,255,255,0.03))'
                  : glass(0.44),
              border: `1px solid ${index === 0 ? 'rgba(0,200,232,0.22)' : C.border}`,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: card.accent,
              }}
            >
              {card.meta}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: '1rem',
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                marginTop: 8,
                color: C.textMuted,
                lineHeight: 1.65,
                fontSize: '0.8rem',
              }}
            >
              {card.detail}
            </div>
            <div
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: card.accent,
                fontWeight: 800,
                fontSize: '0.75rem',
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
