import { AlertTriangle, Eye, FileCheck, Fingerprint, Globe2, KeyRound, Lock, MapPinned, Server, ShieldCheck, Smartphone, Shield, Wallet, Mail } from 'lucide-react';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

const controls = [
  {
    icon: Lock,
    title: 'Encrypted transport and storage',
    titleAr: 'تشفير النقل والتخزين',
    detail: 'TLS 1.2+ for all data in transit and AES-256 encryption for sensitive account, wallet, and verification records at rest.',
    detailAr: 'TLS 1.2+ لجميع البيانات أثناء النقل وتشفير AES-256 للسجلات الحساسة للحساب والمحفظة والتوثيق.',
    accent: C.cyan,
  },
  {
    icon: Fingerprint,
    title: 'Identity and trust gates',
    titleAr: 'بوابات الهوية والثقة',
    detail: 'Sensitive flows are gated by identity verification, email confirmation, phone verification, driver documents, and wallet-standing checks.',
    detailAr: 'المسارات الحساسة محمية بفحوصات توثيق الهوية وتأكيد البريد والهاتف ووثائق السائق وحالة المحفظة.',
    accent: C.green,
  },
  {
    icon: KeyRound,
    title: 'Two-factor protection',
    titleAr: 'حماية التحقق الثنائي',
    detail: 'Users can enable authenticator-based two-factor authentication with backup codes for account recovery.',
    detailAr: 'المستخدم بقدر يفعّل التحقق الثنائي عبر تطبيق المصادقة مع أكواد احتياطية لاسترجاع الحساب.',
    accent: C.gold,
  },
  {
    icon: Shield,
    title: 'Application security',
    titleAr: 'أمان التطبيق',
    detail: 'Content Security Policy, HSTS, permissions policy, and rate limiting on all public write routes. Role-based access controls at the backend boundary.',
    detailAr: 'سياسة أمان المحتوى وHSTS وسياسة الأذونات وتحديد المعدل على جميع مسارات الكتابة العامة. ضوابط وصول قائمة على الأدوار.',
    accent: C.blueLight,
  },
] as const;

const complianceItems = [
  {
    icon: ShieldCheck,
    title: 'GDPR',
    titleAr: 'الائحة العامة لحماية البيانات',
    detail: 'Data minimization, purpose limitation, and user rights including access, rectification, erasure, and portability.',
    detailAr: 'تقليل البيانات وتحديد الغرض وحقوق المستخدم بما في ذلك الوصول والتصحيح والحذف والنقل.',
    accent: C.green,
  },
  {
    icon: ShieldCheck,
    title: 'Jordanian Data Protection',
    titleAr: 'قوانين حماية البيانات الأردنية',
    detail: 'Compliance with local data protection regulations for data collection, processing, and cross-border transfer.',
    detailAr: 'الامتثال للوائح حماية البيانات المحلية لجمع البيانات ومعالجتها والنقل عبر الحدود.',
    accent: C.cyan,
  },
  {
    icon: ShieldCheck,
    title: 'TRC Certified',
    titleAr: 'معتمد من هيئة تنظيم قطاع الاتصالات',
    detail: 'Certified by the Telecommunications Regulatory Commission for mobility and communication services.',
    detailAr: 'معتمد من هيئة تنظيم قطاع الاتصالات لخدمات التنقل والاتصالات.',
    accent: C.gold,
  },
] as const;

const trustSteps = [
  {
    icon: Shield,
    title: 'Identity / Sanad',
    titleAr: 'الهوية / سند',
    detail: 'Government-verified identity via Sanad eKYC for account creation and high-value actions.',
    detailAr: 'توثيق هوية حكومي عبر سند eKYC لإنشاء الحساب والإجراءات عالية القيمة.',
    accent: C.cyan,
  },
  {
    icon: Mail,
    title: 'Email confirmation',
    titleAr: 'تأكيد البريد',
    detail: 'Email verification ensures account ownership and enables secure notifications and recovery.',
    detailAr: 'تأكيد البريد يضمن ملكية الحساب ويمكن الإشعارات الآمنة والاسترجاع.',
    accent: C.green,
  },
  {
    icon: Smartphone,
    title: 'Phone verification',
    titleAr: 'تأكيد الهاتف',
    detail: 'Phone number verification via OTP adds a second layer of account security.',
    detailAr: 'تأكيد رقم الهاتف عبر OTP يضيف طبقة أمان ثانية للحساب.',
    accent: C.gold,
  },
  {
    icon: FileCheck,
    title: 'Driver documents',
    titleAr: 'وثائق السائق',
    detail: 'License and compliance document review for driver mode activation and package carriage.',
    detailAr: 'مراجعة الرخصة ووثائق الامتثال لتفعيل وضع السائق وحمل الطرود.',
    accent: C.blueLight,
  },
  {
    icon: Wallet,
    title: 'Wallet standing',
    titleAr: 'سلامة المحفظة',
    detail: 'Wallet health checks keep payouts, payments, and sensitive operations available.',
    detailAr: 'فحوصات سلامة المحفظة تبقي الدفعات والمدفوعات والعمليات الحساسة متاحة.',
    accent: C.green,
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

export function TrustCenterPage() {
  const { language, dir } = useLanguage();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  return (
    <PageShell maxWidth={1120} dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={ar ? 'مركز الثقة' : 'Trust Center'}
          icon={<ShieldCheck size={18} />}
          title={ar ? 'الأمان والامتثال والشفافية' : 'Security, compliance, and transparency'}
          description={
            ar
              ? 'واصل يبني الثقة عبر طبوات تحقق واضحة، تشفير قوي، امتثال قانوني، ومراقبة مستمرة.'
              : 'Wasel builds trust through clear verification layers, strong encryption, legal compliance, and continuous monitoring.'
          }
          accent={C.green}
          actions={
            <>
              <WaselButton type="button" variant="primary" onClick={() => nav('/app/security')}>
                {ar ? 'إدارة أمان الحساب' : 'Manage account security'}
              </WaselButton>
              <WaselButton
                type="button"
                variant="outline"
                onClick={() => nav('/app/support')}
                style={{ background: C.elevated, color: C.text }}
              >
                {ar ? 'تواصل مع الدعم' : 'Contact support'}
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <StatusBadge
                label={ar ? 'منصة تنقل موثوقة' : 'Trusted mobility platform'}
                accent={C.green}
              />
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                {ar
                  ? 'كل طبقة أمان مصممة لحماية الحسابات والرحلات والطرود والمدفوعات.'
                  : 'Every security layer is designed to protect accounts, rides, parcels, and payments.'}
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
            label={ar ? 'فحوصات الثقة' : 'Trust checks'}
            value="5"
            detail={ar ? 'هوية، بريد، هاتف، وثائق، محفظة' : 'Identity, email, phone, documents, wallet'}
            accent={C.cyan}
            icon={<Fingerprint size={18} />}
          />
          <MetricCard
            label={ar ? 'طبقة الأمان' : 'Security layer'}
            value="TLS + AES"
            detail={ar ? 'النقل والتخزين الحساس مشفرّين' : 'Transport and sensitive storage encrypted'}
            accent={C.green}
            icon={<Lock size={18} />}
          />
          <MetricCard
            label={ar ? 'الامتثال' : 'Compliance'}
            value="GDPR + TRC"
            detail={ar ? 'قوانين محلية ودولية' : 'Local and international regulations'}
            accent={C.gold}
            icon={<ShieldCheck size={18} />}
          />
          <MetricCard
            label={ar ? 'مسار المشكلة' : 'Issue path'}
            value={ar ? 'الدعم' : 'Support'}
            detail={ar ? 'تصعيد مرتبط بالرحلات والطرود' : 'Escalation tied to trips and packages'}
            accent={C.blueLight}
            icon={<AlertTriangle size={18} />}
          />
        </div>

        <SectionCard
          title={ar ? 'ضوابط الأمان' : 'Security Controls'}
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
            {controls.map(item => {
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
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={ar ? 'الامتثال القانوني' : 'Legal Compliance'}
          subtitle={
            ar
              ? 'الثقة بتزيد لما تكون المتطلبات القانونية سهلة القراءة.'
              : 'Trust improves when legal expectations are easy to scan.'
          }
          icon={<ShieldCheck size={18} color={C.cyan} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {complianceItems.map(item => {
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
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={ar ? 'مسار الثقة' : 'Trust workflow'}
          subtitle={
            ar
              ? '٥ بوابات تحقق واضحة تفتح القدرات بالتدريج.'
              : '5 clear verification gates unlock capabilities progressively.'
          }
          icon={<Fingerprint size={18} color={C.cyan} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {trustSteps.map(step => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
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
                        color: step.accent,
                        background: `${step.accent}16`,
                        border: `1px solid ${step.accent}28`,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <div style={{ color: C.text, fontWeight: TYPE.weight.black, fontSize: TYPE.size.sm }}>
                      {ar ? step.titleAr : step.title}
                    </div>
                  </div>
                  <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                    {ar ? step.detailAr : step.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={ar ? 'تدفّق الحوادث والدعم' : 'Incident and support flow'}
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

        <SectionCard
          title={ar ? 'الإبلاغ عن الثغرات' : 'Vulnerability disclosure'}
          subtitle={
            ar
              ? 'نرحب بالباحثين الأمنيين الذين يبلغون عن الثغرات بمسؤولية.'
              : 'We welcome security researchers who report vulnerabilities responsibly.'
          }
          icon={<Eye size={18} color={C.blueLight} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
              gap: 12,
            }}
          >
            <div
              style={{
                borderRadius: R.xxl,
                border: `1px solid ${C.border}`,
                background: C.card,
                boxShadow: SH.md,
                padding: SPACE[5],
                display: 'grid',
                gap: SPACE[3],
              }}
            >
              <div style={{ color: C.text, fontWeight: TYPE.weight.black, fontSize: TYPE.size.base }}>
                {ar ? 'كيف تبلغ عن ثغرة' : 'How to report a vulnerability'}
              </div>
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                {ar
                  ? 'أرسل تفاصيل الثغرة إلى فريق الأمان لدينا. نرد خلال 72 ساعة ونعمل معك على جدول زمني معقول للإصلاح.'
                  : 'Send vulnerability details to our security team. We respond within 72 hours and work with you on a reasonable fix timeline.'}
              </div>
              <WaselButton
                type="button"
                variant="primary"
                onClick={() => nav('/app/support')}
                style={{ alignSelf: 'flex-start' }}
              >
                {ar ? 'افتح الدعم' : 'Open support'}
              </WaselButton>
            </div>
            <div
              style={{
                borderRadius: R.xxl,
                border: `1px solid ${C.border}`,
                background: C.card,
                boxShadow: SH.md,
                padding: SPACE[5],
                display: 'grid',
                gap: SPACE[3],
              }}
            >
              <div style={{ color: C.text, fontWeight: TYPE.weight.black, fontSize: TYPE.size.base }}>
                {ar ? 'قواعد المسؤولية' : 'Responsible disclosure rules'}
              </div>
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: 1.7 }}>
                {ar
                  ? 'لا تكنفذ هجمات حجب الخدمة أو تعدل بيانات مستخدمين آخرين. ركز على إثبات المشكلة بأقل تأثير ممكن.'
                  : 'Do not run denial-of-service attacks or modify other user data. Focus on proving the issue with minimal impact.'}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
