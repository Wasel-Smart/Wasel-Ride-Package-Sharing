import { Headphones, Shield, ShieldCheck, Siren, Umbrella } from 'lucide-react';
import { CoreExperienceBanner, DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';

const SAFETY_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Verified identity',
    desc: 'Driver identity, account checks, and trust rules are reviewed before higher-risk actions unlock.',
    color: DS.cyan,
  },
  {
    icon: Siren,
    title: 'Emergency support',
    desc: 'SOS shortcuts, live trip context, and emergency-contact sharing are ready during active trips.',
    color: '#EF4444',
  },
  {
    icon: Umbrella,
    title: 'Trip protection',
    desc: 'Coverage, handoff records, and support history make incidents easier to resolve with proof.',
    color: DS.gold,
  },
  {
    icon: Shield,
    title: 'Comfort settings',
    desc: 'Gender preferences, prayer-stop context, and calmer handoff choices help riders feel in control.',
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
          sub="See the protections that support every ride, package handoff, and scheduled trip."
          color={DS.green}
        />

        <CoreExperienceBanner
          title="Safety should be visible before a trip starts."
          detail="Wasel brings identity checks, emergency support, trip protection, and comfort settings into one calm surface so trust is clear before you book."
          tone={DS.green}
        />

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Verified accounts', value: 'Required', detail: 'Before higher-trust driver actions unlock', color: DS.green },
            { label: 'Emergency layer', value: 'Live', detail: 'Trip-aware support and SOS access', color: '#EF4444' },
            { label: 'Coverage', value: 'Included', detail: 'Protection and support records per trip', color: DS.gold },
            { label: 'Comfort tools', value: 'Active', detail: 'Preferences and handoff clarity built in', color: DS.cyan },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.16rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.45, marginTop: 4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14, marginBottom: 18 }}>
          <div style={{ background: DS.card, borderRadius: r(20), padding: '22px', border: `1px solid ${DS.border}` }}>
            <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>What riders should notice first</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                'Trust signals should be easy to scan before payment, not hidden after a trip starts.',
                'The safest route is the one with a clear driver, clear handoff, and clear support path.',
                'Safety language should stay calm, practical, and specific instead of sounding like policy filler.',
              ].map((line) => (
                <div key={line} style={{ background: DS.card2, borderRadius: r(14), border: `1px solid ${DS.border}`, padding: '12px 14px', color: '#fff', fontSize: '0.82rem', lineHeight: 1.6 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: DS.card, borderRadius: r(20), padding: '22px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Headphones size={18} color={DS.cyan} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Support standards</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Identity checks', value: 'Account and trust rules gate sensitive actions' },
                { label: 'During-trip help', value: 'Emergency access stays close to the active trip context' },
                { label: 'After-trip proof', value: 'Tickets, notifications, and handoff events support resolution' },
              ].map((item) => (
                <div key={item.label} style={{ background: DS.card2, borderRadius: r(14), border: `1px solid ${DS.border}`, padding: '12px 14px' }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>{item.label}</div>
                  <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55, marginTop: 4 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {SAFETY_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} style={{ background: DS.card, borderRadius: r(20), padding: '22px', border: `1px solid ${DS.border}` }}>
                <div style={{ width: 48, height: 48, borderRadius: r(14), background: `${feature.color}14`, border: `1px solid ${feature.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={22} color={feature.color} />
                </div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>{feature.title}</div>
                <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>{feature.desc}</div>
              </div>
            );
          })}
        </div>
      </PageShell>
    </Protected>
  );
}
