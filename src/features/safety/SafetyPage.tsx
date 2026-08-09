import { useState } from 'react';
import { Headphones, Phone, Shield, ShieldCheck, Siren, UserCheck } from 'lucide-react';
import {
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { C, R, SH, SPACE, TYPE, card, pillStyle } from '../../utils/wasel-ds';

export default function SafetyPage() {
  const { language, t } = useLanguage();
  const ar = language === 'ar';
  const [sosActive, setSosActive] = useState(false);

  const SAFETY_STACK = [
    {
      icon: UserCheck,
      title: t('safetyExpanded.verifiedIdentity'),
      detail: t('safetyExpanded.identityDetail'),
      stat: t('safetyExpanded.step'),
      accent: C.green,
    },
    {
      icon: Siren,
      title: t('safetyExpanded.emergencyHelp'),
      detail: t('safetyExpanded.emergencyDetail'),
      stat: t('safetyExpanded.seconds'),
      accent: C.error,
    },
    {
      icon: Shield,
      title: t('safetyExpanded.tripEvidence'),
      detail: t('safetyExpanded.evidenceDetail'),
      stat: t('safetyExpanded.percentage'),
      accent: C.gold,
    },
    {
      icon: Headphones,
      title: t('safetyExpanded.comfortControls'),
      detail: t('safetyExpanded.comfortDetail'),
      stat: t('safetyExpanded.rails'),
      accent: C.cyan,
    },
  ];

  const RESPONSE_FLOW = [
    {
      label: t('safetyExpanded.beforeBooking'),
      detail: t('safetyExpanded.beforeBookingDetail'),
      accent: C.green,
    },
    {
      label: t('safetyExpanded.duringTrip'),
      detail: t('safetyExpanded.duringTripDetail'),
      accent: C.cyan,
    },
    {
      label: t('safetyExpanded.afterTrip'),
      detail: t('safetyExpanded.afterTripDetail'),
      accent: C.gold,
    },
  ];

  return (
    <PageShell maxWidth={1120} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        {/* ── SOS Banner — always visible, no auth required ── */}
        <div
          style={{
            ...card({ padding: SPACE[4], radius: R.xxl }),
            borderColor: `${C.error}40`,
            background: sosActive ? `${C.error}22` : `${C.error}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACE[5],
            gap: SPACE[3],
            transition: 'background 0.3s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
            <Siren size={20} color={C.error} />
            <div>
              <div
                style={{ color: C.text, fontWeight: TYPE.weight.bold, fontSize: TYPE.size.base }}
              >
                {t('safetyExpanded.needHelpNow')}
              </div>
              <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, marginTop: 2 }}>
                {t('safetyExpanded.supportAvailable247')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSosActive(v => !v)}
              style={{
                ...pillStyle(C.error),
                border: 'none',
                cursor: 'pointer',
                background: sosActive ? C.error : `${C.error}20`,
                color: sosActive ? '#fff' : C.error,
                padding: '10px 18px',
                fontSize: '0.84rem',
                fontWeight: 800,
                transition: 'all 0.2s',
              }}
            >
              {sosActive ? t('safetyExpanded.sosSent') : t('safetyExpanded.sendSOS')}
            </button>
            <a
              href="/app/support?urgent=1"
              style={{
                ...pillStyle(C.error),
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                padding: '10px 18px',
              }}
            >
              {t('safetyExpanded.getHelpNow')}
            </a>
            <a
              href="tel:911"
              style={{
                ...pillStyle(C.gold),
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                padding: '10px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Phone size={14} />
              {t('safetyExpanded.callEmergency')}
            </a>
          </div>
        </div>

        <PageHero
          eyebrow={t('safetyExpanded.eyebrow')}
          icon={<ShieldCheck size={18} />}
          title={t('safetyExpanded.title')}
          description={t('safetyExpanded.description')}
          accent={C.green}
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <StatusBadge label={t('safetyExpanded.alwaysVisible')} accent={C.green} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: SPACE[3],
                }}
              >
                {[
                  { label: t('safetyExpanded.trustGates'), value: '4', accent: C.green },
                  { label: t('safetyExpanded.responsePath'), value: '1 tap', accent: C.cyan },
                  { label: t('safetyExpanded.tripProof'), value: 'Live', accent: C.gold },
                  { label: t('safetyExpanded.supportState'), value: 'Tracked', accent: C.error },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: R.xl,
                      border: `1px solid ${item.accent}24`,
                      background: `${item.accent}12`,
                      padding: `${SPACE[3]} ${SPACE[4]}`,
                    }}
                  >
                    <div
                      style={{
                        color: C.text,
                        fontSize: TYPE.size.xl,
                        fontWeight: TYPE.weight.ultra,
                        lineHeight: TYPE.lineHeight.tight,
                      }}
                    >
                      {item.value}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: C.textMuted,
                        fontSize: TYPE.size.xs,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        {/* ── Protection Stack ── */}
        <SectionCard
          title={t('safetyExpanded.protectionStackTitle')}
          subtitle={t('safetyExpanded.protectionStackSubtitle')}
          icon={<ShieldCheck size={18} color={C.green} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {SAFETY_STACK.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  style={{
                    borderRadius: R.xxl,
                    border: `1px solid ${item.accent}24`,
                    background: `radial-gradient(circle at top left, ${item.accent}12, transparent 34%), ${C.card}`,
                    boxShadow: SH.md,
                    padding: SPACE[5],
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: SPACE[3],
                      marginBottom: SPACE[4],
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 42,
                        height: 42,
                        borderRadius: R.lg,
                        background: `${item.accent}18`,
                        border: `1px solid ${item.accent}28`,
                        color: item.accent,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <span
                      style={{
                        color: item.accent,
                        fontSize: TYPE.size.sm,
                        fontWeight: TYPE.weight.black,
                      }}
                    >
                      {item.stat}
                    </span>
                  </div>
                  <div
                    style={{ color: C.text, fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      marginTop: SPACE[2],
                      color: C.textMuted,
                      fontSize: TYPE.size.sm,
                      lineHeight: TYPE.lineHeight.relaxed,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Emergency Flow — 3-step stepper ── */}
        <SectionCard
          title={t('safetyExpanded.emergencyFlowTitle')}
          subtitle={t('safetyExpanded.emergencyFlowSubtitle')}
          icon={<Siren size={18} color={C.error} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {RESPONSE_FLOW.map((step, index) => (
              <div
                key={step.label}
                style={{
                  borderRadius: R.xxl,
                  border: `1px solid ${step.accent}24`,
                  background: `radial-gradient(circle at top left, ${step.accent}12, transparent 34%), ${C.card}`,
                  boxShadow: SH.md,
                  padding: SPACE[5],
                }}
              >
                <div
                  style={{
                    color: step.accent,
                    fontSize: TYPE.size.xs,
                    fontWeight: TYPE.weight.bold,
                    textTransform: 'uppercase',
                    marginBottom: SPACE[3],
                  }}
                >
                  {`${t('safetyExpanded.step')} ${index + 1}`}
                </div>
                <div
                  style={{ color: C.text, fontSize: TYPE.size.base, fontWeight: TYPE.weight.black }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    marginTop: SPACE[2],
                    color: C.textMuted,
                    fontSize: TYPE.size.sm,
                    lineHeight: TYPE.lineHeight.relaxed,
                  }}
                >
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
