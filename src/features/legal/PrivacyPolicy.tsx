import { Eye, FileText, Lock, Mail, Phone, Shield } from 'lucide-react';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

function policyCardStyle(accent: string) {
  return {
    borderRadius: R.xxl,
    border: `1px solid ${accent}24`,
    background: `radial-gradient(circle at top left, ${accent}12, transparent 34%), linear-gradient(145deg, rgba(16,37,58,0.92) 0%, rgba(11,29,45,0.94) 100%)`,
    boxShadow: SH.md,
    padding: SPACE[5],
  } as const;
}

export function PrivacyPolicy() {
  const { language, dir } = useLanguage();

  const content = {
    ar: {
      title: 'سياسة الخصوصية',
      subtitle: 'آخر تحديث: 16 مارس 2026',
      intro:
        'في واصل، نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك.',

      sections: [
        {
          icon: FileText,
          title: '1. المعلومات التي نجمعها',
          content: [
            'معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف',
            'بيانات التحقق: رقم البطاقة الوطنية (سند) للتحقق الحكومي',
            'بيانات الموقع: لمطابقة الرحلات والتتبع المباشر',
            'معلومات الدفع: تفاصيل الدفع (مشفرة)',
            'بيانات الاستخدام: سجل الرحلات، التفضيلات، التقييمات',
          ],
        },
        {
          icon: Lock,
          title: '2. كيف نستخدم معلوماتك',
          content: [
            'توفير خدمات مشاركة الرحلات وتوصيل الطرود',
            'التحقق من هوية المستخدمين (سند eKYC)',
            'معالجة المدفوعات والحجوزات',
            'تحسين الأمان ومنع الاحتيال',
            'إرسال إشعارات الرحلات والتحديثات',
            'تخصيص تجربتك (أوقات الصلاة، تفضيلات الجنس)',
          ],
        },
        {
          icon: Shield,
          title: '3. حماية البيانات',
          content: [
            'تشفير SSL/TLS لجميع عمليات نقل البيانات',
            'تخزين البيانات الحساسة بتشفير AES-256',
            'مصادقة ثنائية لحسابات السائقين',
            'عمليات تدقيق أمنية منتظمة',
            'الوصول المحدود إلى البيانات الشخصية',
            'نسخ احتياطي آمن ومشفر',
          ],
        },
        {
          icon: Eye,
          title: '4. مشاركة البيانات',
          content: [
            'مع السائقين/الركاب: الاسم والصورة والتقييم فقط',
            'مع معالجات الدفع: تفاصيل الدفع المشفرة',
            'مع السلطات: عند الطلب القانوني فقط',
            'لا نبيع بياناتك أبداً لأطراف ثالثة',
            'لا نشارك البيانات للإعلانات',
          ],
        },
        {
          icon: FileText,
          title: '5. حقوقك',
          content: [
            'الوصول: طلب نسخة من بياناتك',
            'التصحيح: تحديث المعلومات غير الصحيحة',
            'الحذف: حذف حسابك وبياناتك',
            'النقل: تصدير بياناتك بصيغة قابلة للقراءة',
            'الاعتراض: رفض معالجة بيانات معينة',
            'السحب: إلغاء الموافقة في أي وقت',
          ],
        },
      ],

      contact: {
        title: 'اتصل بنا',
        subtitle: 'لأسئلة الخصوصية أو طلبات البيانات:',
        email: 'privacy@wasel.jo',
        phone: '+962 79 000 0000',
        address: 'عمان، الأردن',
      },

      compliance: {
        title: 'الامتثال القانوني',
        items: [
          'متوافق مع اللائحة العامة لحماية البيانات (GDPR)',
          'يتبع قوانين حماية البيانات الأردنية',
          'معتمد من هيئة تنظيم قطاع الاتصالات (TRC)',
          'تحديثات منتظمة للسياسة',
        ],
      },
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'Last Updated: March 16, 2026',
      intro:
        'At Wasel, we respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and protect your information.',

      sections: [
        {
          icon: FileText,
          title: '1. Information We Collect',
          content: [
            'Account Information: Name, email, phone number',
            'Verification Data: National ID (Sanad) for government verification',
            'Location Data: For ride matching and live tracking',
            'Payment Information: Payment details (encrypted)',
            'Usage Data: Trip history, preferences, ratings',
          ],
        },
        {
          icon: Lock,
          title: '2. How We Use Your Information',
          content: [
            'Provide carpooling and package delivery services',
            'Verify user identities (Sanad eKYC)',
            'Process payments and bookings',
            'Improve security and prevent fraud',
            'Send trip notifications and updates',
            'Personalize your experience (prayer times, gender preferences)',
          ],
        },
        {
          icon: Shield,
          title: '3. Data Protection',
          content: [
            'SSL/TLS encryption for all data transmission',
            'AES-256 encryption for sensitive data storage',
            'Two-factor authentication for driver accounts',
            'Regular security audits',
            'Limited access to personal data',
            'Secure encrypted backups',
          ],
        },
        {
          icon: Eye,
          title: '4. Data Sharing',
          content: [
            'With drivers/passengers: Name, photo, rating only',
            'With payment processors: Encrypted payment details',
            'With authorities: Legal requests only',
            'We never sell your data to third parties',
            'No data sharing for advertising',
          ],
        },
        {
          icon: FileText,
          title: '5. Your Rights',
          content: [
            'Access: Request a copy of your data',
            'Rectification: Update incorrect information',
            'Erasure: Delete your account and data',
            'Portability: Export your data in readable format',
            'Object: Refuse certain data processing',
            'Withdraw: Cancel consent at any time',
          ],
        },
      ],

      contact: {
        title: 'Contact Us',
        subtitle: 'For privacy questions or data requests:',
        email: 'privacy@wasel.jo',
        phone: '+962 79 000 0000',
        address: 'Amman, Jordan',
      },

      compliance: {
        title: 'Legal Compliance',
        items: [
          'GDPR Compliant',
          'Follows Jordanian Data Protection Laws',
          'TRC (Telecommunications Regulatory Commission) Certified',
          'Regular policy updates',
        ],
      },
    },
  };

  const t = content[language as 'ar' | 'en'];

  return (
    <PageShell maxWidth={1120} dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow="Legal"
          icon={<Shield size={18} />}
          title={t.title}
          description={t.intro}
          accent={C.cyan}
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <StatusBadge label={t.subtitle} accent={C.cyan} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: SPACE[3],
                }}
              >
                {[
                  { label: 'Data groups', value: '5', accent: C.cyan },
                  { label: 'User rights', value: '6', accent: C.green },
                  { label: 'Ad resale', value: '0', accent: C.gold },
                  { label: 'Sensitive storage', value: 'AES-256', accent: '#60A5FA' },
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
                        color: '#FFFFFF',
                        fontSize: TYPE.size.lg,
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
                        letterSpacing: TYPE.letterSpacing.wide,
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: SPACE[6],
          }}
        >
          <MetricCard
            label="Data categories"
            value={t.sections.length}
            detail="Collected data is grouped into clear categories."
            accent={C.cyan}
            icon={<FileText size={18} />}
          />
          <MetricCard
            label="Security layer"
            value="TLS + AES"
            detail="Transport and sensitive storage stay encrypted."
            accent={C.green}
            icon={<Lock size={18} />}
          />
          <MetricCard
            label="Sharing rule"
            value="Need to know"
            detail="We limit what is shared and with whom."
            accent={C.gold}
            icon={<Eye size={18} />}
          />
          <MetricCard
            label="Your control"
            value="6 rights"
            detail="Access, correction, export, deletion, objection, withdrawal."
            accent="#60A5FA"
            icon={<Shield size={18} />}
          />
        </div>

        <SectionCard
          title="Policy Overview"
          subtitle="Short, scannable blocks make the privacy model easier to understand."
          icon={<Shield size={18} color={C.cyan} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {t.sections.map(section => {
              const Icon = section.icon;
              return (
                <div key={section.title} style={policyCardStyle(C.cyan)}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACE[3],
                      marginBottom: SPACE[4],
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: R.lg,
                        background: `${C.cyan}18`,
                        border: `1px solid ${C.cyan}28`,
                        color: C.cyan,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <div
                      style={{
                        color: '#FFFFFF',
                        fontSize: TYPE.size.base,
                        fontWeight: TYPE.weight.black,
                        lineHeight: TYPE.lineHeight.snug,
                      }}
                    >
                      {section.title}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {section.content.map(item => (
                      <div
                        key={item}
                        style={{
                          borderRadius: R.xl,
                          border: `1px solid ${C.borderFaint}`,
                          background: 'rgba(255,255,255,0.03)',
                          padding: `${SPACE[3]} ${SPACE[4]}`,
                          color: '#FFFFFF',
                          fontSize: TYPE.size.sm,
                          lineHeight: TYPE.lineHeight.relaxed,
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
            gap: 12,
          }}
        >
          <SectionCard
            title={t.contact.title}
            subtitle={t.contact.subtitle}
            icon={<Mail size={18} color={C.cyan} />}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <a
                href={`mailto:${t.contact.email}`}
                style={{
                  ...policyCardStyle(C.cyan),
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <Mail size={18} color={C.cyan} />
                  <div>
                    <div style={{ color: '#FFFFFF', fontWeight: TYPE.weight.black }}>
                      {t.contact.email}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: TYPE.size.sm }}>Email</div>
                  </div>
                </div>
              </a>
              <a
                href={`tel:${t.contact.phone.replace(/\s/g, '')}`}
                style={{
                  ...policyCardStyle(C.green),
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <Phone size={18} color={C.green} />
                  <div>
                    <div style={{ color: '#FFFFFF', fontWeight: TYPE.weight.black }}>
                      {t.contact.phone}
                    </div>
                    <div style={{ color: C.textMuted, fontSize: TYPE.size.sm }}>
                      {t.contact.address}
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </SectionCard>

          <SectionCard
            title={t.compliance.title}
            subtitle="Trust improves when legal expectations are easy to scan."
            icon={<Shield size={18} color={C.green} />}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {t.compliance.items.map(item => (
                <div key={item} style={policyCardStyle(C.green)}>
                  <div
                    style={{
                      color: '#FFFFFF',
                      fontSize: TYPE.size.sm,
                      lineHeight: TYPE.lineHeight.relaxed,
                    }}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
