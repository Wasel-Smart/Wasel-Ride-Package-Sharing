import { AlertTriangle, Eye, Fingerprint, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

const controls = [
  {
    icon: Lock,
    title: 'Encrypted transport and storage',
    detail:
      'Wasel uses TLS in transit and encrypted handling for sensitive account, wallet, and verification records.',
    accent: C.cyan,
  },
  {
    icon: Fingerprint,
    title: 'Identity and trust gates',
    detail:
      'Sensitive flows are gated by identity, email, phone, driver document, and wallet-standing checks.',
    accent: C.green,
  },
  {
    icon: KeyRound,
    title: 'Two-factor protection',
    detail:
      'Users can enable authenticator-based two-factor authentication and keep backup codes for account recovery.',
    accent: C.gold,
  },
  {
    icon: Eye,
    title: 'Monitoring and audit trail',
    detail:
      'Runtime monitoring, web-vital telemetry, and domain-event breadcrumbs help detect regressions and risky states.',
    accent: C.blueLight,
  },
] as const;

const incidentSteps = [
  'Freeze sensitive account changes when suspicious activity is detected.',
  'Use support escalation for payment, trip, package, or account-access issues.',
  'Preserve relevant trip, wallet, and support context for review.',
  'Restore access only after the user completes the required verification step.',
] as const;

function SecurityControlCard({ item }: { item: (typeof controls)[number] }) {
  const Icon = item.icon;

  return (
    <div
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
          gap: SPACE[3],
          marginBottom: SPACE[3],
        }}
      >
        <span
          style={{
            width: 42,
            height: 42,
            display: 'grid',
            placeItems: 'center',
            borderRadius: R.lg,
            color: item.accent,
            background: `${item.accent}16`,
            border: `1px solid ${item.accent}28`,
          }}
        >
          <Icon size={18} />
        </span>
        <div style={{ color: C.text, fontWeight: TYPE.weight.black }}>{item.title}</div>
      </div>
      <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
        {item.detail}
      </div>
    </div>
  );
}

export function SecurityPage() {
  const { dir } = useLanguage();
  const nav = useIframeSafeNavigate();

  return (
    <PageShell maxWidth={1120} dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow="Security"
          icon={<ShieldCheck size={18} />}
          title="Security built around trusted movement"
          description="Wasel protects accounts, route coordination, payments, and package handoffs with layered controls users can understand before they commit."
          accent={C.green}
          actions={
            <>
              <WaselButton
                type="button"
                variant="primary"
                onClick={() => nav('/app/settings?section=security')}
              >
                Manage account security
              </WaselButton>
              <WaselButton
                type="button"
                variant="outline"
                onClick={() => nav('/app/trust')}
                style={{ background: C.elevated, color: C.text }}
              >
                Open trust center
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <WaselLogo size={42} theme="light" variant="full" />
              <StatusBadge label="Account, trip, wallet, and support controls" accent={C.green} />
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                Security is not hidden in policy copy. It appears in verification gates, wallet
                standing, support escalation, and consent-based performance monitoring.
              </div>
            </div>
          }
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: SPACE[6],
          }}
        >
          <MetricCard
            label="Account protection"
            value="2FA"
            detail="Authenticator setup and backup codes are available in settings."
            accent={C.green}
            icon={<KeyRound size={18} />}
          />
          <MetricCard
            label="Trust workflow"
            value="5 gates"
            detail="Identity, email, phone, documents, and wallet standing."
            accent={C.cyan}
            icon={<Fingerprint size={18} />}
          />
          <MetricCard
            label="Data protection"
            value="TLS + AES"
            detail="Transport security and encrypted sensitive storage."
            accent={C.gold}
            icon={<Lock size={18} />}
          />
          <MetricCard
            label="Issue path"
            value="Support"
            detail="Escalation keeps context attached to trips and packages."
            accent={C.blueLight}
            icon={<AlertTriangle size={18} />}
          />
        </div>

        <SectionCard
          title="Security Controls"
          subtitle="The controls below are the visible parts of Wasel's security model."
          icon={<ShieldCheck size={18} color={C.green} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {controls.map(item => (
              <SecurityControlCard key={item.title} item={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Incident And Support Flow"
          subtitle="A clear security page needs a clear escalation model."
          icon={<AlertTriangle size={18} color={C.gold} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {incidentSteps.map((step, index) => (
              <div
                key={step}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'center',
                  borderRadius: R.xl,
                  border: `1px solid ${C.borderFaint}`,
                  background: C.elevated,
                  padding: `${SPACE[3]} ${SPACE[4]}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: R.lg,
                    display: 'grid',
                    placeItems: 'center',
                    color: C.green,
                    background: `${C.green}14`,
                    border: `1px solid ${C.green}24`,
                    fontWeight: TYPE.weight.black,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ color: C.text, fontSize: TYPE.size.sm, lineHeight: 1.65 }}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default SecurityPage;
