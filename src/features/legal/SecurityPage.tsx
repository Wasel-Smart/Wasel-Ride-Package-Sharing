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
    titleAr: 'تشفير النقل والتخزين',
    detail:
      'Wasel uses TLS in transit and encrypted handling for sensitive account, wallet, and verification records.',
    detailAr: 'واصل يستخدم TLS أثناء النقل وتعامل مشفّر مع سجلات الحساب والمحفظة والتوثيق الحساسة.',
    accent: C.cyan,
  },
  {
    icon: Fingerprint,
    title: 'Identity and trust gates',
    titleAr: 'بوابات الهوية والثقة',
    detail:
      'Sensitive flows are gated by identity, email, phone, driver document, and wallet-standing checks.',
    detailAr: 'المسارات الحساسة محمية بفحوصات الهوية والبريد والهاتف ووثائق السائق وحالة المحفظة.',
    accent: C.green,
  },
  {
    icon: KeyRound,
    title: 'Two-factor protection',
    titleAr: 'حماية التحقق الثنائي',
    detail:
      'Users can enable authenticator-based two-factor authentication and keep backup codes for account recovery.',
    detailAr:
      'المستخدم بقدر يفعّل التحقق الثنائي عبر تطبيق المصادقة ويحفظ أكواد احتياطية لاسترجاع الحساب.',
    accent: C.gold,
  },
  {
    icon: Eye,
    title: 'Monitoring and audit trail',
    titleAr: 'المراقبة وسجل التدقيق',
    detail:
      'Runtime monitoring, web-vital telemetry, and domain-event breadcrumbs help detect regressions and risky states.',
    detailAr:
      'مراقبة التشغيل وقياسات الأداء وسجل أحداث النطاق تساعدنا نكشف التراجع والحالات الخطرة.',
    accent: C.blueLight,
  },
] as const;

const incidentSteps = [
  'Freeze sensitive account changes when suspicious activity is detected.',
  'Use support escalation for payment, trip, package, or account-access issues.',
  'Preserve relevant trip, wallet, and support context for review.',
  'Restore access only after the user completes the required verification step.',
] as const;

const incidentStepsAr = [
  'نجمّد تغييرات الحساب الحساسة عند رصد نشاط مشبوه.',
  'نستخدم تصعيد الدعم لمشاكل الدفع أو الرحلات أو الطرود أو دخول الحساب.',
  'نحفظ سياق الرحلة والمحفظة والدعم اللازم للمراجعة.',
  'نرجّع الوصول فقط بعد ما يكمل المستخدم خطوة التحقق المطلوبة.',
] as const;

function SecurityControlCard({ item, ar }: { item: (typeof controls)[number]; ar: boolean }) {
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
        <div style={{ color: C.text, fontWeight: TYPE.weight.black }}>
          {ar ? item.titleAr : item.title}
        </div>
      </div>
      <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
        {ar ? item.detailAr : item.detail}
      </div>
    </div>
  );
}

export function SecurityPage() {
  const { language, dir, t } = useLanguage();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  return (
    <PageShell maxWidth={1120} dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={ar ? 'الأمان' : 'Security'}
          icon={<ShieldCheck size={18} />}
          title={t('securityPage.security_built_around_trusted_movement')}
          description={
            ar
              ? 'واصل بحمي الحسابات، تنسيق المسارات، الدفع، وتسليم الطرود بطبقات واضحة يفهمها المستخدم قبل ما يلتزم.'
              : 'Wasel protects accounts, route coordination, payments, and package handoffs with layered controls users can understand before they commit.'
          }
          accent={C.green}
          actions={
            <>
              <WaselButton
                type="button"
                variant="primary"
                onClick={() => nav('/app/settings?section=security')}
              >
                {ar ? 'إدارة أمان الحساب' : 'Manage account security'}
              </WaselButton>
              <WaselButton
                type="button"
                variant="outline"
                onClick={() => nav('/app/trust')}
                style={{ background: C.elevated, color: C.text }}
              >
                {ar ? 'افتح مركز الثقة' : 'Open trust center'}
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <WaselLogo size={64} theme="light" variant="full" />
              <StatusBadge
                label={
                  ar
                    ? 'ضوابط الحساب والرحلة والمحفظة والدعم'
                    : 'Account, trip, wallet, and support controls'
                }
                accent={C.green}
              />
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                {ar
                  ? 'الأمان مش مخبّى داخل نصوص السياسات. بظهر في بوابات التوثيق، حالة المحفظة، تصعيد الدعم، ومراقبة الأداء المبنية على الموافقة.'
                  : 'Security is not hidden in policy copy. It appears in verification gates, wallet standing, support escalation, and consent-based performance monitoring.'}
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
            label={ar ? 'حماية الحساب' : 'Account protection'}
            value="2FA"
            detail={
              ar
                ? 'إعداد تطبيق المصادقة والأكواد الاحتياطية موجودين في الإعدادات.'
                : 'Authenticator setup and backup codes are available in settings.'
            }
            accent={C.green}
            icon={<KeyRound size={18} />}
          />
          <MetricCard
            label={ar ? 'مسار الثقة' : 'Trust workflow'}
            value={ar ? '٥ بوابات' : '5 gates'}
            detail={
              ar
                ? 'هوية، بريد، هاتف، وثائق، وحالة المحفظة.'
                : 'Identity, email, phone, documents, and wallet standing.'
            }
            accent={C.cyan}
            icon={<Fingerprint size={18} />}
          />
          <MetricCard
            label={ar ? 'حماية البيانات' : 'Data protection'}
            value="TLS + AES"
            detail={
              ar
                ? 'أمان النقل وتخزين حساس مشفّر.'
                : 'Transport security and encrypted sensitive storage.'
            }
            accent={C.gold}
            icon={<Lock size={18} />}
          />
          <MetricCard
            label={ar ? 'مسار المشكلة' : 'Issue path'}
            value={ar ? 'الدعم' : 'Support'}
            detail={
              ar
                ? 'التصعيد بخلي السياق مربوط بالرحلات والطرود.'
                : 'Escalation keeps context attached to trips and packages.'
            }
            accent={C.blueLight}
            icon={<AlertTriangle size={18} />}
          />
        </div>

        <SectionCard
          title={t('securityPage.security_controls')}
          subtitle={
            ar
              ? 'الضوابط بالأسفل هي الأجزاء الواضحة من نموذج أمان واصل.'
              : "The controls below are the visible parts of Wasel's security model."
          }
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
              <SecurityControlCard key={item.title} item={item} ar={ar} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t('securityPage.incident_and_support_flow')}
          subtitle={
            ar
              ? 'صفحة الأمان الواضحة لازم يكون معها نموذج تصعيد واضح.'
              : 'A clear security page needs a clear escalation model.'
          }
          icon={<AlertTriangle size={18} color={C.gold} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {(ar ? incidentStepsAr : incidentSteps).map((step, index) => (
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
