import { motion } from 'framer-motion';
import { ArrowRight, Target } from 'lucide-react';
import type { CorridorBetaPlan } from '../../../services/corridorBeta';
import { C, R, SH, TYPE } from '../../../utils/wasel-ds';
import { useLanguage } from '../../../contexts/LanguageContext';
import { tx } from '../../../locales/tx';
import { CorridorBetaCard } from './CorridorBetaCard';

interface CorridorBetaFocusSectionProps {
  ar: boolean;
  plan: CorridorBetaPlan;
  onNavigate: (path: string, source?: string) => void;
}

export function CorridorBetaFocusSection({ ar, plan, onNavigate }: CorridorBetaFocusSectionProps) {
  const lead = plan.focusCorridors[0];

  return (
    <motion.section initial={false} className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden="true" className="wasel-home-section-icon">
            <Target size={15} />
          </span>
          <div>
            <h2 className="wasel-home-section-title">
              {tx('homePage.corridor_beta_focus_title')}
            </h2>
            <p
              style={{
                margin: '5px 0 0',
                color: C.textMuted,
                fontSize: TYPE.size.sm,
                lineHeight: 1.5,
              }}
            >
              {tx('homePage.corridor_beta_focus_desc')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(lead?.path ?? '/find-ride', 'corridor_beta_focus')}
          className="wasel-home-section-action"
        >
          {tx('homePage.corridor_beta_focus_action')}
          <ArrowRight size={12} color={C.cyan} />
        </button>
      </div>

      <div className="wasel-home-corridor-beta-grid">
        {plan.focusCorridors.map(corridor => (
          <CorridorBetaCard
            key={corridor.routeId}
            corridor={corridor}
            ar={ar}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: R.xl,
          padding: '16px 18px',
          background: C.elevated,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: C.cyan,
            fontWeight: TYPE.weight.black,
          }}
        >
          {tx('homePage.corridor_beta_expand_gate')}
        </div>
        <p
          style={{ margin: '8px 0 0', color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.6 }}
        >
          {tx('homePage.corridor_beta_expand_gate_desc')}
        </p>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {plan.nextExperiment.metrics.map(metric => (
            <span
              key={metric}
              style={{
                padding: '6px 9px',
                borderRadius: R.full,
                background: C.card,
                border: `1px solid ${C.borderFaint}`,
                color: C.textSub,
                fontSize: '0.72rem',
                fontWeight: TYPE.weight.semibold,
              }}
            >
              {metric}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
