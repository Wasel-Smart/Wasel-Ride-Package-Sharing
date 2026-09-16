import { motion } from 'framer-motion';
import { ArrowRight, Target } from 'lucide-react';
import type { CorridorBetaPlan } from '../../../services/corridorBeta';
import { C, R, SH, TYPE } from '../../../utils/wasel-ds';
import { stageLabel, stageColor, corridorLabel, corridorReason, corridorNextAction, metricLabel } from './corridorBetaHelpers';

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
          <span
            aria-hidden="true"
            className="wasel-home-section-icon"
          >
            <Target size={15} />
          </span>
          <div>
            <h2 className="wasel-home-section-title">
              {ar ? 'تجربة المسارات المركزة' : 'Corridor beta focus'}
            </h2>
            <p
              style={{
                margin: '5px 0 0',
                color: C.textMuted,
                fontSize: TYPE.size.sm,
                lineHeight: 1.5,
              }}
            >
              {ar
                ? 'نضيق التجربة على 3 مسارات، نثبت الرحلات المتكررة، ثم نتوسع مساراً واحداً كل مرة.'
                : 'Narrow to three corridors, prove repeat rides, then expand one corridor at a time.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { void onNavigate(lead?.path ?? '/find-ride', 'corridor_beta_focus'); }}
          className="wasel-home-section-action"
        >
          {ar ? 'ابدأ المسار' : 'Start focus'}
          <ArrowRight size={12} color={C.cyan} />
        </button>
      </div>

      <div className="wasel-home-corridor-beta-grid">
        {plan.focusCorridors.map(corridor => {
          const accent = stageColor(corridor.stage);
          return (
            <button
              type="button"
              key={corridor.routeId}
              onClick={() => { void onNavigate(corridor.path, 'corridor_beta_card'); }}
              style={{
                minHeight: 224,
                textAlign: 'left',
                borderRadius: R.xxl,
                padding: 18,
                background: `linear-gradient(180deg, ${accent}18, ${C.card})`,
                border: `1px solid ${accent}55`,
                boxShadow: SH.sm,
                cursor: 'pointer',
                color: C.text,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: TYPE.weight.black,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: accent,
                    }}
                  >
                    {stageLabel(corridor.stage, ar)}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '1.02rem', fontWeight: TYPE.weight.black }}>
                    {corridorLabel(corridor.corridor, ar)}
                  </div>
                </div>
                <div
                  style={{
                    minWidth: 58,
                    padding: '6px 8px',
                    borderRadius: R.lg,
                    background: C.elevated,
                    border: `1px solid ${accent}44`,
                    color: accent,
                    fontWeight: TYPE.weight.black,
                    textAlign: 'center',
                  }}
                >
                  {corridor.proofScore}
                </div>
              </div>

              <div
                style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
              >
                <div style={{ padding: 10, borderRadius: R.lg, background: C.elevated }}>
                  <div
                    style={{
                      color: C.textMuted,
                      fontSize: '0.66rem',
                      fontWeight: TYPE.weight.semibold,
                    }}
                  >
                    {ar ? 'رحلات/أسبوع' : 'Rides/week'}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: TYPE.weight.black }}>
                    {corridor.weeklyRides}/{corridor.weeklyRideGoal}
                  </div>
                </div>
                <div style={{ padding: 10, borderRadius: R.lg, background: C.elevated }}>
                  <div
                    style={{
                      color: C.textMuted,
                      fontSize: '0.66rem',
                      fontWeight: TYPE.weight.semibold,
                    }}
                  >
                    {ar ? 'التكرار' : 'Repeat'}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: TYPE.weight.black }}>
                    {Math.round(corridor.repeatRideRate * 100)}%
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin: '14px 0 0',
                  color: C.textMuted,
                  fontSize: TYPE.size.sm,
                  lineHeight: 1.55,
                }}
              >
                {corridorReason(corridor.reason, ar)}
              </p>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${C.borderFaint}`,
                  color: accent,
                  fontSize: '0.76rem',
                  fontWeight: TYPE.weight.bold,
                  lineHeight: 1.45,
                }}
              >
                {corridorNextAction(corridor.nextAction, ar)}
              </div>
            </button>
          );
        })}
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
          {ar ? 'بوابة التوسع' : 'Expansion gate'}
        </div>
        <p
          style={{ margin: '8px 0 0', color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.6 }}
        >
          {ar
            ? 'لا تنتقل لمسار جديد إلا بعد تحقيق الرحلات الأسبوعية، التكرار، ثبات العرض، وثلاثة أسابيع متتالية. بعد ذلك يتكرر نفس المسار للتوسع اللانهائي داخل شبكة المسارات.'
            : 'Do not open a new corridor until weekly rides, repeat rate, supply reliability, and three consecutive weeks are proven. Then repeat the same gate as the corridor graph expands.'}
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
              {ar ? metricLabel(metric, true) : metric}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
