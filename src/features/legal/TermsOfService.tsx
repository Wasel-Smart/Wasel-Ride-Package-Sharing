/**
 * Terms of Service Page - Wasel | واصل
 * Legal terms and conditions for platform usage
 */

import { useLanguage } from '../../contexts/LanguageContext';
import { FileText, AlertCircle, ShieldCheck, Users, DollarSign, Scale } from 'lucide-react';

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
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      dir={dir}
    >
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
              <Scale className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{t.title}</h1>
              <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">{t.intro}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Sections */}
        <div className="space-y-8 mb-12">
          {t.sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 shrink-0">
                  <section.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                  <ul className="space-y-2">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-blue-400 mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prohibited */}
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">{t.prohibited.title}</h2>
          </div>
          <ul className="space-y-2">
            {t.prohibited.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-red-200">
                <span className="text-red-400 mt-1.5">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Termination */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">{t.termination.title}</h2>
          <p className="text-slate-300 leading-relaxed">{t.termination.content}</p>
        </div>
      </div>
    </div>
  );
}
