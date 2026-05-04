import { AlertCircle, DollarSign, FileText, Scale, ShieldCheck, Users } from 'lucide-react';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

function termsCardStyle(accent: string) {
  return {
    borderRadius: R.xxl,
    border: `1px solid ${accent}24`,
    background: `radial-gradient(circle at top left, ${accent}12, transparent 34%), linear-gradient(145deg, rgba(16,37,58,0.92) 0%, rgba(11,29,45,0.94) 100%)`,
    boxShadow: SH.md,
    padding: SPACE[5],
  } as const;
}

export function TermsOfService() {
  const { language, dir } = useLanguage();

  const content = {
    ar: {
      title: 'شروط الخدمة',
      subtitle: 'آخر تحديث: 16 مارس 2026',
      intro:
        'بقبولك لهذه الشروط، تدخل في اتفاقية ملزمة قانوناً مع واصل. يُرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا.',

      sections: [
        {
          icon: Users,
          title: '1. الأهلية والحسابات',
          content: [
            'يجب أن يكون عمرك 18 عاماً على الأقل',
            'السائقون: رخصة قيادة سارية المفعول وتأمين',
            'التحقق الإلزامي عبر سند (رقم البطاقة الوطنية)',
            'حساب واحد لكل مستخدم',
            'معلومات دقيقة وحديثة مطلوبة',
            'يحق لنا تعليق الحسابات المخالفة',
          ],
        },
        {
          icon: FileText,
          title: '2. الخدمات المقدمة',
          content: [
            'مشاركة الرحلات بين المدن (نموذج BlaBlaCar)',
            'توصيل الطرود عبر المسافرين',
            'إرجاع المنتجات عبر راجع',
            'حاسبة تقاسم التكاليف',
            'ميزات ثقافية (أوقات الصلاة، تفضيلات الجنس، وضع رمضان)',
            'واصل منصة، وليست شركة نقل مباشرة',
          ],
        },
        {
          icon: DollarSign,
          title: '3. الدفع والعمولات',
          content: [
            'مشاركة الرحلات: عمولة 12٪ من سعر المقعد',
            'توصيل الطرود: عمولة 20٪ + تأمين اختياري (0.50 JOD)',
            'الدفع: نقداً عند الوصول أو رقمياً',
            'استرداد الأموال: خلال 24 ساعة من الإلغاء',
            'سياسة إلغاء صارمة للحجوزات المتأخرة',
            'رسوم معالجة 1 JOD للاستردادات',
          ],
        },
        {
          icon: ShieldCheck,
          title: '4. السلامة والسلوك',
          content: [
            'احترم جميع المستخدمين - ممنوع التحرش',
            'لا مخدرات، لا كحول، لا تدخين (ما لم يوافق الجميع)',
            'التزم بقوانين المرور',
            'أبلغ عن السلوك المشبوه فوراً',
            'وضع الطوارئ SOS متاح',
            'نحتفظ بالحق في حظر المستخدمين الخطرين',
          ],
        },
        {
          icon: AlertCircle,
          title: '5. المسؤولية والضمانات',
          content: [
            'واصل لا تتحمل مسؤولية الحوادث أو الإصابات',
            'السائقون مسؤولون عن تأمين سياراتهم',
            'التحقق من الطرود مسؤولية المستخدم',
            'نقدم المنصة "كما هي" دون ضمانات',
            'تأمين اختياري متاح للطرود',
            'استخدمها على مسؤوليتك الخاصة',
          ],
        },
        {
          icon: Scale,
          title: '6. حل النزاعات',
          content: [
            'تواصل مع الدعم أولاً: support@wasel.jo',
            'الوساطة الداخلية متاحة',
            'يحكم القانون الأردني',
            'الاختصاص القضائي: محاكم عمان، الأردن',
            'لا دعاوى جماعية',
            'فترة 30 يوماً للمطالبات',
          ],
        },
      ],

      prohibited: {
        title: 'محظور بشدة',
        items: [
          'نقل أشياء غير قانونية (مخدرات، أسلحة، سلع مسروقة)',
          'انتحال الشخصية أو هويات مزيفة',
          'استخدام تجاري للحسابات الشخصية',
          'كشط البيانات أو الهندسة العكسية',
          'التلاعب بالتقييمات أو المراجعات',
          'تجاوز ميزات الأمان',
        ],
      },

      termination: {
        title: 'إنهاء الحساب',
        content:
          'يحق لنا تعليق أو إنهاء حسابك في حالة: (1) انتهاك هذه الشروط، (2) نشاط احتيالي، (3) شكاوى متكررة، (4) طلب قانوني. يمكنك حذف حسابك في أي وقت من إعدادات الملف الشخصي.',
      },
    },
    en: {
      title: 'Terms of Service',
      subtitle: 'Last Updated: March 16, 2026',
      intro:
        'By accepting these terms, you enter into a legally binding agreement with Wasel. Please read these terms carefully before using our services.',

      sections: [
        {
          icon: Users,
          title: '1. Eligibility & Accounts',
          content: [
            'Must be 18+ years old',
            'Drivers: Valid license and insurance required',
            'Mandatory verification via Sanad (National ID)',
            'One account per user',
            'Accurate and up-to-date information required',
            'We reserve the right to suspend violating accounts',
          ],
        },
        {
          icon: FileText,
          title: '2. Services Provided',
          content: [
            'Intercity carpooling (BlaBlaCar model)',
            'Package delivery via travelers',
            'E-commerce returns via Raje3',
            'Cost-sharing calculator',
            'Cultural features (prayer times, gender preferences, Ramadan mode)',
            'Wasel is a platform, not a direct transport company',
          ],
        },
        {
          icon: DollarSign,
          title: '3. Payments & Commissions',
          content: [
            'Carpooling: 12% commission per seat price',
            'Package delivery: 20% commission + optional insurance (JOD 0.50)',
            'Payments: Cash on arrival or digital',
            'Refunds: Within 24h of cancellation',
            'Strict cancellation policy for late bookings',
            'JOD 1 processing fee for refunds',
          ],
        },
        {
          icon: ShieldCheck,
          title: '4. Safety & Conduct',
          content: [
            'Respect all users - no harassment',
            'No drugs, alcohol, or smoking (unless everyone agrees)',
            'Follow traffic laws',
            'Report suspicious behavior immediately',
            'SOS emergency mode available',
            'We reserve the right to ban dangerous users',
          ],
        },
        {
          icon: AlertCircle,
          title: '5. Liability & Warranties',
          content: [
            'Wasel is not liable for accidents or injuries',
            'Drivers responsible for vehicle insurance',
            'Package verification is user responsibility',
            'We provide the platform "as-is" without warranties',
            'Optional insurance available for packages',
            'Use at your own risk',
          ],
        },
        {
          icon: Scale,
          title: '6. Dispute Resolution',
          content: [
            'Contact support first: support@wasel.jo',
            'Internal mediation available',
            'Governed by Jordanian law',
            'Jurisdiction: Amman, Jordan courts',
            'No class action lawsuits',
            '30-day period for claims',
          ],
        },
      ],

      prohibited: {
        title: 'Strictly Prohibited',
        items: [
          'Transporting illegal items (drugs, weapons, stolen goods)',
          'Impersonation or fake identities',
          'Commercial use of personal accounts',
          'Data scraping or reverse engineering',
          'Manipulating ratings or reviews',
          'Bypassing security features',
        ],
      },

      termination: {
        title: 'Account Termination',
        content:
          'We reserve the right to suspend or terminate your account for: (1) violating these terms, (2) fraudulent activity, (3) repeated complaints, (4) legal request. You may delete your account anytime from profile settings.',
      },
    },
  };

  const t = content[language as 'ar' | 'en'];

  return (
    <PageShell maxWidth={1120} dir={dir === 'rtl' ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow="Legal"
          icon={<Scale size={18} />}
          title={t.title}
          description={t.intro}
          accent="#60A5FA"
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <StatusBadge label={t.subtitle} accent="#60A5FA" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: SPACE[3],
                }}
              >
                {[
                  { label: 'Minimum age', value: '18+', accent: '#60A5FA' },
                  { label: 'Seat fee', value: '12%', accent: C.green },
                  { label: 'Package fee', value: '20%', accent: C.gold },
                  { label: 'Claims window', value: '30 days', accent: C.error },
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
            label="Eligibility"
            value="18+"
            detail="Drivers also need a valid license, insurance, and verification."
            accent="#60A5FA"
            icon={<Users size={18} />}
          />
          <MetricCard
            label="Platform role"
            value="Marketplace"
            detail="Wasel coordinates movement; it is not a direct transport operator."
            accent={C.cyan}
            icon={<FileText size={18} />}
          />
          <MetricCard
            label="Payment logic"
            value="12% / 20%"
            detail="Commission varies by seats and package workflows."
            accent={C.gold}
            icon={<DollarSign size={18} />}
          />
          <MetricCard
            label="Dispute path"
            value="Support first"
            detail="Start with support, then mediation, then formal legal escalation."
            accent={C.error}
            icon={<AlertCircle size={18} />}
          />
        </div>

        <SectionCard
          title="Terms Overview"
          subtitle="Structured cards make the rules easier to scan and understand."
          icon={<Scale size={18} color="#60A5FA" />}
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
                <div key={section.title} style={termsCardStyle('#60A5FA')}>
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
                        background: 'rgba(96,165,250,0.18)',
                        border: '1px solid rgba(96,165,250,0.28)',
                        color: '#60A5FA',
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
            title={t.prohibited.title}
            subtitle="This list should be unmissable and easy to understand."
            icon={<AlertCircle size={18} color={C.error} />}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {t.prohibited.items.map(item => (
                <div key={item} style={termsCardStyle(C.error)}>
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

          <SectionCard
            title={t.termination.title}
            subtitle="Users should know exactly when account access can be paused or removed."
            icon={<ShieldCheck size={18} color={C.gold} />}
          >
            <div style={termsCardStyle(C.gold)}>
              <div
                style={{
                  color: '#FFFFFF',
                  fontSize: TYPE.size.base,
                  lineHeight: TYPE.lineHeight.relaxed,
                }}
              >
                {t.termination.content}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
