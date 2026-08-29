import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Route } from 'lucide-react';
import { C } from '../HomePageShared';
import type { CorridorCard } from './types';
import { tx } from '../../../locales/tx';

interface CorridorsSectionProps {
  corridorCards: CorridorCard[];
  onNavigate: (path: string, source?: string) => void;
}

export function CorridorsSection({ corridorCards, onNavigate }: CorridorsSectionProps) {
  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wasel-home-section-icon">
            <Route size={16} />
          </div>
          <h2 className="wasel-home-section-title">
            {tx('homeSections.corridorsReadyNow')}
          </h2>
        </div>
        <button className="wasel-home-section-action" onClick={() => onNavigate('/find-ride')}>
          {tx('homeSections.browseRides')}
          <ChevronRight size={12} color={C.cyan} />
        </button>
      </div>
      <div className="wasel-home-corridors">
        {corridorCards.map(card => (
          <button
            type="button"
            key={card.key}
            onClick={() => onNavigate(card.path, 'corridor_card')}
            className="wasel-home-corridor"
            style={{
              background: card.featured
                ? `linear-gradient(180deg, ${C.cyanDim}, ${C.card})`
                : undefined,
              border: `1px solid ${card.featured ? C.cyanDim : 'rgba(20,127,228,0.08)'}`,
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
              <div className="wasel-home-corridor-badge" style={{ color: card.accent, borderColor: `${card.accent}24` }}>
                <span className="wasel-home-corridor-badge-dot" style={{ background: card.accent, color: card.accent }} />
                {card.featured ? tx('homeSections.bestNow') : card.meta}
              </div>
            </div>
            <div className="wasel-home-corridor-title">{card.title}</div>
            <div className="wasel-home-corridor-detail">{card.detail}</div>
            {card.insight ? (
              <div className="wasel-home-corridor-insight">{card.insight}</div>
            ) : null}
            <div className="wasel-home-corridor-cta" style={{ color: card.accent }}>
              {tx('homeSections.openCorridor')}
              <ArrowRight size={13} />
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
