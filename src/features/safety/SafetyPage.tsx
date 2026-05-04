import { Headphones, Shield, ShieldCheck, Siren, Umbrella } from 'lucide-react';
import {
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  r,
  SectionHead,
} from '../../pages/waselServiceShared';

const SAFETY_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Verified identity',
    desc: 'Identity is checked before sensitive actions unlock.',
    color: DS.cyan,
  },
  {
    icon: Siren,
    title: 'Emergency support',
    desc: 'SOS and emergency help stay close during trips.',
    color: '#EF4444',
  },
  {
    icon: Umbrella,
    title: 'Trip protection',
    desc: 'Trip records help resolve problems fast.',
    color: DS.gold,
  },
  {
    icon: Shield,
    title: 'Comfort settings',
    desc: 'Comfort settings keep riders in control.',
    color: DS.green,
  },
];

export default function SafetyPage() {
  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Safe"
          title="Safety Center"
          titleAr="مركز الأمان"
          sub="See your core protections."
          color={DS.green}
        />

        <CoreExperienceBanner
          title="Safety should be easy to see."
          detail="Wasel brings identity checks, emergency support, trip protection, and comfort settings into one calm surface so trust is clear before you book."
          tone={DS.green}
        />

        <div
          className="sp-4col"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            {
              label: 'Verified accounts',
              value: 'Required',
              detail: 'Needed for trusted actions',
              color: DS.green,
            },
            {
              label: 'Emergency help',
              value: 'Live',
              detail: 'SOS and trip support',
              color: '#EF4444',
            },
            {
              label: 'Coverage',
              value: 'Included',
              detail: 'Trip records included',
              color: DS.gold,
            },
            {
              label: 'Comfort tools',
              value: 'Active',
              detail: 'Clear preferences',
              color: DS.cyan,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                borderRadius: r(18),
                border: `1px solid ${DS.border}`,
                padding: '18px 18px 16px',
              }}
            >
              <div
                style={{ color: item.color, fontWeight: 900, fontSize: '1.16rem', marginBottom: 4 }}
              >
                {item.value}
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>
                {item.label}
              </div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.45, marginTop: 4 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14, marginBottom: 18 }}
        >
          <div
            style={{
              background: DS.card,
              borderRadius: r(20),
              padding: '22px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>
              What riders see first
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                'Trust signals should show before payment.',
                'Safe trips have a clear driver and handoff.',
                'Safety text should stay calm and direct.',
              ].map(line => (
                <div
                  key={line}
                  style={{
                    background: DS.card2,
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: DS.card,
              borderRadius: r(20),
              padding: '22px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Headphones size={18} color={DS.cyan} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Support</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Identity checks', value: 'Sensitive actions stay protected' },
                { label: 'During-trip help', value: 'Emergency help stays close' },
                { label: 'After-trip proof', value: 'Tickets and events stay visible' },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    background: DS.card2,
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>
                    {item.label}
                  </div>
                  <div
                    style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55, marginTop: 4 }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          {SAFETY_FEATURES.map(feature => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                style={{
                  background: DS.card,
                  borderRadius: r(20),
                  padding: '22px',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: r(14),
                    background: `${feature.color}14`,
                    border: `1px solid ${feature.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Icon size={22} color={feature.color} />
                </div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>
                  {feature.title}
                </div>
                <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
                  {feature.desc}
                </div>
              </div>
            );
          })}
        </div>
      </PageShell>
    </Protected>
  );
}
