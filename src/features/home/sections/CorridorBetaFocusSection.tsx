import { motion } from 'framer-motion';
import { ArrowRight, Target } from 'lucide-react';
import type { CorridorBetaPlan } from '../../../services/corridorBeta';
import { C, R, SH, TYPE } from '../../../utils/wasel-ds';

interface CorridorBetaFocusSectionProps {
  ar: boolean;
  plan: CorridorBetaPlan;
  onNavigate: (path: string, source?: string) => void;
}

function stageLabel(stage: CorridorBetaPlan['focusCorridors'][number]['stage'], ar: boolean) {
  if (stage === 'expand') return ar ? 'جاهز للتوسع' : 'Ready to expand';
  if (stage === 'prove') return ar ? 'اثبت التكرار' : 'Prove repeat rides';
  return ar ? 'ضيّق التركيز' : 'Narrow focus';
}

function stageColor(stage: CorridorBetaPlan['focusCorridors'][number]['stage']) {
  if (stage === 'expand') return C.green;
  if (stage === 'prove') return C.gold;
  return C.cyan;
}

function metricLabel(label: string, ar: boolean) {
  if (label === 'weekly rides') return ar ? 'رحلات أسبوعية' : 'weekly rides';
  if (label === 'repeat ride rate') return ar ? 'نسبة التكرار' : 'repeat ride rate';
  if (label === 'supply reliability') return ar ? 'ثبات العرض' : 'supply reliability';
  return ar ? 'ثبات ثلاث أسابيع' : 'three-week consistency';
}

const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان',
  Aqaba: 'العقبة',
  Irbid: 'إربد',
  Zarqa: 'الزرقاء',
  'Dead Sea': 'البحر الميت',
  Karak: 'الكرك',
  Madaba: 'مادبا',
  Petra: 'البتراء',
  Jerash: 'جرش',
  Mafraq: 'المفرق',
  Salt: 'السلط',
};

function corridorLabel(label: string, ar: boolean) {
  if (!ar) return label;
  const [from, to] = label.split(' to ');
  if (!from || !to) return label;
  return `${CITY_LABELS_AR[from] ?? from} إلى ${CITY_LABELS_AR[to] ?? to}`;
}

function corridorReason(label: string, ar: boolean) {
  if (!ar) return label;
  if (label === 'Observed ride data clears the corridor expansion gate.') {
    return 'بيانات الرحلات المرصودة تجاوزت بوابة توسيع المسار.';
  }
  if (
    label ===
    'This corridor is ready for controlled expansion because rides, repeat behavior, and supply are all stable.'
  ) {
    return 'هذا المسار جاهز لتوسع مضبوط لأن الرحلات والتكرار والعرض كلها مستقرة.';
  }
  if (label.startsWith('Narrow the beta until')) {
    return 'ضيّق التجربة إلى أن تصبح الرحلات الأسبوعية، التكرار، ثبات العرض، وثبات ثلاثة أسابيع أقوى.';
  }
  return label;
}

function corridorNextAction(label: string, ar: boolean) {
  if (!ar) return label;
  if (label === 'Open the next corridor only after the same three-week gate passes.') {
    return 'افتح المسار التالي فقط بعد اجتياز نفس بوابة الثلاثة أسابيع.';
  }
  if (label === 'Run one route, one pickup node, and one rider segment until demand concentrates.') {
    return 'شغّل مساراً واحداً، نقطة ركوب واحدة، وشريحة ركاب واحدة إلى أن يتركز الطلب.';
  }
  if (label === 'Open controlled expansion with the same trust and supply gates.') {
    return 'افتح توسعاً مضبوطاً بنفس بوابات الثقة والعرض.';
  }
  return label;
}

export function CorridorBetaFocusSection({ ar, plan, onNavigate }: CorridorBetaFocusSectionProps) {
  const lead = plan.focusCorridors[0];

  return (
    <motion.section initial={false} style={{ marginTop: 38 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: C.cyanDim,
              border: `1px solid ${C.borderFaint}`,
              color: C.cyan,
              fontSize: '0.72rem',
              fontWeight: TYPE.weight.black,
              flexShrink: 0,
            }}
          >
            <Target size={15} />
          </span>
          <div>
            <h2
              style={{
                fontWeight: TYPE.weight.black,
                color: C.text,
                fontSize: '1.12rem',
                letterSpacing: 0,
                margin: 0,
              }}
            >
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
          onClick={() => onNavigate(lead?.path ?? '/find-ride', 'corridor_beta_focus')}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: R.full,
            background: C.cyanDim,
            border: `1px solid ${C.cyan}`,
            cursor: 'pointer',
            color: C.text,
            fontSize: TYPE.size.sm,
            fontWeight: TYPE.weight.semibold,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {ar ? 'ابدأ المسار' : 'Start focus'}
          <ArrowRight size={12} color={C.cyan} />
        </button>
      </div>

      <div
        className="wasel-home-corridor-beta-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}
      >
        {plan.focusCorridors.map(corridor => {
          const accent = stageColor(corridor.stage);
          return (
            <button
              type="button"
              key={corridor.routeId}
              onClick={() => onNavigate(corridor.path, 'corridor_beta_card')}
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
